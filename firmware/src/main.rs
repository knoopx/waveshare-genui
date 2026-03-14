use std::collections::VecDeque;
use std::io::Cursor;
use std::ptr;
use std::time::{Duration, Instant};

use anyhow::{bail, Result};
use image_webp::WebPDecoder;

const MAGIC: &[u8; 4] = b"DWBP";
const CMD_MAGIC: &[u8; 4] = b"DCMD";
const HEADER_SIZE: usize = 12;
const RESP_OK: u8 = 0x01;
const RESP_ERR: u8 = 0xFF;

const CMD_OFF: u8 = 0x00;
const CMD_ON: u8 = 0x01;

const LCD_W: usize = 720;
const LCD_H: usize = 720;
const BPP: usize = 2;
const FB_SIZE: usize = LCD_W * LCD_H * BPP;
const ACTIVE_BRIGHTNESS: i32 = 100;
const SLEEP_TIMEOUT: Duration = Duration::from_secs(60);
const UART_POLL_TIMEOUT_MS: u32 = 250;
const HISTORY_LIMIT: usize = 10;

// Priority levels (header byte 10)
const PRIO_LOW: u8 = 0x00;
const PRIO_NORMAL: u8 = 0x01;
const PRIO_HIGH: u8 = 0x02;

// Minimum display time per priority before a same-or-lower priority frame can replace it
const MIN_DISPLAY_HIGH: Duration = Duration::from_secs(5);
const MIN_DISPLAY_NORMAL: Duration = Duration::from_secs(3);
const MIN_DISPLAY_LOW: Duration = Duration::from_secs(1);

const TOUCH_EVENT_NONE: i32 = 0;
const TOUCH_EVENT_TAP: i32 = 1;
const TOUCH_EVENT_LEFT: i32 = 2;
const TOUCH_EVENT_RIGHT: i32 = 3;
const TOUCH_EVENT_TOP: i32 = 4;
const TOUCH_EVENT_BOTTOM: i32 = 5;

extern "C" {
    fn esp_cache_msync(addr: *mut core::ffi::c_void, size: usize, flags: i32) -> i32;
    fn bsp_touch_init() -> i32;
    fn bsp_touch_read_event() -> i32;
}
const CACHE_MSYNC_C2M: i32 = (1 << 2) | (1 << 1);

fn min_display_time(prio: u8) -> Duration {
    match prio {
        PRIO_HIGH => MIN_DISPLAY_HIGH,
        PRIO_NORMAL => MIN_DISPLAY_NORMAL,
        _ => MIN_DISPLAY_LOW,
    }
}

fn set_display_awake(awake: bool) {
    unsafe {
        esp_idf_sys::bsp_display_set_brightness(if awake { ACTIVE_BRIGHTNESS } else { 0 });
    }
}

struct PendingSlot {
    fb: Vec<u8>,
    active: bool,
}

impl PendingSlot {
    fn new() -> Self {
        Self {
            fb: vec![0u8; FB_SIZE],
            active: false,
        }
    }
}

struct History {
    frames: VecDeque<Vec<u8>>,
    cursor: Option<usize>,
}

impl History {
    fn new() -> Self {
        Self {
            frames: VecDeque::with_capacity(HISTORY_LIMIT),
            cursor: None,
        }
    }

    fn push(&mut self, frame: &[u8]) {
        if self.frames.len() == HISTORY_LIMIT {
            self.frames.pop_front();
        }
        self.frames.push_back(frame.to_vec());
        self.cursor = self.frames.len().checked_sub(1);
    }

    fn move_older(&mut self) -> Option<&[u8]> {
        let current = self.cursor?;
        let next = current.checked_sub(1)?;
        self.cursor = Some(next);
        self.frames.get(next).map(Vec::as_slice)
    }

    fn move_newer(&mut self) -> Option<&[u8]> {
        let current = self.cursor?;
        let next = current + 1;
        if next >= self.frames.len() {
            return None;
        }
        self.cursor = Some(next);
        self.frames.get(next).map(Vec::as_slice)
    }
}

fn blit_frame(src: &[u8], fb_ptr: *mut u8) {
    unsafe {
        ptr::copy_nonoverlapping(src.as_ptr(), fb_ptr, FB_SIZE);
        esp_cache_msync(fb_ptr as *mut _, FB_SIZE, CACHE_MSYNC_C2M);
    }
}

