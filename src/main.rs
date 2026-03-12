use std::io::Cursor;
use std::ptr;

use anyhow::{bail, Result};

const MAGIC: &[u8; 4] = b"DPNG";
const HEADER_SIZE: usize = 12;
const RESP_OK: u8 = 0x01;
const RESP_ERR: u8 = 0xFF;

const LCD_W: usize = 720;
const LCD_H: usize = 720;
const BPP: usize = 2;
const FB_SIZE: usize = LCD_W * LCD_H * BPP;

extern "C" {
    fn esp_cache_msync(addr: *mut core::ffi::c_void, size: usize, flags: i32) -> i32;
}
const CACHE_MSYNC_C2M: i32 = (1 << 2) | (1 << 1);

fn main() -> Result<()> {
    esp_idf_sys::link_patches();

    unsafe {
        esp_idf_sys::esp_rom_printf(b"ESP32-P4 USB Display starting...\n\0".as_ptr() as *const _);
    }

    let mut display_info = unsafe { std::mem::zeroed::<esp_idf_sys::bsp_display_info_t>() };
    let ret = unsafe { esp_idf_sys::bsp_display_init(&mut display_info) };
    if ret != esp_idf_sys::ESP_OK as i32 {
        bail!("bsp_display_init failed: {ret}");
    }

    let fb_ptr = display_info.framebuffer as *mut u8;

    unsafe { esp_idf_sys::bsp_display_set_brightness(100) };

    unsafe {
        esp_idf_sys::esp_rom_printf(b"READY\n\0".as_ptr() as *const _);
    }
    std::thread::sleep(std::time::Duration::from_millis(500));

    let ret = unsafe { esp_idf_sys::bsp_uart_init() };
    if ret != esp_idf_sys::ESP_OK as i32 {
        bail!("bsp_uart_init failed: {ret}");
    }
    unsafe { esp_idf_sys::uart_flush_input(0) };

    // PNG receive buffer (up to 1MB should be plenty for 720x720 PNG)
    let mut png_buf: Vec<u8> = vec![0u8; 1024 * 1024];
    // RGB565 framebuffer scratch
    let mut fb_scratch: Vec<u8> = vec![0u8; FB_SIZE];

    loop {
        // Scan for magic
        let mut hdr = [0u8; HEADER_SIZE];
        if read_exact(&mut hdr[..1]).is_err() {
            continue;
        }
        if hdr[0] != MAGIC[0] {
            continue;
        }
        if read_exact(&mut hdr[1..4]).is_err() || &hdr[0..4] != MAGIC {
            continue;
        }
        if read_exact(&mut hdr[4..HEADER_SIZE]).is_err() {
            continue;
        }

        let data_len = u32::from_le_bytes([hdr[4], hdr[5], hdr[6], hdr[7]]) as usize;
        let chunk_size = u16::from_le_bytes([hdr[8], hdr[9]]) as usize;

        if data_len == 0 || data_len > png_buf.len() || chunk_size == 0 {
            send_byte(RESP_ERR);
            continue;
        }

        // ACK header
        send_byte(RESP_OK);

        // Receive PNG data in chunks
        let mut offset = 0usize;
        let mut ok = true;
        while offset < data_len {
            let n = (data_len - offset).min(chunk_size);
            if read_exact(&mut png_buf[offset..offset + n]).is_err() {
                ok = false;
                break;
            }
            offset += n;
            send_byte(RESP_OK);
        }

        if !ok {
            continue;
        }

        // Decode PNG
        let decoder = png::Decoder::new(Cursor::new(&png_buf[..data_len]));
        let mut reader = match decoder.read_info() {
            Ok(r) => r,
            Err(_) => {
                send_byte(RESP_ERR);
                continue;
            }
        };

        let info = reader.info();
        let width = info.width as usize;
        let height = info.height as usize;
        let color_type = info.color_type;

        if width > LCD_W || height > LCD_H {
            send_byte(RESP_ERR);
            continue;
        }

        // Decode all rows
        let mut rgb_buf: Vec<u8> = vec![0u8; width * height * 4]; // max RGBA
        let mut row_offset = 0;
        while let Ok(Some(row)) = reader.next_row() {
            let row_data = row.data();
            let end = row_offset + row_data.len();
            if end <= rgb_buf.len() {
                rgb_buf[row_offset..end].copy_from_slice(row_data);
            }
            row_offset = end;
        }

        // Convert to RGB565 and blit
        fb_scratch.fill(0);
        let x_off = (LCD_W.saturating_sub(width)) / 2;
        let y_off = (LCD_H.saturating_sub(height)) / 2;

        let bytes_per_pixel = match color_type {
            png::ColorType::Rgb => 3,
            png::ColorType::Rgba => 4,
            png::ColorType::Grayscale => 1,
            png::ColorType::GrayscaleAlpha => 2,
            _ => 3,
        };

        for y in 0..height {
            for x in 0..width {
                let src_idx = (y * width + x) * bytes_per_pixel;
                let (r, g, b) = match color_type {
                    png::ColorType::Rgb => (
                        rgb_buf[src_idx],
                        rgb_buf[src_idx + 1],
                        rgb_buf[src_idx + 2],
                    ),
                    png::ColorType::Rgba => (
                        rgb_buf[src_idx],
                        rgb_buf[src_idx + 1],
                        rgb_buf[src_idx + 2],
                    ),
                    png::ColorType::Grayscale => {
                        let v = rgb_buf[src_idx];
                        (v, v, v)
                    }
                    png::ColorType::GrayscaleAlpha => {
                        let v = rgb_buf[src_idx];
                        (v, v, v)
                    }
                    _ => (0, 0, 0),
                };

                let rgb565 = ((r as u16 & 0xF8) << 8)
                    | ((g as u16 & 0xFC) << 3)
                    | (b as u16 >> 3);

                let dst_x = x_off + x;
                let dst_y = y_off + y;
                let dst_idx = (dst_y * LCD_W + dst_x) * BPP;
                fb_scratch[dst_idx] = (rgb565 & 0xFF) as u8;
                fb_scratch[dst_idx + 1] = (rgb565 >> 8) as u8;
            }
        }

        unsafe {
            ptr::copy_nonoverlapping(fb_scratch.as_ptr(), fb_ptr, FB_SIZE);
            esp_cache_msync(fb_ptr as *mut _, FB_SIZE, CACHE_MSYNC_C2M);
        }

        send_byte(RESP_OK);
    }
}

fn read_exact(buf: &mut [u8]) -> Result<()> {
    let mut off = 0;
    while off < buf.len() {
        let n = unsafe {
            esp_idf_sys::bsp_uart_read(
                buf[off..].as_mut_ptr(),
                buf.len() - off,
                10000,
            )
        };
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
