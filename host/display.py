"""Shared display protocol and rendering utilities for Waveshare Display."""

import io
import struct
import time
from pathlib import Path

import serial
from PIL import Image, ImageDraw, ImageFont

MAGIC = b"DWBP"
DISPLAY_W = 720
DISPLAY_H = 720
BAUD = 921_600
CHUNK_SIZE = 4096
RESP_OK = 0x01


_theme = {}


def _hex_to_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_theme(path: str):
    """Load a base16 JSON theme file."""
    import json
    with open(path) as f:
        data = json.load(f)
    for key, val in data.items():
        if isinstance(val, str):
            _theme[key.lower()] = _hex_to_rgb(val)


# Load default theme from alongside this file
load_theme(str(Path(__file__).parent / "theme.json"))


def parse_color(s: str):
    if s.startswith("#"):
        s = s.lstrip("#")
        return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
    return _theme.get(s.lower(), (0xf8, 0xf8, 0xf8))


def lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def find_font(size, bold=False):
    names = [
        "/run/current-system/sw/share/X11/fonts/InterVariable.ttf",
        "/usr/share/fonts/truetype/inter/InterVariable.ttf",
        "/usr/share/fonts/TTF/InterVariable.ttf",
    ]
    for n in names:
        try:
            font = ImageFont.truetype(n, size)
            # InterVariable axes: [optical size, weight]
            opsz = min(32, max(14, size))
            weight = 700 if bold else 400
            font.set_variation_by_axes([opsz, weight])
            return font
        except (OSError, IOError, AttributeError):
            continue
    # Fallback to Inter.ttc or DejaVuSans
    fallbacks = [
        "/run/current-system/sw/share/X11/fonts/Inter.ttc",
        "Inter",
        "DejaVuSans",
    ]
    for n in fallbacks:
        try:
            return ImageFont.truetype(n, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def find_nerd_font(size):
    import glob
    names = [
        "/run/current-system/sw/share/X11/fonts/JetBrainsMonoNLNerdFont-Bold.ttf",
        "/usr/share/fonts/TTF/JetBrainsMonoNLNerdFont-Bold.ttf",
    ]
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except (OSError, IOError):
            continue
    for pattern in ["/run/current-system/sw/share/X11/fonts/*NerdFont*Bold*.ttf",
                    "/usr/share/fonts/**/*NerdFont*Bold*.ttf"]:
        for f in glob.glob(pattern, recursive=True):
            try:
                return ImageFont.truetype(f, size)
            except (OSError, IOError):
                continue
    return None


def word_wrap(draw, text, font, max_width):
    lines = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        line = words[0]
        for word in words[1:]:
            test = line + " " + word
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] <= max_width:
                line = test
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def text_size(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def img_to_webp(img: Image.Image) -> bytes:
    img = img.transpose(Image.ROTATE_180)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=90, method=0)
    return buf.getvalue()



def connect(port: str) -> serial.Serial:
    ser = serial.Serial(port, BAUD, timeout=5)
    time.sleep(0.1)
    ser.reset_input_buffer()
    return ser


def send_frame(ser: serial.Serial, png_data: bytes) -> bool:
    header = MAGIC + struct.pack("<IHH", len(png_data), CHUNK_SIZE, 0)
    ser.write(header)
    ser.flush()
    resp = ser.read(1)
    if not resp or resp[0] != RESP_OK:
        return False
    offset = 0
    while offset < len(png_data):
        end = min(offset + CHUNK_SIZE, len(png_data))
        ser.write(png_data[offset:end])
        ser.flush()
        resp = ser.read(1)
        if not resp or resp[0] != RESP_OK:
            return False
        offset = end
    resp = ser.read(1)
    return bool(resp) and resp[0] == RESP_OK