fn display_frame(frame: &[u8], fb_ptr: *mut u8, history: &mut History) {
    blit_frame(frame, fb_ptr);
    history.push(frame);
}

fn show_history_frame(frame: &[u8], fb_ptr: *mut u8) {
    blit_frame(frame, fb_ptr);
}

fn main() -> Result<()> {
    esp_idf_sys::link_patches();

    unsafe {
        esp_idf_sys::esp_rom_printf(b"Waveshare Display starting...\n\0".as_ptr() as *const _);
    }

    let mut display_info = unsafe { std::mem::zeroed::<esp_idf_sys::bsp_display_info_t>() };
    let ret = unsafe { esp_idf_sys::bsp_display_init(&mut display_info) };
    if ret != esp_idf_sys::ESP_OK as i32 {
        bail!("bsp_display_init failed: {ret}");
    }

    let fb_ptr = display_info.framebuffer as *mut u8;

    let ret = unsafe { bsp_touch_init() };
    if ret != esp_idf_sys::ESP_OK as i32 {
        bail!("bsp_touch_init failed: {ret}");
    }

    set_display_awake(true);

    unsafe {
        esp_idf_sys::esp_rom_printf(b"READY\n\0".as_ptr() as *const _);
    }
    std::thread::sleep(std::time::Duration::from_millis(500));

    let ret = unsafe { esp_idf_sys::bsp_uart_init() };
    if ret != esp_idf_sys::ESP_OK as i32 {
        bail!("bsp_uart_init failed: {ret}");
    }
    unsafe { esp_idf_sys::uart_flush_input(0) };

    let mut webp_buf: Vec<u8> = vec![0u8; 1024 * 1024];
    let mut fb_scratch: Vec<u8> = vec![0u8; FB_SIZE];
    let mut slots = [PendingSlot::new(), PendingSlot::new(), PendingSlot::new()];
    let mut history = History::new();

    let mut active_prio: u8 = PRIO_LOW;
    let mut last_blit = Instant::now() - MIN_DISPLAY_NORMAL;
    let mut last_serial_activity = Instant::now();
    let mut display_awake = true;

    loop {
        match unsafe { bsp_touch_read_event() } {
            TOUCH_EVENT_NONE => {}
            TOUCH_EVENT_TAP => {
                last_serial_activity = Instant::now();
                if !display_awake {
                    set_display_awake(true);
                    display_awake = true;
                }
            }
            TOUCH_EVENT_LEFT | TOUCH_EVENT_TOP => {
                last_serial_activity = Instant::now();
                if !display_awake {
                    set_display_awake(true);
                    display_awake = true;
                } else if let Some(frame) = history.move_older() {
                    show_history_frame(frame, fb_ptr);
                    last_blit = Instant::now();
                }
            }
            TOUCH_EVENT_RIGHT | TOUCH_EVENT_BOTTOM => {
                last_serial_activity = Instant::now();
                if !display_awake {
                    set_display_awake(true);
                    display_awake = true;
                } else if let Some(frame) = history.move_newer() {
                    show_history_frame(frame, fb_ptr);
                    last_blit = Instant::now();
                }
            }
            _ => {}
        }

        let hold_elapsed = last_blit.elapsed() >= min_display_time(active_prio);

        if hold_elapsed {
            for prio in (0..3).rev() {
                if slots[prio].active {
                    display_frame(&slots[prio].fb, fb_ptr, &mut history);
                    active_prio = prio as u8;
                    last_blit = Instant::now();
                    slots[prio].active = false;
                    break;
                }
            }
        }

        if display_awake && last_serial_activity.elapsed() >= SLEEP_TIMEOUT {
            set_display_awake(false);
            display_awake = false;
        }

        let mut hdr = [0u8; HEADER_SIZE];
        let n = unsafe { esp_idf_sys::bsp_uart_read(hdr.as_mut_ptr(), 1, UART_POLL_TIMEOUT_MS) };
        if n < 0 {
            continue;
        }
        if n == 0 {
            continue;
        }

        last_serial_activity = Instant::now();
        if !display_awake {
            set_display_awake(true);
            display_awake = true;
        }

        if hdr[0] == CMD_MAGIC[0] {
            if read_exact(&mut hdr[1..4]).is_err() {
                continue;
            }
            if &hdr[0..4] == CMD_MAGIC {
                let mut cmd = [0u8; 1];
                if read_exact(&mut cmd).is_err() {
                    send_byte(RESP_ERR);
                    continue;
                }
                match cmd[0] {
                    CMD_ON => {
                        set_display_awake(true);
                        display_awake = true;
                    }
                    CMD_OFF => {
                        set_display_awake(false);
                        display_awake = false;
                    }
                    _ => {
                        send_byte(RESP_ERR);
                        continue;
                    }
                };
                send_byte(RESP_OK);
                continue;
            }
            if &hdr[0..4] != MAGIC {
                continue;
            }
        } else if hdr[0] == MAGIC[0] {
            if read_exact(&mut hdr[1..4]).is_err() || &hdr[0..4] != MAGIC {
                continue;
            }
        } else {
            continue;
        }

        if read_exact(&mut hdr[4..HEADER_SIZE]).is_err() {
            continue;
        }

        let data_len = u32::from_le_bytes([hdr[4], hdr[5], hdr[6], hdr[7]]) as usize;
        let chunk_size = u16::from_le_bytes([hdr[8], hdr[9]]) as usize;
        let priority = hdr[10].min(PRIO_HIGH);

        if data_len == 0 || data_len > webp_buf.len() || chunk_size == 0 {
            send_byte(RESP_ERR);
            continue;
        }

        send_byte(RESP_OK);

        let mut offset = 0usize;
        let mut ok = true;
        while offset < data_len {
            let n = (data_len - offset).min(chunk_size);
            if read_exact(&mut webp_buf[offset..offset + n]).is_err() {
                ok = false;
                break;
            }
            offset += n;
            send_byte(RESP_OK);
        }

        if !ok {
            continue;
        }

        let mut decoder = match WebPDecoder::new(Cursor::new(&webp_buf[..data_len])) {
            Ok(d) => d,
            Err(_) => {
                send_byte(RESP_ERR);
                continue;
            }
        };

        let (width, height) = decoder.dimensions();
        let width = width as usize;
        let height = height as usize;

        if width > LCD_W || height > LCD_H {
            send_byte(RESP_ERR);
            continue;
        }

        let has_alpha = decoder.has_alpha();
        let bpp_src = if has_alpha { 4 } else { 3 };
        let mut rgb_buf: Vec<u8> = vec![0u8; width * height * bpp_src];

        if decoder.read_image(&mut rgb_buf).is_err() {
            send_byte(RESP_ERR);
            continue;
        }

        fb_scratch.fill(0);
        let x_off = (LCD_W.saturating_sub(width)) / 2;
        let y_off = (LCD_H.saturating_sub(height)) / 2;

        for y in 0..height {
            for x in 0..width {
                let src_idx = (y * width + x) * bpp_src;
                let r = rgb_buf[src_idx];
                let g = rgb_buf[src_idx + 1];
                let b = rgb_buf[src_idx + 2];

                let rgb565 = ((r as u16 & 0xF8) << 8) | ((g as u16 & 0xFC) << 3) | (b as u16 >> 3);

                let dst_x = x_off + x;
                let dst_y = y_off + y;
                let dst_idx = (dst_y * LCD_W + dst_x) * BPP;
                fb_scratch[dst_idx] = (rgb565 & 0xFF) as u8;
                fb_scratch[dst_idx + 1] = (rgb565 >> 8) as u8;
            }
        }

        let can_preempt =
            priority > active_prio || last_blit.elapsed() >= min_display_time(active_prio);

        if can_preempt {
            display_frame(&fb_scratch, fb_ptr, &mut history);
            active_prio = priority;
            last_blit = Instant::now();
            for prio in 0..=(priority as usize) {
                slots[prio].active = false;
            }
        } else {
            let slot = &mut slots[priority as usize];
            slot.fb.copy_from_slice(&fb_scratch);
            slot.active = true;
        }

        send_byte(RESP_OK);
    }
}

fn read_exact(buf: &mut [u8]) -> Result<()> {
    let mut off = 0;
    while off < buf.len() {
        let n =
            unsafe { esp_idf_sys::bsp_uart_read(buf[off..].as_mut_ptr(), buf.len() - off, 10000) };
        if n < 0 {
            bail!("UART read error");
        }
        off += n as usize;
    }
    Ok(())
}

fn send_byte(b: u8) {
    unsafe {
        esp_idf_sys::bsp_uart_write([b].as_ptr(), 1);
    }
}
