# ESP32-P4 USB Display

Rust firmware for the **Waveshare ESP32-P4-WIFI6-Touch-LCD-4B** that turns it into a serial-connected display. A host computer sends PNG images over UART and the firmware decodes and renders them on the 720×720 IPS LCD.

## Hardware

| Feature | Detail |
|---------|--------|
| MCU | ESP32-P4 (dual-core RISC-V, 360 MHz) |
| Display | 4" 720×720 IPS, MIPI DSI (ST7703) |
| PSRAM | 32 MB @ 200 MHz |
| Connection | Single USB cable (CH343 USB-to-UART bridge) |
| Touch | GT911 capacitive (not used by this firmware) |

## Protocol

PNG-compressed frames are sent over UART at 921600 baud using a chunked protocol with flow control:

```
Header (12 bytes):
  Offset  Size  Field
  0       4     Magic: "DPNG" (ASCII)
  4       4     PNG data length (u32 LE)
  8       2     Chunk size (u16 LE, typically 4096)
  10      2     Reserved (set to 0)

Flow:
  Host → Device: header
  Device → Host: 0x01 (ACK)
  For each chunk:
    Host → Device: chunk bytes
    Device → Host: 0x01 (ACK)
  Device decodes PNG, blits to framebuffer
  Device → Host: 0x01 (done)
```

## Build

### Prerequisites

- [Nix](https://nixos.org/) with flakes enabled
- ESP-IDF v5.4 toolchain (auto-downloaded by `esp-idf-sys` on first build)

### Compile and flash

```bash
# Enter dev shell and build + flash
nix develop path:. --command make flash

# Or step by step:
nix develop path:. --command make build
nix develop path:. --command make flash PORT=/dev/ttyACM0
```

The two-pass build is handled automatically: first pass generates bindings, `patch-tinyusb.sh` fixes them, second pass compiles the firmware.

### Flash only (via nix app)

```bash
nix run path:.#flash
```

## Host CLI

### Install

```bash
nix build path:.
# Binary at ./result/bin/esp32-p4-stream
```

Or run directly:

```bash
nix run path:. -- /dev/ttyACM0 --test
```

### Usage

```bash
# Test pattern (color bars):
esp32-p4-stream /dev/ttyACM0 --test

# Send an image (auto-resized to fit 720×720, aspect ratio preserved):
esp32-p4-stream /dev/ttyACM0 photo.jpg

# Stream a directory of images:
esp32-p4-stream /dev/ttyACM0 ./frames/ --fps 1
```

## Architecture

```
Host (Python)                    ESP32-P4
┌────────────────┐    UART      ┌──────────────────┐
│ esp32-p4-stream│ ── DPNG ───→ │ main.rs          │
│                │ ←── ACK ──── │  ↓ PNG decode    │
│ resize → PNG   │              │  ↓ RGB565 convert│
└────────────────┘              │  ↓ blit to FB    │
                                │  ↓ cache flush   │
                                │ MIPI DSI → LCD   │
                                └──────────────────┘
```

- **`components/bsp/`** — C component: MIPI DSI display init (ST7703 vendor commands), UART driver
- **`src/main.rs`** — Rust: PNG decoding, RGB565 conversion, framebuffer blit, chunked protocol
- **`host/stream.py`** — Python: image loading, resize/rotate, PNG encoding, serial transmission
- **`flake.nix`** — Nix flake: dev shell, host CLI package, flash app

## Performance

| Metric | Value |
|--------|-------|
| Frame size (raw) | 1012 KB (720×720 RGB565) |
| Typical PNG size | 30-300 KB |
| Transfer time | 0.3-3s per frame |
| Compression ratio | 3-30× vs raw |

Single USB cable, no custom drivers needed.

## License

MIT
