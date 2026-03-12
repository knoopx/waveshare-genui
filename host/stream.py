#!/usr/bin/env python3
"""
Send PNG images to the ESP32-P4 USB Display over UART (single cable).

Protocol (chunked):
  Host → Device: "DPNG" + data_len(u32 LE) + chunk_size(u16 LE) + reserved(u16 LE)
  Device → Host: 0x01 (ACK header)
  For each chunk:
    Host → Device: <chunk bytes>
    Device → Host: 0x01 (ACK chunk)
  Device decodes PNG, blits to display, sends 0x01 (ACK done)

Usage:
    python stream.py /dev/ttyACM0 --test
    python stream.py /dev/ttyACM0 photo.jpg
    python stream.py /dev/ttyACM0 ./frames/ --fps 1
"""

import argparse
import io
import struct
import sys
import time
from pathlib import Path

import serial
from PIL import Image

MAGIC = b"DPNG"
DISPLAY_W = 720
DISPLAY_H = 720
BAUD = 921_600
CHUNK_SIZE = 4096
RESP_OK = 0x01


def prepare_png(img: Image.Image, width: int, height: int) -> bytes:
    """Resize image to fit width×height, rotate for display, encode as PNG."""
    img = img.convert("RGB")
    # Display is mounted 180° rotated
    img = img.transpose(Image.ROTATE_180)
    img.thumbnail((width, height), Image.BICUBIC)
    if img.size != (width, height):
        canvas = Image.new("RGB", (width, height), (0, 0, 0))
        x = (width - img.width) // 2
        y = (height - img.height) // 2
        canvas.paste(img, (x, y))
        img = canvas
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    return buf.getvalue()


def make_test_png(width: int, height: int) -> bytes:
    """Generate test pattern as PNG."""
    img = Image.new("RGB", (width, height))
    pixels = img.load()
    h4 = height // 4
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 255)]
    for y in range(height):
        c = colors[min(y // h4, 3)]
        for x in range(width):
            pixels[x, y] = c
    # Apply same 180° rotation as real images
    img = img.transpose(Image.ROTATE_180)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    return buf.getvalue()


def wait_ack(ser: serial.Serial) -> bool:
    resp = ser.read(1)
    return bool(resp) and resp[0] == RESP_OK


def send_frame(ser: serial.Serial, png_data: bytes) -> bool:
    chunk_size = CHUNK_SIZE
    header = MAGIC + struct.pack("<IHH", len(png_data), chunk_size, 0)
    ser.write(header)
    ser.flush()

    if not wait_ack(ser):
        print("  NACK on header")
        return False

    offset = 0
    total = len(png_data)
    while offset < total:
        end = min(offset + chunk_size, total)
        ser.write(png_data[offset:end])
        ser.flush()
        if not wait_ack(ser):
            print(f"  NACK at chunk offset {offset}")
            return False
        offset = end

    # Wait for decode-done ACK
    if not wait_ack(ser):
        print("  NACK on decode")
        return False

    return True


def main():
    parser = argparse.ArgumentParser(description="ESP32-P4 Display streamer (single cable)")
    parser.add_argument("port", help="Serial port (e.g. /dev/ttyACM0)")
    parser.add_argument("source", nargs="?", help="Image file or directory")
    parser.add_argument("--test", action="store_true", help="Send test pattern")
    parser.add_argument("--fps", type=float, default=0)
    parser.add_argument("--width", type=int, default=DISPLAY_W)
    parser.add_argument("--height", type=int, default=DISPLAY_H)
    args = parser.parse_args()

    w, h = args.width, args.height
    ser = serial.Serial(args.port, BAUD, timeout=5)
    time.sleep(0.1)
    ser.reset_input_buffer()

    if args.test:
        print(f"Sending test pattern {w}×{h}...")
        data = make_test_png(w, h)
        t0 = time.monotonic()
        ok = send_frame(ser, data)
        dt = time.monotonic() - t0
        print(f"{'ACK' if ok else 'FAIL'} — {len(data)/1024:.0f} KB PNG in {dt:.2f}s")
        ser.close()
        return

    if not args.source:
        parser.error("Provide an image/directory path or --test")

    source = Path(args.source)

    if source.is_file():
        data = prepare_png(Image.open(source), w, h)
        print(f"Sending {source.name} ({len(data)/1024:.0f} KB PNG)...")
        t0 = time.monotonic()
        ok = send_frame(ser, data)
        dt = time.monotonic() - t0
        print(f"{'ACK' if ok else 'FAIL'} — {dt:.2f}s")

    elif source.is_dir():
        exts = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"}
        files = sorted(f for f in source.iterdir() if f.suffix.lower() in exts)
        if not files:
            print(f"No image files in {source}")
            sys.exit(1)
        interval = 1.0 / args.fps if args.fps > 0 else 0
        print(f"Streaming {len(files)} images...")
        for i, f in enumerate(files):
            t0 = time.monotonic()
            data = prepare_png(Image.open(f), w, h)
            ok = send_frame(ser, data)
            dt = time.monotonic() - t0
            fps = 1.0 / dt if dt > 0 else 0
            print(f"[{i+1}/{len(files)}] {f.name}: {'OK' if ok else 'FAIL'} ({len(data)/1024:.0f}KB, {fps:.1f} FPS)")
            if interval > dt:
                time.sleep(interval - dt)
    else:
        print(f"Not found: {source}")
        sys.exit(1)

    ser.close()
    print("Done.")


if __name__ == "__main__":
    main()
