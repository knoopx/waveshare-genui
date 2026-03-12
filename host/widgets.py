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
        icon_font = find_nerd_font(36)
    if title_font is None:
        title_font = find_font(40, bold=True)

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
    tw, _ = text_size(draw, ts, font)
    draw.text((width - PAD - tw, height - PAD + 8), ts,
              fill=lerp_color(fg, bg, DIM), font=font)


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

    return img_to_webp(img)


# --- notify ---

def render_notify(title: str, body: str, icon: str,
                  width: int, height: int, bg, accent, fg) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    title_font = find_font(52, bold=True)
    body_font = find_font(34)
    icon_font = find_nerd_font(52) or find_font(52, bold=True)

    _draw_accent_bar(draw, width, accent)

    title_y = ACCENT_BAR_H + PAD
    icon_gap = 20

    ibbox = draw.textbbox((0, 0), icon, font=icon_font)
    iw = ibbox[2] - ibbox[0]
    ih = ibbox[3] - ibbox[1]

    tbbox = draw.textbbox((0, 0), title, font=title_font)
    th = tbbox[3] - tbbox[1]
    row_h = max(ih, th)

    first_line_max = width - PAD * 2 - iw - icon_gap
    rest_max = width - PAD * 2
    title_lines = []
    words = title.split()
    if words:
        line = words[0]
        on_first = True
        max_w = first_line_max
        for word in words[1:]:
            test = line + " " + word
            bbox = draw.textbbox((0, 0), test, font=title_font)
            if bbox[2] - bbox[0] <= max_w:
                line = test
            else:
                title_lines.append(line)
                line = word
                if on_first:
                    on_first = False
                    max_w = rest_max
        title_lines.append(line)

    icon_draw_y = title_y + (row_h - ih) // 2 - ibbox[1]
    draw.text((PAD, icon_draw_y), icon, fill=accent, font=icon_font)

    cur_y = title_y + (row_h - th) // 2
    for i, line in enumerate(title_lines):
        x = PAD + iw + icon_gap if i == 0 else PAD
        bbox = draw.textbbox((0, 0), line, font=title_font)
        draw.text((x, cur_y), line, fill=fg, font=title_font)
        cur_y += bbox[3] - bbox[1] + 8

    sep_y = cur_y + 24
    _draw_sep(draw, sep_y, width, bg, fg)

    body_y = sep_y + 28
    body_fg = lerp_color(fg, bg, MUTED)
    if body:
        body_lines = word_wrap(draw, body, body_font, width - PAD * 2)
        for line in body_lines:
            bbox = draw.textbbox((0, 0), line or " ", font=body_font)
            draw.text((PAD, body_y), line, fill=body_fg, font=body_font)
            body_y += bbox[3] - bbox[1] + 12

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

    _draw_accent_bar(draw, width, accent)

    loc_y = 32
    if detail_icon_font:
        draw.text((PAD, loc_y), "\uf124", fill=accent, font=detail_icon_font)
    draw.text((PAD + 36, loc_y), location,
              fill=lerp_color(fg, bg, MUTED), font=label_font)

    row_y = 100
    icon_char = WEATHER_ICONS.get(code, "\ue302")
    if icon_font:
        draw.text((PAD, row_y), icon_char, fill=accent, font=icon_font)
    draw.text((PAD + 140, row_y - 10), f"{temp}{unit_sym}", fill=fg, font=temp_font)

    desc_y = row_y + 130
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

    icon_font = find_nerd_font(32)
    title_font = find_font(36, bold=True)
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
                 icon_font=icon_font, title_font=title_font,
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

    if label:
        lw, _ = text_size(draw, label, label_font)
        draw.text((cx - lw // 2, cy + th // 2 - 10), label, fill=accent, font=label_font)

    pct_str = f"{int(pct * 100)}%"
    pw, _ = text_size(draw, pct_str, sub_font)
    draw.text((cx - pw // 2, cy + th // 2 + 34), pct_str,
              fill=lerp_color(fg, bg, DIM), font=sub_font)

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

    for frac in [0, 0.25, 0.5, 0.75, 1.0]:
        angle = math.radians(-225 + 270 * frac)
        r1, r2 = radius + 8, radius + 18
        x1, y1 = cx + r1 * math.cos(angle), cy + r1 * math.sin(angle)
        x2, y2 = cx + r2 * math.cos(angle), cy + r2 * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=lerp_color(bg, fg, 0.15), width=2)

    vw, vh = text_size(draw, display, value_font)
    draw.text((cx - vw // 2, cy - vh // 2 - 12), display, fill=fg, font=value_font)

    uw, _ = text_size(draw, unit, unit_font)
    draw.text((cx - uw // 2, cy + vh // 2 + 2), unit,
              fill=lerp_color(fg, bg, MUTED), font=unit_font)

    lw, _ = text_size(draw, label, label_font)
    draw.text((cx - lw // 2, cy + radius + 16), label,
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

    return img_to_webp(img)


# --- qrcode ---

def render_qrcode(data: str, label: str, width: int, height: int,
                  bg, fg, accent) -> bytes:
    import qrcode

    img, draw = _new_canvas(width, height, bg)

    label_font = find_font(32, bold=True)
    data_font = find_font(22)

    content_y = _draw_header(draw, width, "\uf029", label or "Scan QR Code",
                             bg, fg, accent, title_font=label_font)

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                        box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    qr_area = min(width - PAD * 2, height - 180)
    qr_img = qr_img.resize((qr_area, qr_area), Image.NEAREST)
    qr_x = (width - qr_area) // 2
    qr_y = 90
    qr_pad = 16

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

    return img_to_webp(img)


# --- github ---

def _fmt_count(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}k"
    return str(n)


LANG_COLORS = {
    "Python": parse_color("base0d"), "JavaScript": parse_color("base0a"),
    "TypeScript": parse_color("base0d"), "Rust": parse_color("base09"),
    "Go": parse_color("base0c"), "Java": parse_color("base09"),
    "C": parse_color("base04"), "C++": parse_color("base08"),
    "Ruby": parse_color("base08"), "Shell": parse_color("base0b"),
}


def render_github(repos: list[dict], width: int, height: int,
                  bg, fg, accent) -> bytes:
    img, draw = _new_canvas(width, height, bg)

    repo_font = find_font(32, bold=True)
    value_font = find_font(28, bold=True)
    label_font = find_font(20)
    lang_font = find_font(24)
    detail_icon_font = find_nerd_font(26)

    content_y = _draw_header(draw, width, "\uf09b", "GitHub Stats",
                             bg, fg, accent)

    card_y = content_y + 6
    card_h = min(160, (height - card_y - PAD) // max(len(repos), 1))

    stat_icons = {
        "stars": "\uf005", "forks": "\uf126",
        "issues": "\uf06a", "watchers": "\uf06e",
    }

    for i, repo in enumerate(repos):
        y = card_y + i * card_h
        draw.rounded_rectangle([PAD, y, width - PAD, y + card_h - 12],
                               radius=16, fill=lerp_color(bg, fg, CARD_BG))

        draw.text((PAD + 20, y + 14), repo["full_name"], fill=fg, font=repo_font)

        lang = repo.get("language") or ""
        if lang:
            lc = LANG_COLORS.get(lang, lerp_color(fg, bg, MUTED))
            lx = width - PAD - 20
            lw, _ = text_size(draw, lang, lang_font)
            draw.ellipse([lx - lw - 20, y + 18, lx - lw - 8, y + 30], fill=lc)
            draw.text((lx - lw, y + 16), lang,
                      fill=lerp_color(fg, bg, MUTED), font=lang_font)

        stats = [
            ("stars", repo["stargazers_count"]),
            ("forks", repo["forks_count"]),
            ("issues", repo["open_issues_count"]),
            ("watchers", repo["subscribers_count"]),
        ]
        sx = PAD + 20
        stat_y = y + 56
        col_w = (width - PAD * 2 - 40) // 4

        for j, (key, val) in enumerate(stats):
            col_cx = sx + j * col_w + col_w // 2
            val_str = _fmt_count(val)
            vw, vh = text_size(draw, val_str, value_font)
            lw, _ = text_size(draw, key, label_font)

            icon_w, icon_gap = 28, 4
            total_w = icon_w + icon_gap + vw
            ix = col_cx - total_w // 2

            if detail_icon_font:
                draw.text((ix, stat_y + 2), stat_icons[key],
                          fill=accent, font=detail_icon_font)
            draw.text((ix + icon_w + icon_gap, stat_y), val_str,
                      fill=fg, font=value_font)
            draw.text((col_cx - lw // 2, stat_y + vh + 6), key,
                      fill=lerp_color(fg, bg, DIM), font=label_font)

        desc = repo.get("description") or ""
        if desc and card_h > 120:
            desc_y = stat_y + 66
            max_w = width - PAD * 2 - 40
            while text_size(draw, desc, lang_font)[0] > max_w and len(desc) > 8:
                desc = desc[:-4] + "…"
            draw.text((PAD + 20, desc_y), desc,
                      fill=lerp_color(fg, bg, DIM), font=lang_font)

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

    return img_to_webp(img)


def _draw_progress_bars(draw, items, start_y, width, height, bg, fg):
    label_font = find_font(28, bold=True)
    value_font = find_font(26)
    pct_font = find_font(24)

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

        pct_str = f"{int(item['pct'])}%"
        pw, _ = text_size(draw, pct_str, pct_font)
        pct_x = bar_x0 + fill_w + 8
        if pct_x + pw > bar_x1:
            pct_x = bar_x0 + fill_w - pw - 8
            pct_color = fg if item["pct"] > 20 else lerp_color(fg, bg, DIM)
        else:
            pct_color = lerp_color(fg, bg, DIM)
        draw.text((pct_x, bar_y - 1), pct_str, fill=pct_color, font=pct_font)


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
