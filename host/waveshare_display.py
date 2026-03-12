#!/usr/bin/env python3
"""
Waveshare Display — unified CLI.

Usage:
    waveshare-display image photo.jpg
    waveshare-display message "Hello World" --size 80
    waveshare-display clock --24h
    waveshare-display notify "Title" "Body" --icon $'\\uf058' --accent green
    waveshare-display weather --location Barcelona
    waveshare-display sysmon
    waveshare-display nowplaying
    waveshare-display mail
    waveshare-display calendar
    waveshare-display github torvalds/linux facebook/react
    waveshare-display timer --remaining 90 --total 120 --label Deploy
    waveshare-display gauge -g "CPU:73:%" -g "RAM:4/8:GB"
    waveshare-display qrcode "https://..." --label Title
    waveshare-display -p /dev/ttyACM1 clock  # custom port
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

from PIL import Image

from display import (DISPLAY_H, DISPLAY_W, connect, load_theme, parse_color,
                     send_frame)
from widgets import (
    parse_gauge_spec, parse_progress_spec, render_calendar, render_clock,
    render_gauges, render_github, render_image, render_mail, render_message,
    render_notify, render_nowplaying, render_progress, render_qrcode,
    render_sysmon, render_test_pattern, render_timer, render_weather,
)


def common_args(parser):
    parser.add_argument("--fg", default="base05", help="Foreground color")
    parser.add_argument("--bg", default="base00", help="Background color")
    parser.add_argument("--accent", default="base0A", help="Accent color")


def resolve_colors(args):
    return parse_color(args.fg), parse_color(args.bg), parse_color(args.accent)


def result(ser, data, info=""):
    ok = send_frame(ser, data)
    label = f"{info}: " if info else ""
    print(f"{label}{'OK' if ok else 'FAIL'} ({len(data) // 1024} KB)")
    ser.close()


# --- subcommands ---

def cmd_image(args):
    ser = connect(args.port)
    w, h = args.width, args.height

    if args.test:
        data = render_test_pattern(w, h)
        result(ser, data, f"test {w}×{h}")
        return

    if not args.source:
        print("Provide an image/directory path or --test", file=sys.stderr)
        sys.exit(1)

    source = Path(args.source)

    if source.is_file():
        data = render_image(Image.open(source), w, h)
        t0 = time.monotonic()
        ok = send_frame(ser, data)
        dt = time.monotonic() - t0
        print(f"{source.name}: {'OK' if ok else 'FAIL'} ({len(data)/1024:.0f} KB, {dt:.2f}s)")
        ser.close()
    elif source.is_dir():
        exts = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"}
        files = sorted(f for f in source.iterdir() if f.suffix.lower() in exts)
        if not files:
            print(f"No image files in {source}", file=sys.stderr)
            sys.exit(1)
        interval = 1.0 / args.fps if args.fps > 0 else 0
        for i, f in enumerate(files):
            t0 = time.monotonic()
            data = render_image(Image.open(f), w, h)
            ok = send_frame(ser, data)
            dt = time.monotonic() - t0
            fps = 1.0 / dt if dt > 0 else 0
            print(f"[{i+1}/{len(files)}] {f.name}: {'OK' if ok else 'FAIL'} ({len(data)/1024:.0f} KB, {fps:.1f} FPS)")
            if interval > dt:
                time.sleep(interval - dt)
        ser.close()
    else:
        print(f"Not found: {source}", file=sys.stderr)
        sys.exit(1)


def cmd_message(args):
    if args.stdin:
        text = sys.stdin.read().strip()
    elif args.text:
        text = args.text
    else:
        print("Provide text or --stdin", file=sys.stderr)
        sys.exit(1)

    fg, bg, _ = resolve_colors(args)
    data = render_message(text, args.width, args.height, fg, bg,
                          args.size, args.align, args.padding)
    result(connect(args.port), data)


def cmd_notify(args):
    fg, bg, accent = resolve_colors(args)
    body = args.body.replace("\\n", "\n") if args.body else ""
    data = render_notify(args.title, body, args.icon,
                         DISPLAY_W, DISPLAY_H, bg, accent, fg)
    result(connect(args.port), data)


def cmd_clock(args):
    fg, bg, accent = resolve_colors(args)
    data = render_clock(datetime.now(), DISPLAY_W, DISPLAY_H,
                        bg, fg, accent, args.use_24h)
    result(connect(args.port), data)


def cmd_weather(args):
    import urllib.request
    loc = args.location or ""
    url = f"https://wttr.in/{loc}?format=j1"
    req = urllib.request.Request(url, headers={"User-Agent": "waveshare-display"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        weather_data = json.loads(resp.read())

    fg, bg, accent = resolve_colors(args)
    data = render_weather(weather_data, DISPLAY_W, DISPLAY_H,
                          bg, fg, accent, args.units)
    loc_name = (weather_data.get("nearest_area", [{}])[0]
                .get("areaName", [{}])[0].get("value", "?"))
    result(connect(args.port), data, loc_name)


def cmd_sysmon(args):
    fg, bg, accent = resolve_colors(args)
    data = render_sysmon(DISPLAY_W, DISPLAY_H, bg, fg, accent)
    result(connect(args.port), data)


def cmd_nowplaying(args):
    def playerctl(prop):
        try:
            return subprocess.check_output(
                ["playerctl", prop], stderr=subprocess.DEVNULL, timeout=2,
            ).decode().strip()
        except (subprocess.SubprocessError, FileNotFoundError):
            return ""

    fg, bg, accent = resolve_colors(args)
    title = playerctl("metadata title")
    artist = playerctl("metadata artist")
    album = playerctl("metadata album")
    status = playerctl("status")
    art_url = playerctl("metadata mpris:artUrl")

    data = render_nowplaying(title, artist, album, status, art_url,
                             DISPLAY_W, DISPLAY_H, bg, fg, accent)
    info = f"{artist} — {title}" if artist else title or "Nothing playing"
    result(connect(args.port), data, info)


def cmd_mail(args):
    def gog_json(gog_args):
        try:
            out = subprocess.check_output(
                ["gog"] + gog_args + ["-j", "--results-only", "--no-input"],
                stderr=subprocess.DEVNULL, timeout=15)
            return json.loads(out)
        except (subprocess.SubprocessError, json.JSONDecodeError):
            return []

    threads = gog_json(["gmail", "search", args.query])
    emails = [{"from": t.get("from", ""), "subject": t.get("subject", ""),
               "date": t.get("date", "")} for t in threads[:8]]

    fg, bg, accent = resolve_colors(args)
    data = render_mail(emails, args.query, DISPLAY_W, DISPLAY_H, bg, fg, accent)
    result(connect(args.port), data, f"{len(emails)} emails")


def cmd_calendar(args):
    def gog_json(gog_args):
        try:
            out = subprocess.check_output(
                ["gog"] + gog_args + ["-j", "--results-only", "--no-input"],
                stderr=subprocess.DEVNULL, timeout=15)
            return json.loads(out)
        except (subprocess.SubprocessError, json.JSONDecodeError):
            return []

    raw = gog_json(["calendar", "events"])
    events = []
    for e in raw[:8]:
        start = e.get("start", {})
        end = e.get("end", {})
        all_day = False

        if "dateTime" in start:
            try:
                start_str = datetime.fromisoformat(start["dateTime"]).strftime("%H:%M")
            except (ValueError, TypeError):
                start_str = ""
        elif "date" in start:
            all_day = True
            start_str = "All day"
        else:
            start_str = ""

        end_str = ""
        if "dateTime" in end:
            try:
                end_str = datetime.fromisoformat(end["dateTime"]).strftime("%H:%M")
            except (ValueError, TypeError):
                pass

        time_str = f"{start_str} – {end_str}" if end_str and not all_day else start_str

        events.append({
            "summary": e.get("summary", "(No title)"),
            "time": time_str,
            "all_day": all_day,
            "location": e.get("location", ""),
            "attendees": len(e.get("attendees", [])),
        })

    fg, bg, accent = resolve_colors(args)
    data = render_calendar(events, DISPLAY_W, DISPLAY_H, bg, fg, accent)
    result(connect(args.port), data, f"{len(events)} events")


def cmd_github(args):
    import urllib.request

    repos = []
    for r in args.repos[:4]:
        try:
            url = f"https://api.github.com/repos/{r}"
            req = urllib.request.Request(url, headers={
                "User-Agent": "waveshare-display",
                "Accept": "application/vnd.github.v3+json",
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                repos.append(json.loads(resp.read()))
        except Exception as e:
            print(f"Error fetching {r}: {e}", file=sys.stderr)

    if not repos:
        print("No repos fetched", file=sys.stderr)
        sys.exit(1)

    fg, bg, accent = resolve_colors(args)
    data = render_github(repos, DISPLAY_W, DISPLAY_H, bg, fg, accent)
    names = ", ".join(r["full_name"] for r in repos)
    result(connect(args.port), data, names)


def cmd_timer(args):
    fg, bg, accent = resolve_colors(args)
    data = render_timer(args.remaining, args.total, args.label,
                        DISPLAY_W, DISPLAY_H, bg, fg, accent)
    m, s = divmod(args.remaining, 60)
    result(connect(args.port), data, f"{m:02d}:{s:02d}")


def cmd_gauge(args):
    fg, bg, accent = resolve_colors(args)
    gauges = [parse_gauge_spec(s) for s in args.gauge[:4]]
    data = render_gauges(gauges, DISPLAY_W, DISPLAY_H, bg, fg, accent)
    labels = ", ".join(g["label"] for g in gauges)
    result(connect(args.port), data, labels)


def cmd_qrcode(args):
    if args.stdin:
        data_str = sys.stdin.read().strip()
    elif args.data:
        data_str = args.data
    else:
        print("Provide data or --stdin", file=sys.stderr)
        sys.exit(1)

    fg, bg, accent = resolve_colors(args)
    data = render_qrcode(data_str, args.label, DISPLAY_W, DISPLAY_H, bg, fg, accent)
    result(connect(args.port), data)


def cmd_progress(args):
    fg, bg, accent = resolve_colors(args)
    items = [parse_progress_spec(s) for s in args.item[:9]]
    data = render_progress(items, args.style, args.title,
                           DISPLAY_W, DISPLAY_H, bg, fg, accent)
    labels = ", ".join(i["label"] for i in items)
    result(connect(args.port), data, labels)


# --- CLI ---

def main():
    parser = argparse.ArgumentParser(
        prog="waveshare-display",
        description="Waveshare Display")
    parser.add_argument("--port", "-p", default="/dev/ttyACM0",
                        help="Serial port (default: /dev/ttyACM0)")
    parser.add_argument("--theme", metavar="FILE",
                        help="Base16 JSON theme file")
    sub = parser.add_subparsers(dest="command", required=True)

    # image
    p = sub.add_parser("image", help="Send image or directory")
    p.add_argument("source", nargs="?", help="Image file or directory")
    p.add_argument("--test", action="store_true", help="Send test pattern")
    p.add_argument("--fps", type=float, default=0)
    p.add_argument("--width", type=int, default=DISPLAY_W)
    p.add_argument("--height", type=int, default=DISPLAY_H)

    # message
    p = sub.add_parser("message", help="Fullscreen text message")
    p.add_argument("text", nargs="?", help="Message text")
    p.add_argument("--stdin", action="store_true")
    p.add_argument("--size", type=int, default=48, help="Font size")
    p.add_argument("--align", choices=["top", "center", "bottom"], default="center")
    p.add_argument("--padding", type=int, default=40)
    p.add_argument("--width", type=int, default=DISPLAY_W)
    p.add_argument("--height", type=int, default=DISPLAY_H)
    common_args(p)

    # notify
    p = sub.add_parser("notify", help="Notification with icon")
    p.add_argument("title", help="Title")
    p.add_argument("body", nargs="?", default="", help="Body text")
    p.add_argument("--icon", default="\uf0e0", help="Nerd Font icon")
    common_args(p)

    # clock
    p = sub.add_parser("clock", help="Current time and date")
    p.add_argument("--24h", dest="use_24h", action="store_true")
    common_args(p)

    # weather
    p = sub.add_parser("weather", help="Weather via wttr.in")
    p.add_argument("--location", default="", help="Location (default: auto)")
    p.add_argument("--units", choices=["c", "f"], default="c")
    common_args(p)

    # sysmon
    p = sub.add_parser("sysmon", help="System monitor")
    common_args(p)

    # nowplaying
    p = sub.add_parser("nowplaying", help="MPRIS media info")
    common_args(p)

    # mail
    p = sub.add_parser("mail", help="Unread emails via gog CLI")
    p.add_argument("--query", default="is:unread")
    common_args(p)

    # calendar
    p = sub.add_parser("calendar", help="Today's events via gog CLI")
    common_args(p)

    # github
    p = sub.add_parser("github", help="GitHub repo stats")
    p.add_argument("repos", nargs="+", help="owner/repo (up to 4)")
    common_args(p)

    # timer
    p = sub.add_parser("timer", help="Countdown timer")
    p.add_argument("--remaining", type=int, required=True, help="Seconds remaining")
    p.add_argument("--total", type=int, required=True, help="Total seconds")
    p.add_argument("--label", default="")
    common_args(p)

    # gauge
    p = sub.add_parser("gauge", help="Arc gauges (1-4)")
    p.add_argument("--gauge", "-g", action="append", required=True,
                   help="'label:value:unit[:color]'")
    common_args(p)

    # qrcode
    p = sub.add_parser("qrcode", help="QR code display")
    p.add_argument("data", nargs="?", help="Data to encode")
    p.add_argument("--stdin", action="store_true")
    p.add_argument("--label", default="")
    common_args(p)

    # progress
    p = sub.add_parser("progress", help="Progress bars or circles")
    p.add_argument("-i", "--item", action="append", required=True,
                   help="'label:value:max[:color]' or 'label:pct%%[:color]'")
    p.add_argument("--style", choices=["bar", "circle"], default="bar",
                   help="bar (horizontal) or circle (ring)")
    p.add_argument("--title", default="", help="Optional header title")
    common_args(p)

    args = parser.parse_args()

    if args.theme:
        load_theme(args.theme)

    commands = {
        "image": cmd_image, "message": cmd_message, "notify": cmd_notify,
        "clock": cmd_clock, "weather": cmd_weather, "sysmon": cmd_sysmon,
        "nowplaying": cmd_nowplaying, "mail": cmd_mail, "calendar": cmd_calendar,
        "github": cmd_github, "timer": cmd_timer, "gauge": cmd_gauge,
        "qrcode": cmd_qrcode, "progress": cmd_progress,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
