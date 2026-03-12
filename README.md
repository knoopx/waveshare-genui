# ESP32-P4 USB Display

Rust firmware for the **Waveshare ESP32-P4-WIFI6-Touch-LCD-4B** that turns it into a USB-connected display. A host computer sends images over USB CDC (virtual serial port) and the firmware renders them on the 720×720 IPS LCD.

## Hardware

| Feature | Detail |
|---------|--------|
| MCU | ESP32-P4 (dual-core RISC-V) |
| Display | 4" 720×720 IPS, MIPI DSI (ST7703) |
| USB | OTG 2.0 High-Speed (480 Mbps) |
| Touch | GT911 capacitive (not used by this firmware) |

## Protocol

Frames are sent over USB CDC-ACM using a simple binary protocol:

```
Offset  Size  Field
0       4     Magic: "DISP" (ASCII)
4       2     Width (u16 LE, max 720)
6       2     Height (u16 LE, max 720)
8       2     Flags (reserved, set to 0)
10      2     Reserved (set to 0)
12      N     Pixel data: width × height × 2 bytes (RGB565 LE)
```

After each frame, the device sends a 1-byte response:
- `0x01` — OK (frame displayed)
- `0xFF` — Error (bad dimensions, read failure)

## Build

### Prerequisites

- Rust nightly with `rust-src` component
- `ldproxy`: `cargo install ldproxy`
- `espflash`: `cargo install espflash`
- ESP-IDF v5.4 toolchain (auto-downloaded by `esp-idf-sys`)

### Compile and flash

```bash
cargo build --release
espflash flash target/riscv32imafc-esp-espidf/release/esp32-p4-usb-stream --monitor
```

Or in one step:

```bash
cargo run --release
```

## Host Usage

### Setup

```bash
cd host
pip install -r requirements.txt
```

### Send an image

```bash
# Single image (auto-resized to 720×720):
python stream.py /dev/ttyACM0 photo.jpg

# Test pattern (color bars):
python stream.py /dev/ttyACM0 --test

# Stream a folder of images at 5 FPS:
python stream.py /dev/ttyACM0 ./frames/ --fps 5
```

### Custom resolution

Images smaller than 720×720 are centered on the display:

```bash
python stream.py /dev/ttyACM0 icon.png --width 256 --height 256
```

## Architecture

```
Host (Python)                  ESP32-P4
┌────────────┐   USB CDC-ACM   ┌──────────────────┐
│ stream.py  │ ──── DISP ────→ │ main.rs          │
│            │ ←──── ACK ───── │  ↓               │
│ RGB565 img │                 │ blit to FB       │
└────────────┘                 │  ↓               │
                               │ MIPI DSI → LCD   │
                               └──────────────────┘
```

- **`components/bsp/`** — C component: MIPI DSI display init (ST7703 vendor commands), USB CDC-ACM init via `esp_tinyusb`
- **`src/main.rs`** — Rust: frame protocol parsing, framebuffer management, main loop
- **`host/stream.py`** — Python: image loading, RGB565 conversion, serial transmission

## Performance

With USB 2.0 High-Speed bulk transfers:
- Full 720×720 frame = ~1 MB (RGB565)
- Theoretical max: ~40 MB/s → ~38 FPS
- Practical: ~15-25 FPS depending on host USB stack

## License

MIT
