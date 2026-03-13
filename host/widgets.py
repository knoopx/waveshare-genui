"""Render functions for all display widgets."""

import io
import math
import time
from datetime import datetime

from PIL import Image, ImageDraw
from display import (find_font, find_nerd_font, img_to_webp, lerp_color,
                     parse_color, text_size, word_wrap)

# ---------------------------------------------------------------------------
# Design tokens — single source of truth for visual consistency
# ---------------------------------------------------------------------------

PAD = 24
ACCENT_BAR_H = 6
HEADER_Y = 24
HEADER_SEP_Y = HEADER_Y + 62

# lerp_color ratios (fg→bg means text fades toward background)
MUTED = 0.3        # subtitles, secondary values, dates
DIM = 0.4           # labels, timestamps, tertiary info
SEP = 0.1           # separator lines
TRACK = 0.08        # arc/bar track backgrounds
CARD_BG = 0.04      # card fill
PLACEHOLDER = 0.06  # empty-state icon tint


# ---------------------------------------------------------------------------
# Shared subwidgets
# ---------------------------------------------------------------------------

def _new_canvas(width, height, bg):
    img = Image.new("RGB", (width, height), bg)
    return img, ImageDraw.Draw(img)


def _draw_accent_bar(draw, width, accent):
    draw.rectangle([0, 0, width, ACCENT_BAR_H], fill=accent)


def _draw_header(draw, width, icon, title, bg, fg, accent,
                 icon_font=None, title_font=None, right_text="", right_font=None):
    """Draw accent bar + icon + title. Returns y position after separator."""
    _draw_accent_bar(draw, width, accent)
    if icon_font is None:
        icon_font = find_nerd_font(32)
    if title_font is None:
        title_font = find_font(32, bold=True)

    ty = HEADER_Y
    if icon_font:
        draw.text((PAD, ty), icon, fill=accent, font=icon_font)
    draw.text((PAD + 48, ty), title, fill=fg, font=title_font)

    if right_text and right_font:
        rw, _ = text_size(draw, right_text, right_font)
        draw.text((width - PAD - rw, ty + 10), right_text,
                  fill=lerp_color(fg, bg, DIM), font=right_font)

    sep_y = HEADER_SEP_Y
    _draw_sep(draw, sep_y, width, bg, fg)
    return sep_y + 14


def _draw_sep(draw, y, width, bg, fg):
    draw.line([PAD, y, width - PAD, y],
              fill=lerp_color(bg, fg, SEP), width=2)


def _draw_timestamp(draw, width, height, bg, fg, fmt="%H:%M"):
    font = find_font(22)
    ts = datetime.now().strftime(fmt)
    tw, th = text_size(draw, ts, font)
    draw.text((width - PAD - tw, height - PAD - th), ts,
              fill=lerp_color(fg, bg, DIM), font=font)


def _draw_badge(draw, x, y, text, font, bg_color, fg_color, radius=8,
                pad_x=10, pad_y=6):
    """Draw a rounded badge with centered text. Returns badge width."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    w = tw + pad_x * 2
    h = th + pad_y * 2
    draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=bg_color)
    draw.text((x + pad_x - bbox[0], y + pad_y - bbox[1]), text,
              fill=fg_color, font=font)
    return w


def _draw_empty_state(draw, width, height, icon, message, bg, fg):
    y = height // 2 - 40
    big = find_nerd_font(80)
    font = find_font(30, bold=True)
    if big:
        ibbox = draw.textbbox((0, 0), icon, font=big)
        iw = ibbox[2] - ibbox[0]
        draw.text(((width - iw) // 2, y - 80), icon,
                  fill=lerp_color(bg, fg, PLACEHOLDER * 2), font=big)
    mw, _ = text_size(draw, message, font)
    draw.text(((width - mw) // 2, y + 20), message,
              fill=lerp_color(fg, bg, DIM), font=font)


# Color palette shared by gauge/calendar/progress widgets
def _palette():
    return [
        parse_color("base0a"), parse_color("base0b"), parse_color("base09"),
        parse_color("base0f"), parse_color("base08"), parse_color("base0c"),
        parse_color("base0e"), parse_color("base05"),
    ]


# ---------------------------------------------------------------------------
# Widgets
# ---------------------------------------------------------------------------

# --- image ---

def render_image(img: Image.Image, width: int, height: int) -> bytes:
    img = img.convert("RGB")
    img = img.transpose(Image.ROTATE_180)
    img.thumbnail((width, height), Image.BICUBIC)
    if img.size != (width, height):
        canvas = Image.new("RGB", (width, height), parse_color("base00"))
        x = (width - img.width) // 2
        y = (height - img.height) // 2
        canvas.paste(img, (x, y))
        img = canvas
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=90, method=0)
    return buf.getvalue()


def render_test_pattern(width: int, height: int) -> bytes:
    img = Image.new("RGB", (width, height))
    pixels = img.load()
    h4 = height // 4
    colors = [parse_color("base08"), parse_color("base0b"),
              parse_color("base0d"), parse_color("base05")]
    for y in range(height):
        c = colors[min(y // h4, 3)]
        for x in range(width):
            pixels[x, y] = c
    img = img.transpose(Image.ROTATE_180)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=90, method=0)
    return buf.getvalue()


# --- message ---

def render_message(text: str, width: int, height: int, fg, bg,
                   font_size: int, align: str, padding: int) -> bytes:
    img, draw = _new_canvas(width, height, bg)
    font = find_font(font_size, bold=True)

    max_w = width - padding * 2
    lines = word_wrap(draw, text, font, max_w)

    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line or " ", font=font)
        line_heights.append(bbox[3] - bbox[1])
    spacing = font_size // 4
    total_h = sum(line_heights) + spacing * (len(lines) - 1)

    if align == "top":
        y = padding
    elif align == "bottom":
        y = height - padding - total_h
    else:
        y = (height - total_h) // 2

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line or " ", font=font)
        lw = bbox[2] - bbox[0]
        x = (width - lw) // 2
        draw.text((x, y), line, fill=fg, font=font)
        y += line_heights[i] + spacing

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- notify ---

def render_notify(title: str, body: str, icon: str,
                  width: int, height: int, bg, accent, fg) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    body_font = find_font(34)

    content_y = _draw_header(draw, width, icon, title, bg, fg, accent)

    body_fg = lerp_color(fg, bg, MUTED)
    if body:
        body_lines = word_wrap(draw, body, body_font, width - PAD * 2)
        for line in body_lines:
            bbox = draw.textbbox((0, 0), line or " ", font=body_font)
            draw.text((PAD, content_y), line, fill=body_fg, font=body_font)
            content_y += bbox[3] - bbox[1] + 12

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- clock ---

def render_clock(now: datetime, width: int, height: int,
                 bg, fg, accent, use_24h: bool) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    time_font = find_font(140, bold=True)
    ampm_font = find_font(40)
    date_font = find_font(36)
    icon_font = find_nerd_font(36)

    cy = height // 2

    if use_24h:
        time_str = now.strftime("%H:%M")
    else:
        time_str = now.strftime("%I:%M").lstrip("0")
        ampm = now.strftime("%p")

    tbbox = draw.textbbox((0, 0), time_str, font=time_font)
    tw = tbbox[2] - tbbox[0]
    th = tbbox[3] - tbbox[1]

    tx = (width - tw) // 2
    ty = cy - th // 2 - 30
    draw.text((tx, ty), time_str, fill=fg, font=time_font)

    if not use_24h:
        draw.text((tx + tw + 12, ty + 10), ampm,
                  fill=lerp_color(fg, bg, DIM), font=ampm_font)

    date_str = now.strftime("%A, %B %-d")
    dbbox = draw.textbbox((0, 0), date_str, font=date_font)
    dw = dbbox[2] - dbbox[0]
    date_y = ty + th + 50
    draw.text(((width - dw) // 2, date_y), date_str,
              fill=lerp_color(fg, bg, MUTED), font=date_font)

    if icon_font:
        ibbox = draw.textbbox((0, 0), "\uf073", font=icon_font)
        iiw = ibbox[2] - ibbox[0]
        draw.text(((width - dw) // 2 - iiw - 12, date_y),
                  "\uf073", fill=accent, font=icon_font)

    return img_to_webp(img)


# --- weather ---

WEATHER_ICONS = {
    "113": "\ue30d", "116": "\ue302", "119": "\ue312", "122": "\ue312",
    "143": "\ue313", "176": "\ue308", "179": "\ue30a", "182": "\ue3aa",
    "200": "\ue31d", "227": "\ue30a", "230": "\ue30a", "248": "\ue313",
    "260": "\ue313", "263": "\ue308", "266": "\ue308", "281": "\ue3aa",
    "284": "\ue3aa", "293": "\ue308", "296": "\ue308", "299": "\ue309",
    "302": "\ue309", "305": "\ue309", "308": "\ue309", "311": "\ue3aa",
    "314": "\ue3aa", "317": "\ue3aa", "320": "\ue3aa", "323": "\ue30a",
    "326": "\ue30a", "329": "\ue30a", "332": "\ue30a", "335": "\ue30a",
    "338": "\ue30a", "350": "\ue3aa", "353": "\ue308", "356": "\ue309",
    "359": "\ue309", "362": "\ue3aa", "365": "\ue3aa", "368": "\ue30a",
    "371": "\ue30a", "374": "\ue3aa", "377": "\ue3aa", "386": "\ue31d",
    "389": "\ue31d", "392": "\ue31d", "395": "\ue31d",
}


def render_weather(data: dict, width: int, height: int,
                   bg, fg, accent, units: str) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    temp_font = find_font(120, bold=True)
    label_font = find_font(32)
    desc_font = find_font(36, bold=True)
    detail_font = find_font(30)
    icon_font = find_nerd_font(100)
    detail_icon_font = find_nerd_font(28)

    current = data["current_condition"][0]
    area = data.get("nearest_area", [{}])[0]
    location = area.get("areaName", [{}])[0].get("value", "")

    temp_key = "temp_F" if units == "f" else "temp_C"
    feels_key = "FeelsLikeF" if units == "f" else "FeelsLikeC"
    unit_sym = "°F" if units == "f" else "°C"
    temp = current[temp_key]
    feels = current[feels_key]
    desc = current["weatherDesc"][0]["value"]
    code = current["weatherCode"]
    humidity = current["humidity"]
    wind_speed = current.get("windspeedKmph", "?")
    wind_dir = current.get("winddir16Point", "")
    precip = current.get("precipMM", "0")

    content_y = _draw_header(draw, width, "\uf124", location, bg, fg, accent)

    icon_char = WEATHER_ICONS.get(code, "\ue302")
    if icon_font:
        draw.text((PAD, content_y), icon_char, fill=accent, font=icon_font)
    draw.text((PAD + 140, content_y - 10), f"{temp}{unit_sym}", fill=fg, font=temp_font)

    desc_y = content_y + 130
    draw.text((PAD, desc_y), desc, fill=fg, font=desc_font)

    feels_y = desc_y + 50
    draw.text((PAD, feels_y), f"Feels like {feels}{unit_sym}",
              fill=lerp_color(fg, bg, MUTED), font=label_font)

    sep_y = feels_y + 60
    _draw_sep(draw, sep_y, width, bg, fg)

    details_y = sep_y + 24
    detail_items = [
        ("\uf043", f"Humidity: {humidity}%"),
        ("\ue34b", f"Wind: {wind_speed} km/h {wind_dir}"),
        ("\uf0e9", f"Precip: {precip} mm"),
    ]
    for i, (icon, text) in enumerate(detail_items):
        y = details_y + i * 52
        if detail_icon_font:
            draw.text((PAD, y), icon, fill=accent, font=detail_icon_font)
        draw.text((PAD + 40, y), text,
                  fill=lerp_color(fg, bg, MUTED), font=detail_font)

    forecast_y = details_y + len(detail_items) * 52 + 30
    _draw_sep(draw, forecast_y, width, bg, fg)
    forecast_y += 16

    weather = data.get("weather", [])[:3]
    if weather:
        fw = (width - PAD * 2) // 3
        forecast_font = find_font(26)
        forecast_temp_font = find_font(28, bold=True)
        forecast_icon_font = find_nerd_font(36)
        for i, day in enumerate(weather):
            cx = PAD + fw * i + fw // 2
            try:
                dt = datetime.strptime(day["date"], "%Y-%m-%d")
                day_name = dt.strftime("%a") if i > 0 else "Today"
            except (ValueError, KeyError):
                day_name = f"Day {i+1}"
            dw, _ = text_size(draw, day_name, forecast_font)
            draw.text((cx - dw // 2, forecast_y), day_name,
                      fill=lerp_color(fg, bg, MUTED), font=forecast_font)

            day_code = (day.get("hourly", [{}])[4].get("weatherCode", "116")
                        if day.get("hourly") else "116")
            ficon = WEATHER_ICONS.get(day_code, "\ue302")
            if forecast_icon_font:
                fibbox = draw.textbbox((0, 0), ficon, font=forecast_icon_font)
                fiw = fibbox[2] - fibbox[0]
                draw.text((cx - fiw // 2, forecast_y + 34), ficon,
                          fill=accent, font=forecast_icon_font)

            hi_key = "maxtempF" if units == "f" else "maxtempC"
            lo_key = "mintempF" if units == "f" else "mintempC"
            temp_text = f"{day.get(hi_key, '?')}° / {day.get(lo_key, '?')}°"
            ttw, _ = text_size(draw, temp_text, forecast_temp_font)
            draw.text((cx - ttw // 2, forecast_y + 80), temp_text,
                      fill=fg, font=forecast_temp_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- sysmon ---

def _draw_sysmon_gauge(draw, cx, cy, radius, pct, label, value_str,
                       color, bg, fg, fonts):
    label_font, value_font, pct_font = fonts
    track_color = lerp_color(bg, fg, TRACK)

    draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
             start=-225, end=45, fill=track_color, width=12)
    sweep = 270 * pct / 100
    if sweep > 0:
        draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
                 start=-225, end=-225 + sweep, fill=color, width=12)

    pct_str = f"{int(pct)}%"
    pw, ph = text_size(draw, pct_str, pct_font)
    draw.text((cx - pw // 2, cy - ph // 2 - 8), pct_str, fill=fg, font=pct_font)

    vw, _ = text_size(draw, value_str, label_font)
    draw.text((cx - vw // 2, cy + radius + 14), value_str,
              fill=lerp_color(fg, bg, MUTED), font=label_font)

    lw, _ = text_size(draw, label, label_font)
    draw.text((cx - lw // 2, cy + radius + 40), label,
              fill=lerp_color(fg, bg, DIM), font=label_font)


def render_sysmon(width: int, height: int, bg, fg, accent) -> bytes:
    import socket
    import psutil

    img, draw = _new_canvas(width, height, bg)

    label_font = find_font(22)
    value_font = find_font(26)
    pct_font = find_font(28, bold=True)
    detail_font = find_font(24)
    detail_icon_font = find_nerd_font(22)

    hostname = socket.gethostname()
    boot = psutil.boot_time()
    uptime_s = time.time() - boot
    days = int(uptime_s // 86400)
    hours = int((uptime_s % 86400) // 3600)
    uptime_str = f"{days}d {hours}h" if days else f"{hours}h {int((uptime_s % 3600) // 60)}m"
    info_str = f"{hostname}  •  up {uptime_str}"

    _draw_header(draw, width, "\uf108", "System Monitor", bg, fg, accent,
                 right_text=info_str, right_font=label_font)

    cpu_pct = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    gauge_y = 165
    gauge_r = 60
    spacing = width // 3
    colors = [parse_color("base0D"), parse_color("base0E"), parse_color("base09")]

    mem_used_gb = mem.used / (1024 ** 3)
    mem_total_gb = mem.total / (1024 ** 3)
    disk_used_gb = disk.used / (1024 ** 3)
    disk_total_gb = disk.total / (1024 ** 3)

    gauges = [
        (cpu_pct, "CPU", f"{psutil.cpu_count()} cores"),
        (mem.percent, "Memory", f"{mem_used_gb:.1f}/{mem_total_gb:.1f} GB"),
        (disk.percent, "Disk", f"{disk_used_gb:.0f}/{disk_total_gb:.0f} GB"),
    ]
    for i, (pct, label, value) in enumerate(gauges):
        cx = spacing // 2 + spacing * i
        _draw_sysmon_gauge(draw, cx, gauge_y, gauge_r, pct, label, value,
                           colors[i], bg, fg, (label_font, value_font, pct_font))

    sep_y = gauge_y + gauge_r + 90
    _draw_sep(draw, sep_y, width, bg, fg)

    dy = sep_y + 16
    row_h = 44
    detail_fg = lerp_color(fg, bg, MUTED)

    items = []
    freq = psutil.cpu_freq()
    if freq:
        items.append(("\uf2db", f"CPU Freq: {freq.current:.0f} MHz"))

    temps = psutil.sensors_temperatures() if hasattr(psutil, "sensors_temperatures") else {}
    for name, entries in temps.items():
        for entry in entries[:1]:
            items.append(("\uf2c9", f"{entry.label or name}: {entry.current:.0f}°C"))

    net = psutil.net_io_counters()
    items.append(("\uf0aa", f"Net ↑ {net.bytes_sent / (1024**2):.0f} MB  ↓ {net.bytes_recv / (1024**2):.0f} MB"))

    try:
        load = [f"{x:.1f}" for x in psutil.getloadavg()]
        items.append(("\uf080", f"Load: {' / '.join(load)}"))
    except (AttributeError, OSError):
        pass

    for i, (icon, text) in enumerate(items[:6]):
        y = dy + i * row_h
        if detail_icon_font:
            draw.text((PAD, y + 4), icon, fill=accent, font=detail_icon_font)
        draw.text((PAD + 36, y), text, fill=detail_fg, font=detail_font)

    _draw_timestamp(draw, width, height, bg, fg, fmt="%H:%M:%S")

    return img_to_webp(img)


# --- nowplaying ---

def render_nowplaying(title: str, artist: str, album: str,
                      status: str, art_url: str,
                      width: int, height: int, bg, fg, accent) -> bytes:
    import urllib.request as urlreq

    img, draw = _new_canvas(width, height, bg)

    title_font = find_font(44, bold=True)
    artist_font = find_font(34)
    album_font = find_font(28)
    icon_font = find_nerd_font(36)
    big_icon_font = find_nerd_font(160)

    art_size = 340
    art_x = (width - art_size) // 2
    art_y = 60
    art_img = None

    if art_url:
        try:
            if art_url.startswith("file://"):
                art_img = Image.open(art_url[7:])
            else:
                req = urlreq.Request(art_url, headers={"User-Agent": "waveshare-display"})
                with urlreq.urlopen(req, timeout=5) as resp:
                    art_img = Image.open(io.BytesIO(resp.read()))
            art_img = art_img.convert("RGB")
            art_img.thumbnail((art_size, art_size), Image.BICUBIC)
        except Exception:
            art_img = None

    if art_img:
        dom = art_img.resize((1, 1), Image.BICUBIC).getpixel((0, 0))
        tint = lerp_color(bg, dom, 0.15)
        img.paste(Image.new("RGB", (width, height), tint), (0, 0))
        draw = ImageDraw.Draw(img)

        mask = Image.new("L", (art_size, art_size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, art_size, art_size], radius=24, fill=255)

        aw, ah = art_img.size
        ax = art_x + (art_size - aw) // 2
        ay = art_y + (art_size - ah) // 2
        draw.rounded_rectangle([ax + 4, ay + 4, ax + aw + 4, ay + ah + 4],
                               radius=24, fill=lerp_color(bg, parse_color("base00"), 0.5))
        img.paste(art_img, (ax, ay), mask.resize(art_img.size))
    else:
        if big_icon_font:
            placeholder_bg = lerp_color(bg, fg, PLACEHOLDER)
            draw.rounded_rectangle([art_x, art_y, art_x + art_size, art_y + art_size],
                                   radius=24, fill=placeholder_bg)
            ibbox = draw.textbbox((0, 0), "\uf001", font=big_icon_font)
            iw = ibbox[2] - ibbox[0]
            ih = ibbox[3] - ibbox[1]
            draw.text((art_x + (art_size - iw) // 2,
                       art_y + (art_size - ih) // 2 - ibbox[1]),
                      "\uf001", fill=lerp_color(bg, fg, 0.15), font=big_icon_font)

    text_y = art_y + art_size + 40
    text_max = width - PAD * 2

    for line in word_wrap(draw, title or "No track", title_font, text_max)[:2]:
        tw, th = text_size(draw, line, title_font)
        draw.text(((width - tw) // 2, text_y), line, fill=fg, font=title_font)
        text_y += th + 6

    text_y += 8
    if artist:
        aw, ah = text_size(draw, artist, artist_font)
        draw.text(((width - aw) // 2, text_y), artist,
                  fill=lerp_color(fg, bg, MUTED), font=artist_font)
        text_y += ah + 6
    if album:
        text_y += 4
        abw, _ = text_size(draw, album, album_font)
        draw.text(((width - abw) // 2, text_y), album,
                  fill=lerp_color(fg, bg, DIM), font=album_font)

    status_icons = {"Playing": "\uf04b", "Paused": "\uf04c", "Stopped": "\uf04d"}
    sicon = status_icons.get(status, "\uf001")
    if icon_font:
        sibbox = draw.textbbox((0, 0), sicon, font=icon_font)
        siw = sibbox[2] - sibbox[0]
        draw.text(((width - siw) // 2, height - PAD - 30), sicon,
                  fill=accent, font=icon_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- timer ---

def render_timer(remaining: int, total: int, label: str,
                 width: int, height: int, bg, fg, accent) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    time_font = find_font(110, bold=True)
    label_font = find_font(36, bold=True)
    sub_font = find_font(24)

    cx, cy = width // 2, height // 2
    ring_r = 280
    ring_w = 14

    draw.arc([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
             start=0, end=360, fill=lerp_color(bg, fg, PLACEHOLDER), width=ring_w)

    pct = remaining / total if total > 0 else 0
    sweep = 360 * pct
    if sweep > 0:
        draw.arc([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
                 start=-90, end=-90 + sweep, fill=accent, width=ring_w)

    for i in range(60):
        angle = math.radians(i * 6 - 90)
        if i % 5 == 0:
            r1, r2, color, w = ring_r + 12, ring_r + 24, lerp_color(bg, fg, 0.2), 3
        else:
            r1, r2, color, w = ring_r + 14, ring_r + 20, lerp_color(bg, fg, TRACK), 1
        x1 = cx + r1 * math.cos(angle)
        y1 = cy + r1 * math.sin(angle)
        x2 = cx + r2 * math.cos(angle)
        y2 = cy + r2 * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=w)

    if remaining >= 3600:
        h = remaining // 3600
        m = (remaining % 3600) // 60
        s = remaining % 60
        time_str = f"{h}:{m:02d}:{s:02d}"
    else:
        time_str = f"{remaining // 60:02d}:{remaining % 60:02d}"

    tw, th = text_size(draw, time_str, time_font)
    draw.text((cx - tw // 2, cy - th // 2 - 30), time_str, fill=fg, font=time_font)

    label_y = cy + th // 2
    if label:
        lw, lh = text_size(draw, label, label_font)
        draw.text((cx - lw // 2, label_y), label, fill=accent, font=label_font)
        label_y += lh + 8

    pct_str = f"{int(pct * 100)}%"
    pw, _ = text_size(draw, pct_str, sub_font)
    draw.text((cx - pw // 2, label_y), pct_str,
              fill=lerp_color(fg, bg, DIM), font=sub_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- gauge ---

def parse_gauge_spec(spec: str) -> dict:
    """Parse 'label:value:unit[:color]' or 'label:cur/max:unit[:color]'."""
    parts = spec.split(":")
    label = parts[0] if len(parts) > 0 else ""
    value_str = parts[1] if len(parts) > 1 else "0"
    unit = parts[2] if len(parts) > 2 else ""
    color_str = parts[3] if len(parts) > 3 else ""

    if "/" in value_str:
        cur, mx = value_str.split("/", 1)
        cur_f, max_f = float(cur), float(mx)
        pct = (cur_f / max_f * 100) if max_f > 0 else 0
        display = f"{cur}/{mx}"
    elif unit == "%":
        pct = float(value_str)
        display = f"{int(pct)}"
    else:
        pct = float(value_str)
        display = value_str

    return {
        "label": label, "pct": min(100, max(0, pct)),
        "display": display, "unit": unit,
        "color": parse_color(color_str) if color_str else None,
    }


def _draw_arc_gauge(draw, cx, cy, radius, pct, label, display, unit,
                    color, bg, fg, fonts):
    value_font, label_font, unit_font = fonts
    track_color = lerp_color(bg, fg, TRACK)

    draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
             start=-225, end=45, fill=track_color, width=14)
    sweep = 270 * pct / 100
    if sweep > 0:
        draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
                 start=-225, end=-225 + sweep, fill=color, width=14)

    vw, vh = text_size(draw, display, value_font)
    draw.text((cx - vw // 2, cy - vh // 2 - 8), display, fill=fg, font=value_font)

    uw, _ = text_size(draw, unit, unit_font)
    draw.text((cx - uw // 2, cy + vh // 2 + 4), unit,
              fill=lerp_color(fg, bg, MUTED), font=unit_font)

    # Place label inside the arc opening (bottom gap between -225° and 45°)
    lw, lh = text_size(draw, label, label_font)
    label_y = cy + int(radius * 0.7) - lh // 2
    draw.text((cx - lw // 2, label_y), label,
              fill=lerp_color(fg, bg, DIM), font=label_font)


def render_gauges(gauges: list[dict], width: int, height: int,
                  bg, fg, accent) -> bytes:
    img, draw = _new_canvas(width, height, bg)
    n = len(gauges)

    layouts = {
        1: {"radius": 260, "vf": 80, "lf": 32, "uf": 32,
            "positions": lambda w, h: [(w // 2, h // 2 - 10)]},
        2: {"radius": 170, "vf": 56, "lf": 26, "uf": 26,
            "positions": lambda w, h: [(w // 4, h // 2 - 10),
                                       (3 * w // 4, h // 2 - 10)]},
    }
    default = {"radius": 120, "vf": 40, "lf": 22, "uf": 22,
               "positions": lambda w, h: [(w // 4, h // 4), (3 * w // 4, h // 4),
                                           (w // 4, 3 * h // 4), (3 * w // 4, 3 * h // 4)]}
    layout = layouts.get(n, default)

    value_font = find_font(layout["vf"], bold=True)
    label_font = find_font(layout["lf"])
    unit_font = find_font(layout["uf"])
    positions = layout["positions"](width, height)

    for i, g in enumerate(gauges):
        cx, cy = positions[i]
        color = g["color"] or _palette()[i % len(_palette())]
        _draw_arc_gauge(draw, cx, cy, layout["radius"],
                        g["pct"], g["label"], g["display"], g["unit"],
                        color, bg, fg, (value_font, label_font, unit_font))

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- qrcode ---

def render_qrcode(data: str, label: str, width: int, height: int,
                  bg, fg, accent) -> bytes:
    import qrcode

    img, draw = _new_canvas(width, height, bg)

    data_font = find_font(22)

    content_y = _draw_header(draw, width, "\uf029", label or "Scan QR Code",
                             bg, fg, accent)

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                        box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    qr_pad = 16
    text_h = 40  # room for URL text below
    qr_area = min(width - PAD * 2 - qr_pad * 2,
                  height - content_y - PAD - qr_pad * 2 - text_h)
    qr_img = qr_img.resize((qr_area, qr_area), Image.NEAREST)
    qr_x = (width - qr_area) // 2
    qr_y = content_y + (height - content_y - PAD - text_h - qr_area) // 2

    draw.rounded_rectangle(
        [qr_x - qr_pad, qr_y - qr_pad,
         qr_x + qr_area + qr_pad, qr_y + qr_area + qr_pad],
        radius=16, fill=parse_color("base05"))
    img.paste(qr_img, (qr_x, qr_y))

    text_y = qr_y + qr_area + qr_pad + 16
    display_data = data
    max_w = width - PAD * 2
    while text_size(draw, display_data, data_font)[0] > max_w and len(display_data) > 8:
        display_data = display_data[:-4] + "…"
    dw, _ = text_size(draw, display_data, data_font)
    draw.text(((width - dw) // 2, text_y), display_data,
              fill=lerp_color(fg, bg, DIM), font=data_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- github ---

def _fmt_count(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}k"
    return str(n)



def render_github(repos: list[dict], width: int, height: int,
                  bg, fg, accent) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    repo_font = find_font(26)
    value_font = find_font(28)

    detail_icon_font = find_nerd_font(26)

    content_y = _draw_header(draw, width, "\uf09b", "GitHub Stats",
                             bg, fg, accent)

    card_y = content_y
    card_pad = PAD // 2
    card_gap = card_pad
    card_h = card_pad + 30 + 8 + 32 + card_pad  # top + name + gap + stats + bottom

    stat_icons = {
        "stars": "\uf005", "forks": "\uf126",
        "issues": "\uf06a", "watchers": "\uf06e",
    }

    for i, repo in enumerate(repos):
        y = card_y + i * (card_h + card_gap)
        draw.rounded_rectangle([PAD, y, width - PAD, y + card_h],
                               radius=16, fill=lerp_color(bg, fg, CARD_BG))

        draw.text((PAD + card_pad, y + card_pad), repo["full_name"],
                  fill=lerp_color(fg, bg, MUTED), font=repo_font)

        stats = [
            ("stars", repo["stargazers_count"]),
            ("forks", repo["forks_count"]),
            ("issues", repo["open_issues_count"]),
            ("watchers", repo["subscribers_count"]),
        ]
        sx = PAD + card_pad
        stat_y = y + card_pad + 30 + 8
        col_w = (width - PAD * 2 - card_pad * 2) // 4

        for j, (key, val) in enumerate(stats):
            col_cx = sx + j * col_w + col_w // 2
            val_str = _fmt_count(val)
            vw, vh = text_size(draw, val_str, value_font)

            icon_w, icon_gap = 28, 4
            total_w = icon_w + icon_gap + vw
            ix = col_cx - total_w // 2

            if detail_icon_font:
                draw.text((ix, stat_y), stat_icons[key],
                          fill=accent, font=detail_icon_font)
            draw.text((ix + icon_w + icon_gap, stat_y), val_str,
                      fill=fg, font=value_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- mail ---

def render_mail(emails: list[dict], query: str,
                width: int, height: int, bg, fg, accent) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    from_font = find_font(28, bold=True)
    subject_font = find_font(26)
    date_font = find_font(22)
    count_font = find_font(24, bold=True)

    count_str = f"{len(emails)} messages"
    content_y = _draw_header(draw, width, "\uf0e0", "Inbox", bg, fg, accent,
                             right_text=count_str, right_font=count_font)
    max_text_w = width - PAD * 2 - 16

    if not emails:
        _draw_empty_state(draw, width, height, "\uf0e0", "No messages", bg, fg)
    else:
        available = height - content_y - PAD
        row_h = min(76, available // len(emails))

        for i, email in enumerate(emails):
            y = content_y + i * row_h
            draw.ellipse([PAD + 4, y + 8, PAD + 14, y + 18], fill=accent)

            sender = email["from"]
            if "<" in sender:
                sender = sender.split("<")[0].strip().strip('"')
            while text_size(draw, sender, from_font)[0] > max_text_w * 0.6 and len(sender) > 4:
                sender = sender[:-4] + "…"
            draw.text((PAD + 24, y), sender, fill=fg, font=from_font)

            date_str = email["date"]
            dw, _ = text_size(draw, date_str, date_font)
            draw.text((width - PAD - dw, y + 4), date_str,
                      fill=lerp_color(fg, bg, DIM), font=date_font)

            subject = email["subject"]
            while text_size(draw, subject, subject_font)[0] > max_text_w - 20 and len(subject) > 4:
                subject = subject[:-4] + "…"
            draw.text((PAD + 24, y + 32), subject,
                      fill=lerp_color(fg, bg, MUTED), font=subject_font)

            if i < len(emails) - 1:
                draw.line([PAD + 24, y + row_h - 4, width - PAD, y + row_h - 4],
                          fill=lerp_color(bg, fg, 0.05), width=1)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- calendar ---

def render_calendar(events: list[dict], width: int, height: int,
                    bg, fg, accent) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    event_font = find_font(30, bold=True)
    time_font = find_font(24)
    detail_font = find_font(22)
    detail_icon_font = find_nerd_font(20)

    now = datetime.now()
    content_y = _draw_header(draw, width, "\uf073",
                             now.strftime("%A, %B %-d"), bg, fg, accent)
    max_text_w = width - PAD * 2 - 16

    if not events:
        _draw_empty_state(draw, width, height, "\uf274", "No events today", bg, fg)
    else:
        available = height - content_y - PAD
        row_h = min(78, available // len(events))

        for i, event in enumerate(events):
            y = content_y + i * row_h
            color = _palette()[i % len(_palette())]

            draw.rounded_rectangle([PAD, y + 4, PAD + 6, y + row_h - 8],
                                   radius=3, fill=color)

            summary = event["summary"]
            while text_size(draw, summary, event_font)[0] > max_text_w - 20 and len(summary) > 4:
                summary = summary[:-4] + "…"
            draw.text((PAD + 20, y + 2), summary, fill=fg, font=event_font)

            detail_y = y + 34
            time_color = lerp_color(fg, bg, MUTED)
            if detail_icon_font:
                draw.text((PAD + 20, detail_y), "\uf017",
                          fill=time_color, font=detail_icon_font)
            draw.text((PAD + 44, detail_y), event["time"],
                      fill=time_color, font=time_font)

            if event.get("location"):
                loc = event["location"]
                tw, _ = text_size(draw, event["time"], time_font)
                loc_x = PAD + 44 + tw + 24
                max_loc_w = width - PAD - loc_x
                while text_size(draw, loc, detail_font)[0] > max_loc_w and len(loc) > 4:
                    loc = loc[:-4] + "…"
                if detail_icon_font:
                    draw.text((loc_x, detail_y), "\uf124",
                              fill=time_color, font=detail_icon_font)
                draw.text((loc_x + 22, detail_y), loc,
                          fill=time_color, font=detail_font)

            if event.get("attendees", 0) > 0:
                att_str = f"{event['attendees']}"
                aw, _ = text_size(draw, att_str, detail_font)
                ax = width - PAD - aw
                if detail_icon_font:
                    draw.text((ax - 22, detail_y), "\uf007",
                              fill=time_color, font=detail_icon_font)
                draw.text((ax, detail_y), att_str,
                          fill=time_color, font=detail_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- tasks ---


def render_tasks(tasks: list[dict], title: str,
                 width: int, height: int, bg, fg, accent) -> bytes:
    """Render a tasks widget.

    Each task: {"title": str, "due": str?, "notes": str?, "status": str?}
    status is "needsAction" or "completed".
    """
    img, draw = _new_canvas(width, height, bg)

    task_font = find_font(28, bold=True)
    due_font = find_font(22)
    notes_font = find_font(22)
    icon_font = find_nerd_font(26)
    check_font = find_nerd_font(28)

    header_title = title or "Tasks"
    content_y = _draw_header(draw, width, "\uf0ae", header_title, bg, fg, accent)
    max_text_w = width - PAD * 2 - 50

    if not tasks:
        _draw_empty_state(draw, width, height, "\uf058", "No tasks", bg, fg)
        return img_to_webp(img)

    has_notes = any(t.get("notes") for t in tasks)
    row_h = 68 if has_notes else 52
    max_items = (height - content_y - PAD - 20) // row_h

    now = datetime.now()
    muted = lerp_color(fg, bg, MUTED)
    dim = lerp_color(fg, bg, DIM)

    for i, task in enumerate(tasks[:max_items]):
        y = content_y + i * row_h
        completed = task.get("status") == "completed"

        # checkbox icon
        check_x = PAD
        if check_font:
            icon = "\uf058" if completed else "\uf111"
            check_color = lerp_color(fg, bg, 0.5) if completed else accent
            draw.text((check_x, y + 2), icon, fill=check_color, font=check_font)
        text_x = check_x + 40

        # due date on right
        due = task.get("due", "")
        due_x_end = width - PAD
        due_display = ""
        overdue = False
        if due:
            try:
                due_dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
                delta = (due_dt.date() - now.date()).days
                if delta < 0:
                    due_display = f"{abs(delta)}d overdue"
                    overdue = True
                elif delta == 0:
                    due_display = "Today"
                elif delta == 1:
                    due_display = "Tomorrow"
                elif delta < 7:
                    due_display = due_dt.strftime("%A")
                else:
                    due_display = due_dt.strftime("%b %-d")
            except (ValueError, TypeError):
                due_display = due

        if due_display:
            dw, _ = text_size(draw, due_display, due_font)
            due_color = parse_color("base08") if overdue else muted
            draw.text((due_x_end - dw, y + 4), due_display,
                      fill=due_color, font=due_font)
            avail_w = due_x_end - dw - text_x - 16
        else:
            avail_w = due_x_end - text_x - 8

        # title
        txt = task["title"]
        title_color = dim if completed else fg
        while text_size(draw, txt, task_font)[0] > avail_w and len(txt) > 4:
            txt = txt[:-4] + "…"
        draw.text((text_x, y), txt, fill=title_color, font=task_font)

        # strikethrough for completed
        if completed:
            tw, th = text_size(draw, txt, task_font)
            strike_y = y + th // 2 + 2
            draw.line([text_x, strike_y, text_x + tw, strike_y],
                      fill=dim, width=2)

        # notes
        if task.get("notes") and not completed:
            note = task["notes"].replace("\n", " ")
            while text_size(draw, note, notes_font)[0] > avail_w and len(note) > 4:
                note = note[:-4] + "…"
            draw.text((text_x, y + 32), note, fill=muted, font=notes_font)

        # separator
        if i < min(len(tasks), max_items) - 1:
            sep_y = y + row_h - 4
            draw.line([text_x, sep_y, width - PAD, sep_y],
                      fill=lerp_color(bg, fg, SEP), width=1)

    shown = min(len(tasks), max_items)
    if len(tasks) > shown:
        count_font = find_font(20)
        count_str = f"{shown}/{len(tasks)} tasks"
        cw, _ = text_size(draw, count_str, count_font)
        draw.text((width - PAD - cw, height - PAD + 4), count_str,
                  fill=dim, font=count_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- progress ---

def parse_progress_spec(spec: str) -> dict:
    """Parse 'label:value:max[:color]' or 'label:pct%[:color]'."""
    parts = spec.split(":")
    label = parts[0] if len(parts) > 0 else ""
    value_str = parts[1] if len(parts) > 1 else "0"
    max_or_color = parts[2] if len(parts) > 2 else ""
    color_str = parts[3] if len(parts) > 3 else ""

    if value_str.endswith("%"):
        pct = float(value_str.rstrip("%"))
        display = f"{int(pct)}%"
        if max_or_color and not color_str:
            color_str = max_or_color
            max_or_color = ""
    elif max_or_color and max_or_color.replace(".", "", 1).isdigit():
        cur, mx = float(value_str), float(max_or_color)
        pct = (cur / mx * 100) if mx > 0 else 0
        display = f"{value_str}/{max_or_color}"
    else:
        pct = float(value_str)
        display = f"{int(pct)}%"
        if max_or_color and not color_str:
            color_str = max_or_color

    return {
        "label": label, "pct": min(100, max(0, pct)),
        "display": display,
        "color": parse_color(color_str) if color_str else None,
    }


def render_progress(items: list[dict], style: str, title: str,
                    width: int, height: int, bg, fg, accent) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    if title:
        content_y = _draw_header(draw, width, "\uf080", title, bg, fg, accent)
    else:
        _draw_accent_bar(draw, width, accent)
        content_y = PAD

    if style == "circle":
        _draw_progress_circles(draw, items, content_y, width, height, bg, fg)
    else:
        _draw_progress_bars(draw, items, content_y, width, height, bg, fg)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


def _draw_progress_bars(draw, items, start_y, width, height, bg, fg):
    label_font = find_font(28, bold=True)
    value_font = find_font(26)

    n = len(items)
    available = height - start_y - PAD
    row_h = min(100, available // max(n, 1))
    bar_h = 20
    bar_radius = bar_h // 2

    for i, item in enumerate(items):
        color = item["color"] or _palette()[i % len(_palette())]
        y = start_y + i * row_h

        draw.text((PAD, y), item["label"], fill=fg, font=label_font)

        display = item["display"]
        dw, _ = text_size(draw, display, value_font)
        draw.text((width - PAD - dw, y), display,
                  fill=lerp_color(fg, bg, MUTED), font=value_font)

        bar_y = y + 40
        bar_x0 = PAD
        bar_x1 = width - PAD
        bar_w = bar_x1 - bar_x0

        draw.rounded_rectangle([bar_x0, bar_y, bar_x1, bar_y + bar_h],
                               radius=bar_radius,
                               fill=lerp_color(bg, fg, TRACK))

        fill_w = int(bar_w * item["pct"] / 100)
        if fill_w > bar_radius * 2:
            draw.rounded_rectangle([bar_x0, bar_y, bar_x0 + fill_w, bar_y + bar_h],
                                   radius=bar_radius, fill=color)
        elif fill_w > 0:
            draw.ellipse([bar_x0, bar_y, bar_x0 + bar_h, bar_y + bar_h],
                         fill=color)




def _draw_progress_circles(draw, items, start_y, width, height, bg, fg):
    n = len(items)
    available_h = height - start_y - PAD

    if n == 1:
        radius = min(220, available_h // 2 - 30)
        positions = [(width // 2, start_y + available_h // 2)]
        vf, lf = 56, 28
    elif n == 2:
        radius = min(150, available_h // 2 - 20)
        positions = [(width // 4, start_y + available_h // 2),
                     (3 * width // 4, start_y + available_h // 2)]
        vf, lf = 40, 24
    elif n <= 4:
        radius = min(110, available_h // 4 - 10)
        half_h = available_h // 2
        positions = [(width // 4, start_y + half_h // 2),
                     (3 * width // 4, start_y + half_h // 2),
                     (width // 4, start_y + half_h + half_h // 2),
                     (3 * width // 4, start_y + half_h + half_h // 2)]
        vf, lf = 32, 20
    else:
        radius = min(80, available_h // 4 - 10)
        cols = 3
        rows = (n + cols - 1) // cols
        row_h = available_h // rows
        col_w = (width - PAD * 2) // cols
        positions = []
        for idx in range(n):
            r, c = divmod(idx, cols)
            positions.append((PAD + col_w // 2 + c * col_w,
                              start_y + row_h // 2 + r * row_h))
        vf, lf = 26, 18

    value_font = find_font(vf, bold=True)
    label_font = find_font(lf)
    ring_w = max(10, radius // 8)
    track_color = lerp_color(bg, fg, TRACK)

    for i, item in enumerate(items[:len(positions)]):
        cx, cy = positions[i]
        color = item["color"] or _palette()[i % len(_palette())]

        draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
                 start=0, end=360, fill=track_color, width=ring_w)

        sweep = 360 * item["pct"] / 100
        if sweep > 0:
            draw.arc([cx - radius, cy - radius, cx + radius, cy + radius],
                     start=-90, end=-90 + sweep, fill=color, width=ring_w)

        display = item["display"]
        vw, vh = text_size(draw, display, value_font)
        draw.text((cx - vw // 2, cy - vh // 2 - lf // 2),
                  display, fill=fg, font=value_font)

        lw, _ = text_size(draw, item["label"], label_font)
        draw.text((cx - lw // 2, cy + vh // 2 - lf // 2 + 4),
                  item["label"], fill=lerp_color(fg, bg, DIM), font=label_font)


# --- table ---

def render_table(headers: list[str], rows: list[list[str]], title: str,
                 width: int, height: int, bg, fg, accent) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    header_font = find_font(26, bold=True)
    cell_font = find_font(24)

    if title:
        content_y = _draw_header(draw, width, "\uf0ce", title, bg, fg, accent)
    else:
        _draw_accent_bar(draw, width, accent)
        content_y = ACCENT_BAR_H + PAD

    n_cols = len(headers) if headers else (len(rows[0]) if rows else 0)
    if n_cols == 0:
        _draw_empty_state(draw, width, height, "\uf0ce", "No data", bg, fg)
        return img_to_webp(img)

    usable_w = width - PAD * 2
    col_w = usable_w // n_cols
    row_h = 44

    # column headers
    if headers:
        for j, h in enumerate(headers):
            x = PAD + j * col_w + 8
            txt = h
            while text_size(draw, txt, header_font)[0] > col_w - 16 and len(txt) > 2:
                txt = txt[:-4] + "…"
            draw.text((x, content_y), txt, fill=accent, font=header_font)
        content_y += row_h
        _draw_sep(draw, content_y - 8, width, bg, fg)

    # rows
    max_rows = (height - content_y - PAD) // row_h
    for i, row in enumerate(rows[:max_rows]):
        y = content_y + i * row_h
        row_bg = lerp_color(bg, fg, CARD_BG) if i % 2 == 0 else bg
        draw.rectangle([PAD, y, width - PAD, y + row_h - 4], fill=row_bg)

        for j, cell in enumerate(row[:n_cols]):
            x = PAD + j * col_w + 8
            txt = str(cell)
            while text_size(draw, txt, cell_font)[0] > col_w - 16 and len(txt) > 2:
                txt = txt[:-4] + "…"
            draw.text((x, y + 8), txt, fill=fg, font=cell_font)

    # row count
    shown = min(len(rows), max_rows)
    if len(rows) > shown:
        count_font = find_font(20)
        count_str = f"{shown}/{len(rows)} rows"
        cw, _ = text_size(draw, count_str, count_font)
        draw.text((width - PAD - cw, height - PAD + 4), count_str,
                  fill=lerp_color(fg, bg, DIM), font=count_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- list ---

def render_list(items: list[dict], title: str,
                width: int, height: int, bg, fg, accent) -> bytes:
    """Render a list widget.

    Each item: {"text": str, "secondary": str?, "icon": str?, "value": str?}
    """
    img, draw = _new_canvas(width, height, bg)

    text_font = find_font(30, bold=True)
    secondary_font = find_font(24)
    value_font = find_font(26, bold=True)
    icon_font = find_nerd_font(28)

    if title:
        content_y = _draw_header(draw, width, "\uf03a", title, bg, fg, accent)
    else:
        _draw_accent_bar(draw, width, accent)
        content_y = ACCENT_BAR_H + PAD

    if not items:
        _draw_empty_state(draw, width, height, "\uf03a", "No items", bg, fg)
        return img_to_webp(img)

    has_secondary = any(item.get("secondary") for item in items)
    row_h = 70 if has_secondary else 50
    max_items = (height - content_y - PAD) // row_h
    max_text_w = width - PAD * 2 - 60  # room for icon + value

    for i, item in enumerate(items[:max_items]):
        y = content_y + i * row_h
        color = _palette()[i % len(_palette())]

        # bullet / icon
        ix = PAD
        icon = item.get("icon")
        if icon and icon_font:
            draw.text((ix, y + 4), icon, fill=color, font=icon_font)
            text_x = ix + 40
        else:
            draw.rounded_rectangle([ix + 4, y + 10, ix + 12, y + 24],
                                   radius=3, fill=color)
            text_x = ix + 24

        # right-side value
        value = item.get("value", "")
        value_x_end = width - PAD
        if value:
            vw, _ = text_size(draw, str(value), value_font)
            draw.text((value_x_end - vw, y + 4), str(value),
                      fill=lerp_color(fg, bg, MUTED), font=value_font)
            max_line_w = value_x_end - vw - text_x - 16
        else:
            max_line_w = value_x_end - text_x - 8

        # primary text
        txt = item["text"]
        while text_size(draw, txt, text_font)[0] > max_line_w and len(txt) > 2:
            txt = txt[:-4] + "…"
        draw.text((text_x, y), txt, fill=fg, font=text_font)

        # secondary text
        secondary = item.get("secondary", "")
        if secondary:
            sec = secondary
            while text_size(draw, sec, secondary_font)[0] > max_line_w and len(sec) > 2:
                sec = sec[:-4] + "…"
            draw.text((text_x, y + 34), sec,
                      fill=lerp_color(fg, bg, MUTED), font=secondary_font)

        # separator
        if i < min(len(items), max_items) - 1:
            sep_y = y + row_h - 4
            draw.line([text_x, sep_y, width - PAD, sep_y],
                      fill=lerp_color(bg, fg, SEP), width=1)

    shown = min(len(items), max_items)
    if len(items) > shown:
        count_font = find_font(20)
        count_str = f"{shown}/{len(items)} items"
        cw, _ = text_size(draw, count_str, count_font)
        draw.text((width - PAD - cw, height - PAD + 4), count_str,
                  fill=lerp_color(fg, bg, DIM), font=count_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- month calendar ---

import calendar as _cal


# --- departures ---

def render_departures(departures: list[dict], station: str,
                      width: int, height: int, bg, fg, accent) -> bytes:
    """Render train departure board.

    Each departure: {"time": str, "destination": str, "line": str?, "delay": int?}
    """
    img, draw = _new_canvas(width, height, bg)

    dest_font = find_font(28, bold=True)
    time_font = find_font(28)
    line_font = find_font(22, bold=True)
    delay_font = find_font(22)

    content_y = _draw_header(draw, width, "\uf238", station or "Departures",
                             bg, fg, accent)

    if not departures:
        _draw_empty_state(draw, width, height, "\uf238", "No departures", bg, fg)
        return img_to_webp(img)

    available = height - content_y - PAD
    row_h = min(70, available // max(len(departures), 1))
    max_rows = available // row_h
    visible = departures[:max_rows]

    # pre-compute widest badge to align all destinations
    max_badge_w = 0
    has_badges = False
    for dep in visible:
        line = dep.get("line", "")
        if line:
            has_badges = True
            bbox = draw.textbbox((0, 0), line, font=line_font)
            w = (bbox[2] - bbox[0]) + 20  # badge pad_x * 2
            max_badge_w = max(max_badge_w, w)

    dest_x = PAD + max_badge_w + PAD if has_badges else PAD

    for i, dep in enumerate(visible):
        y = content_y + i * row_h

        # line badge (right-aligned to dest_x)
        line = dep.get("line", "")
        if line:
            color = _palette()[i % len(_palette())]
            bbox = draw.textbbox((0, 0), line, font=line_font)
            bw = (bbox[2] - bbox[0]) + 20
            badge_x = dest_x - PAD - bw
            _draw_badge(draw, badge_x, y + 2, line, line_font, color, bg)

        # departure time (right-aligned)
        dep_time = dep.get("time", "")
        tw, _ = text_size(draw, dep_time, time_font)
        time_x = width - PAD - tw
        draw.text((time_x, y + 4), dep_time, fill=fg, font=time_font)

        # delay
        delay = dep.get("delay", 0)
        delay_x = time_x
        if delay and delay > 0:
            delay_str = f"+{delay}'"
            dw, _ = text_size(draw, delay_str, delay_font)
            delay_x = time_x - dw - 12
            draw.text((delay_x, y + 8), delay_str,
                      fill=parse_color("base08"), font=delay_font)

        # destination
        dest = dep.get("destination", "")
        max_dest_w = delay_x - dest_x - 12
        while text_size(draw, dest, dest_font)[0] > max_dest_w and len(dest) > 2:
            dest = dest[:-4] + "…"
        draw.text((dest_x, y + 4), dest, fill=fg, font=dest_font)

        # secondary info line
        platform = dep.get("platform", "")
        if platform:
            draw.text((dest_x, y + 36), f"Platform {platform}",
                      fill=lerp_color(fg, bg, MUTED), font=delay_font)

        if i < min(len(departures), max_rows) - 1:
            draw.line([PAD, y + row_h - 4, width - PAD, y + row_h - 4],
                      fill=lerp_color(bg, fg, SEP), width=1)

    shown = min(len(departures), max_rows)
    if len(departures) > shown:
        count_font = find_font(20)
        count_str = f"{shown}/{len(departures)} departures"
        cw, _ = text_size(draw, count_str, count_font)
        draw.text((width - PAD - cw, height - PAD + 4), count_str,
                  fill=lerp_color(fg, bg, DIM), font=count_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- stocks ---

def _draw_sparkline(draw, x, y, w, h, values, color, bg):
    """Draw a mini line chart from a list of floats."""
    if len(values) < 2:
        return
    mn, mx = min(values), max(values)
    span = mx - mn if mx != mn else 1
    points = []
    for i, v in enumerate(values):
        px = x + i * w / (len(values) - 1)
        py = y + h - (v - mn) / span * h
        points.append((px, py))
    draw.line(points, fill=color, width=2)


def render_stocks(tickers: list[dict], width: int, height: int,
                  bg, fg, accent) -> bytes:
    """Render stock/crypto ticker cards.

    Each ticker: {"symbol": str, "price": float, "change_pct": float,
                  "sparkline": list[float]?}
    """
    img, draw = _new_canvas(width, height, bg)

    symbol_font = find_font(26, bold=True)
    price_font = find_font(30, bold=True)
    change_font = find_font(24)
    detail_icon_font = find_nerd_font(22)

    content_y = _draw_header(draw, width, "\uf201", "Market",
                             bg, fg, accent)

    if not tickers:
        _draw_empty_state(draw, width, height, "\uf201", "No data", bg, fg)
        return img_to_webp(img)

    card_pad = PAD // 2
    card_gap = card_pad
    spark_h = 40
    card_h = card_pad + 32 + 8 + spark_h + 8 + 28 + card_pad
    available = height - content_y - PAD
    max_cards = available // (card_h + card_gap)

    green = parse_color("base0b")
    red = parse_color("base08")

    for i, t in enumerate(tickers[:max_cards]):
        y = content_y + i * (card_h + card_gap)
        draw.rounded_rectangle([PAD, y, width - PAD, y + card_h],
                               radius=16, fill=lerp_color(bg, fg, CARD_BG))

        change_pct = t.get("change_pct", 0)
        is_up = change_pct >= 0
        trend_color = green if is_up else red

        # symbol
        draw.text((PAD + card_pad, y + card_pad), t["symbol"],
                  fill=lerp_color(fg, bg, MUTED), font=symbol_font)

        # price (right-aligned on top row)
        price_str = f"${t['price']:,.2f}" if t["price"] >= 1 else f"${t['price']:.4f}"
        pw, _ = text_size(draw, price_str, price_font)
        draw.text((width - PAD - card_pad - pw, y + card_pad),
                  price_str, fill=fg, font=price_font)

        # sparkline
        spark_y = y + card_pad + 32 + 8
        spark_w = width - PAD * 2 - card_pad * 2
        sparkline = t.get("sparkline", [])
        if sparkline:
            _draw_sparkline(draw, PAD + card_pad, spark_y,
                            spark_w, spark_h, sparkline, trend_color, bg)
        else:
            mid_y = spark_y + spark_h // 2
            draw.line([PAD + card_pad, mid_y, PAD + card_pad + spark_w, mid_y],
                      fill=lerp_color(bg, fg, TRACK), width=2)

        # change percentage
        change_y = spark_y + spark_h + 8
        arrow = "\uf062" if is_up else "\uf063"  # up/down arrows
        change_str = f"{'+' if is_up else ''}{change_pct:.2f}%"

        if detail_icon_font:
            draw.text((PAD + card_pad, change_y), arrow,
                      fill=trend_color, font=detail_icon_font)
        draw.text((PAD + card_pad + 28, change_y), change_str,
                  fill=trend_color, font=change_font)

    shown = min(len(tickers), max_cards)
    if len(tickers) > shown:
        count_font = find_font(20)
        count_str = f"{shown}/{len(tickers)} tickers"
        cw, _ = text_size(draw, count_str, count_font)
        draw.text((width - PAD - cw, height - PAD + 4), count_str,
                  fill=lerp_color(fg, bg, DIM), font=count_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- hackernews ---

def render_hackernews(stories: list[dict], width: int, height: int,
                      bg, fg, accent) -> bytes:
    """Render Hacker News top stories.

    Each story: {"title": str, "score": int, "comments": int, "age": str}
    """
    img, draw = _new_canvas(width, height, bg)

    title_font = find_font(26)
    meta_font = find_font(22)
    rank_font = find_font(22, bold=True)
    detail_icon_font = find_nerd_font(20)

    content_y = _draw_header(draw, width, "\uf1d4", "Hacker News",
                             bg, fg, accent)

    if not stories:
        _draw_empty_state(draw, width, height, "\uf1d4", "No stories", bg, fg)
        return img_to_webp(img)

    available = height - content_y - PAD
    row_h = min(64, available // max(len(stories), 1))
    max_rows = available // row_h

    for i, story in enumerate(stories[:max_rows]):
        y = content_y + i * row_h

        # rank number
        rank_str = f"{i + 1}."
        rw, _ = text_size(draw, rank_str, rank_font)
        draw.text((PAD, y + 2), rank_str,
                  fill=lerp_color(fg, bg, DIM), font=rank_font)

        # title
        text_x = PAD + rw + 10
        max_title_w = width - PAD - text_x
        title = story["title"]
        while text_size(draw, title, title_font)[0] > max_title_w and len(title) > 2:
            title = title[:-4] + "…"
        draw.text((text_x, y), title, fill=fg, font=title_font)

        # meta line: score, comments, age
        meta_y = y + 30
        meta_parts = []

        score = story.get("score", 0)
        comments = story.get("comments", 0)
        age = story.get("age", "")

        mx = text_x
        if detail_icon_font:
            draw.text((mx, meta_y + 2), "\uf062",
                      fill=accent, font=detail_icon_font)
            mx += 20
        score_str = str(score)
        draw.text((mx, meta_y), score_str,
                  fill=lerp_color(fg, bg, MUTED), font=meta_font)
        mx += text_size(draw, score_str, meta_font)[0] + 16

        if detail_icon_font:
            draw.text((mx, meta_y + 2), "\uf075",
                      fill=lerp_color(fg, bg, DIM), font=detail_icon_font)
            mx += 20
        comment_str = str(comments)
        draw.text((mx, meta_y), comment_str,
                  fill=lerp_color(fg, bg, MUTED), font=meta_font)
        mx += text_size(draw, comment_str, meta_font)[0] + 16

        if age:
            draw.text((mx, meta_y), age,
                      fill=lerp_color(fg, bg, DIM), font=meta_font)

        if i < min(len(stories), max_rows) - 1:
            draw.line([text_x, y + row_h - 4, width - PAD, y + row_h - 4],
                      fill=lerp_color(bg, fg, SEP), width=1)

    shown = min(len(stories), max_rows)
    if len(stories) > shown:
        count_font = find_font(20)
        count_str = f"{shown}/{len(stories)} stories"
        cw, _ = text_size(draw, count_str, count_font)
        draw.text((width - PAD - cw, height - PAD + 4), count_str,
                  fill=lerp_color(fg, bg, DIM), font=count_font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- monitor ---

def render_monitor(sites: list[dict], width: int, height: int,
                   bg, fg, accent) -> bytes:
    """Render site uptime monitor.

    Each site: {"title": str, "url": str, "up": bool, "status": int,
                "response_ms": int}
    """
    img, draw = _new_canvas(width, height, bg)

    title_font = find_font(28, bold=True)
    url_font = find_font(22)
    status_font = find_font(24)
    detail_icon_font = find_nerd_font(24)

    up_count = sum(1 for s in sites if s.get("up"))
    header_right = f"{up_count}/{len(sites)} up"
    content_y = _draw_header(draw, width, "\uf21b", "Monitor",
                             bg, fg, accent,
                             right_text=header_right, right_font=status_font)

    if not sites:
        _draw_empty_state(draw, width, height, "\uf21b", "No sites", bg, fg)
        return img_to_webp(img)

    green = parse_color("base0b")
    red = parse_color("base08")

    available = height - content_y - PAD
    row_h = min(80, available // max(len(sites), 1))
    max_rows = available // row_h

    for i, site in enumerate(sites[:max_rows]):
        y = content_y + i * row_h
        is_up = site.get("up", False)
        dot_color = green if is_up else red

        # status dot
        dot_r = 8
        dot_cx = PAD + dot_r
        dot_cy = y + 16
        draw.ellipse([dot_cx - dot_r, dot_cy - dot_r,
                      dot_cx + dot_r, dot_cy + dot_r], fill=dot_color)

        # title
        text_x = PAD + dot_r * 2 + 16
        draw.text((text_x, y + 2), site["title"], fill=fg, font=title_font)

        # response time (right-aligned)
        if is_up:
            ms = site.get("response_ms", 0)
            ms_str = f"{ms}ms"
            mw, _ = text_size(draw, ms_str, status_font)
            ms_color = green if ms < 500 else parse_color("base0a") if ms < 1000 else red
            draw.text((width - PAD - mw, y + 4), ms_str,
                      fill=ms_color, font=status_font)
        else:
            down_str = "DOWN"
            dw, _ = text_size(draw, down_str, status_font)
            draw.text((width - PAD - dw, y + 4), down_str,
                      fill=red, font=status_font)

        # url
        url = site.get("url", "")
        # strip protocol for display
        display_url = url.replace("https://", "").replace("http://", "").rstrip("/")
        max_url_w = width - PAD - text_x - 8
        while text_size(draw, display_url, url_font)[0] > max_url_w and len(display_url) > 2:
            display_url = display_url[:-4] + "…"
        draw.text((text_x, y + 36), display_url,
                  fill=lerp_color(fg, bg, MUTED), font=url_font)

        if i < min(len(sites), max_rows) - 1:
            draw.line([text_x, y + row_h - 4, width - PAD, y + row_h - 4],
                      fill=lerp_color(bg, fg, SEP), width=1)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)


# --- month calendar ---

def render_month_calendar(year: int, month: int, highlights: list[int],
                          width: int, height: int, bg, fg, accent) -> bytes:
    """Render a month-grid calendar. highlights = list of day numbers to mark."""
    img, draw = _new_canvas(width, height, bg)

    now = datetime.now()
    today = now.day if (year == now.year and month == now.month) else -1

    month_name = _cal.month_name[month]
    title = f"{month_name} {year}"
    content_y = _draw_header(draw, width, "\uf073", title, bg, fg, accent)

    day_font = find_font(26, bold=True)
    num_font = find_font(28)
    num_bold = find_font(28, bold=True)

    usable_w = width - PAD * 2
    usable_h = height - content_y - PAD
    col_w = usable_w // 7
    row_h = min(usable_h // 7, 80)  # 1 header row + up to 6 week rows

    # day-of-week header (Mon..Sun)
    day_names = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
    for j, dn in enumerate(day_names):
        dw, _ = text_size(draw, dn, day_font)
        cx = PAD + j * col_w + col_w // 2
        color = accent if j >= 5 else lerp_color(fg, bg, DIM)
        draw.text((cx - dw // 2, content_y), dn, fill=color, font=day_font)

    grid_y = content_y + row_h
    _draw_sep(draw, grid_y - 6, width, bg, fg)

    # calendar grid
    cal = _cal.monthcalendar(year, month)
    cell_r = min(col_w, row_h) // 2 - 4

    for r, week in enumerate(cal):
        for c, day in enumerate(week):
            if day == 0:
                continue
            cx = PAD + c * col_w + col_w // 2
            cy = grid_y + r * row_h + row_h // 2

            is_today = day == today
            is_highlight = day in highlights
            is_weekend = c >= 5

            if is_today:
                draw.ellipse([cx - cell_r, cy - cell_r, cx + cell_r, cy + cell_r],
                             fill=accent)
                font = num_bold
                color = bg
            elif is_highlight:
                draw.ellipse([cx - cell_r, cy - cell_r, cx + cell_r, cy + cell_r],
                             outline=accent, width=2)
                font = num_bold
                color = fg
            else:
                font = num_font
                color = lerp_color(fg, bg, MUTED) if is_weekend else fg

            day_str = str(day)
            bbox = draw.textbbox((0, 0), day_str, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((cx - tw // 2 - bbox[0], cy - th // 2 - bbox[1]),
                      day_str, fill=color, font=font)

    _draw_timestamp(draw, width, height, bg, fg)

    return img_to_webp(img)
