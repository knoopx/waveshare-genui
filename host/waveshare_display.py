#!/usr/bin/env python3
"""
Waveshare Display — unified CLI.

Usage:
    waveshare-display on
    waveshare-display off
    waveshare-display image photo.jpg
    waveshare-display message "Hello World" --size 80
    waveshare-display clock --24h
    waveshare-display notify "Title" "Body" --icon $'\\uf058'
    waveshare-display weather --location Barcelona
    waveshare-display sysmon
    waveshare-display nowplaying
    waveshare-display mail
    waveshare-display calendar --today
    waveshare-display calendar --days 3
    waveshare-display tasks
    waveshare-display tasks --show-completed
    waveshare-display github torvalds/linux facebook/react
    waveshare-display timer --remaining 90 --total 120 --label Deploy
    waveshare-display gauge -g "CPU:73:%" -g "RAM:4/8:GB"
    waveshare-display qrcode "https://..." --label Title
    waveshare-display table --json '[{"Name":"Alice","Score":"95"},{"Name":"Bob","Score":"87"}]'
    waveshare-display list -i "Buy milk:From the store" -i "Walk dog" --title "To Do"
    waveshare-display monthcal --highlight 15 --highlight 20
    waveshare-display departures --station "My Station" --station-id 12345
    waveshare-display stocks AAPL MSFT BTC-USD
    waveshare-display hackernews --count 8
    waveshare-display monitor -s "My App=https://example.com" -s "Google=https://google.com"
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

from display import (CMD_OFF, CMD_ON, DISPLAY_H, DISPLAY_W, connect,
                     load_theme, send_command, send_frame)
from widgets import (
    parse_gauge_spec, parse_progress_spec, render_calendar, render_clock,
    render_departures, render_gauges, render_github, render_hackernews,
    render_image, render_list, render_mail, render_message,
    render_monitor, render_month_calendar, render_notify,
    render_nowplaying, render_progress, render_qrcode, render_stocks,
    render_sysmon, render_table, render_tasks, render_test_pattern,
    render_timer, render_weather,
)


def result(ser, data, info=""):
    ok = send_frame(ser, data)
    label = f"{info}: " if info else ""
    print(f"{label}{'OK' if ok else 'FAIL'} ({len(data) // 1024} KB)")
    ser.close()


# --- subcommands ---

def cmd_on(args):
    ser = connect(args.port)
    ok = send_command(ser, CMD_ON)
    print(f"Display on: {'OK' if ok else 'FAIL'}")
    ser.close()


def cmd_off(args):
    ser = connect(args.port)
    ok = send_command(ser, CMD_OFF)
    print(f"Display off: {'OK' if ok else 'FAIL'}")
    ser.close()


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

    data = render_message(text, args.width, args.height,
                          args.size, args.align, args.padding)
    result(connect(args.port), data)


def cmd_notify(args):
    body = args.body.replace("\\n", "\n") if args.body else ""
    data = render_notify(args.title, body, args.icon,
                         DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data)


def cmd_clock(args):
    data = render_clock(datetime.now(), DISPLAY_W, DISPLAY_H, args.use_24h)
    result(connect(args.port), data)


def cmd_weather(args):
    import urllib.request
    loc = args.location or ""
    url = f"https://wttr.in/{loc}?format=j1"
    req = urllib.request.Request(url, headers={"User-Agent": "waveshare-display"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        weather_data = json.loads(resp.read())

    data = render_weather(weather_data, DISPLAY_W, DISPLAY_H, args.units)
    loc_name = (weather_data.get("nearest_area", [{}])[0]
                .get("areaName", [{}])[0].get("value", "?"))
    result(connect(args.port), data, loc_name)


def cmd_sysmon(args):
    data = render_sysmon(DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data)


def cmd_nowplaying(args):
    def playerctl(*args):
        try:
            return subprocess.check_output(
                ["playerctl", *args], stderr=subprocess.DEVNULL, timeout=2,
            ).decode().strip()
        except (subprocess.SubprocessError, FileNotFoundError):
            return ""

    title = playerctl("metadata", "title")
    artist = playerctl("metadata", "artist")
    album = playerctl("metadata", "album")
    status = playerctl("status")
    art_url = playerctl("metadata", "mpris:artUrl")

    data = render_nowplaying(title, artist, album, status, art_url,
                             DISPLAY_W, DISPLAY_H)
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

    data = render_mail(emails, args.query, DISPLAY_W, DISPLAY_H)
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

    cal_args = ["calendar", "events"]
    if args.today:
        cal_args.append("--today")
    elif args.week:
        cal_args.append("--week")
    elif args.days:
        cal_args += ["--days", str(args.days)]
    if args.max:
        cal_args += ["--max", str(args.max)]

    raw = gog_json(cal_args)
    events = []
    for e in raw[:args.max]:
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

    data = render_calendar(events, DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data, f"{len(events)} events")


def cmd_tasks(args):
    def gog_json(gog_args):
        try:
            out = subprocess.check_output(
                ["gog"] + gog_args + ["-j", "--results-only", "--no-input"],
                stderr=subprocess.DEVNULL, timeout=15)
            return json.loads(out)
        except (subprocess.SubprocessError, json.JSONDecodeError):
            return []

    if args.json:
        tasks = json.loads(args.json)
    elif args.stdin:
        tasks = json.loads(sys.stdin.read())
    else:
        # resolve task list ID
        list_id = args.list_id
        if not list_id:
            lists = gog_json(["tasks", "lists", "list"])
            if isinstance(lists, list) and lists:
                list_id = lists[0].get("id", "")
            elif isinstance(lists, dict):
                tl = lists.get("tasklists", lists.get("items", []))
                if tl:
                    list_id = tl[0].get("id", "")
            if not list_id:
                print("No task lists found", file=sys.stderr)
                sys.exit(1)

        gog_args = ["tasks", "list", list_id, "--max", str(args.max)]
        if args.show_completed:
            gog_args += ["--show-completed", "--show-hidden"]
        raw = gog_json(gog_args)
        if isinstance(raw, dict):
            raw = raw.get("tasks", raw.get("items", []))

        tasks = []
        for t in raw:
            tasks.append({
                "title": t.get("title", "(Untitled)"),
                "due": t.get("due", ""),
                "notes": t.get("notes", ""),
                "status": t.get("status", "needsAction"),
            })

    data = render_tasks(tasks, args.title, DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data, f"{len(tasks)} tasks")


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

    data = render_github(repos, DISPLAY_W, DISPLAY_H)
    names = ", ".join(r["full_name"] for r in repos)
    result(connect(args.port), data, names)


def cmd_timer(args):
    data = render_timer(args.remaining, args.total, args.label,
                        DISPLAY_W, DISPLAY_H)
    m, s = divmod(args.remaining, 60)
    result(connect(args.port), data, f"{m:02d}:{s:02d}")


def cmd_gauge(args):
    gauges = [parse_gauge_spec(s) for s in args.gauge[:4]]
    data = render_gauges(gauges, DISPLAY_W, DISPLAY_H)
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

    data = render_qrcode(data_str, args.label, DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data)


def cmd_progress(args):
    items = [parse_progress_spec(s) for s in args.item[:9]]
    data = render_progress(items, args.style, args.title,
                           DISPLAY_W, DISPLAY_H)
    labels = ", ".join(i["label"] for i in items)
    result(connect(args.port), data, labels)


def cmd_table(args):

    if args.json:
        rows_data = json.loads(args.json)
    elif args.stdin:
        rows_data = json.loads(sys.stdin.read())
    else:
        print("Provide --json or --stdin", file=sys.stderr)
        sys.exit(1)

    headers = args.header or []
    if isinstance(rows_data, list) and rows_data and isinstance(rows_data[0], dict):
        if not headers:
            headers = list(rows_data[0].keys())
        rows = [[str(r.get(h, "")) for h in headers] for r in rows_data]
    else:
        rows = [row if isinstance(row, list) else [str(row)] for row in rows_data]

    data = render_table(headers, rows, args.title,
                        DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data, f"{len(rows)} rows")


def cmd_list(args):

    if args.json:
        items_data = json.loads(args.json)
    elif args.stdin:
        items_data = json.loads(sys.stdin.read())
    elif args.item:
        items_data = []
        for spec in args.item:
            parts = spec.split(":", 1)
            item = {"text": parts[0]}
            if len(parts) > 1:
                item["secondary"] = parts[1]
            items_data.append(item)
    else:
        print("Provide --json, --stdin, or -i items", file=sys.stderr)
        sys.exit(1)

    # normalize: accept plain strings or dicts
    items = []
    for it in items_data:
        if isinstance(it, str):
            items.append({"text": it})
        elif isinstance(it, dict):
            items.append(it)

    data = render_list(items, args.title,
                       DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data, f"{len(items)} items")


def cmd_departures(args):
    import urllib.request

    station = args.station
    departures = []

    if args.json:
        departures = json.loads(args.json)
    elif args.stdin:
        departures = json.loads(sys.stdin.read())
    elif args.station_id:
        try:
            minutes = args.minutes or 120
            api_url = (f"https://serveisgrs.rodalies.gencat.cat/api/departures"
                       f"?stationId={args.station_id}&minute={minutes}"
                       f"&fullResponse=true&lang=en")
            req = urllib.request.Request(api_url,
                                        headers={"User-Agent": "waveshare-display"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = json.loads(resp.read())
            for train in raw.get("trains", [])[:12]:
                dep_time = train.get("departureDateHourSelectedStation", "")
                try:
                    dep_time = datetime.fromisoformat(dep_time).strftime("%H:%M")
                except (ValueError, TypeError):
                    pass
                dest = train.get("destinationStation", {})
                if isinstance(dest, dict):
                    dest = dest.get("name", "")
                departures.append({
                    "time": dep_time,
                    "destination": dest,
                    "line": train.get("line", {}).get("name", "") if isinstance(train.get("line"), dict) else train.get("line", ""),
                    "delay": train.get("delay", 0),
                })
        except Exception as e:
            print(f"Error fetching departures: {e}", file=sys.stderr)

    if not departures:
        print("No departures (provide --json, --stdin, or --station-id)",
              file=sys.stderr)

    data = render_departures(departures, station, DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data, f"{len(departures)} departures")


def cmd_stocks(args):
    import urllib.request

    tickers = []

    if args.json:
        tickers = json.loads(args.json)
    elif args.stdin:
        tickers = json.loads(sys.stdin.read())
    else:
        for symbol in args.symbols:
            try:
                url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
                       f"?range=1d&interval=5m")
                req = urllib.request.Request(url, headers={
                    "User-Agent": "waveshare-display"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    raw = json.loads(resp.read())
                result_data = raw["chart"]["result"][0]
                meta = result_data["meta"]
                price = meta["regularMarketPrice"]
                prev_close = meta.get("chartPreviousClose", price)
                change_pct = ((price - prev_close) / prev_close * 100
                              if prev_close else 0)
                closes = (result_data.get("indicators", {})
                          .get("quote", [{}])[0]
                          .get("close", []))
                sparkline = [c for c in closes if c is not None]
                tickers.append({
                    "symbol": symbol.upper(),
                    "price": price,
                    "change_pct": change_pct,
                    "sparkline": sparkline,
                })
            except Exception as e:
                print(f"Error fetching {symbol}: {e}", file=sys.stderr)

    if not tickers:
        print("No ticker data", file=sys.stderr)
        sys.exit(1)

    data = render_stocks(tickers, DISPLAY_W, DISPLAY_H)
    names = ", ".join(t["symbol"] for t in tickers)
    result(connect(args.port), data, names)


def cmd_hackernews(args):
    import urllib.request
    from concurrent.futures import ThreadPoolExecutor

    try:
        url = "https://hacker-news.firebaseio.com/v0/topstories.json"
        req = urllib.request.Request(url, headers={"User-Agent": "waveshare-display"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            ids = json.loads(resp.read())[:args.count]
    except Exception as e:
        print(f"Error fetching HN top stories: {e}", file=sys.stderr)
        sys.exit(1)

    def fetch_item(item_id):
        try:
            u = f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json"
            r = urllib.request.Request(u, headers={"User-Agent": "waveshare-display"})
            with urllib.request.urlopen(r, timeout=10) as resp:
                return json.loads(resp.read())
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=8) as pool:
        items = list(pool.map(fetch_item, ids))

    stories = []
    now = time.time()
    for item in items:
        if not item or item.get("type") != "story":
            continue
        age_s = now - item.get("time", now)
        if age_s < 3600:
            age = f"{int(age_s / 60)}m"
        elif age_s < 86400:
            age = f"{int(age_s / 3600)}h"
        else:
            age = f"{int(age_s / 86400)}d"
        stories.append({
            "title": item.get("title", ""),
            "score": item.get("score", 0),
            "comments": item.get("descendants", 0),
            "age": age,
        })

    data = render_hackernews(stories, DISPLAY_W, DISPLAY_H)
    result(connect(args.port), data, f"{len(stories)} stories")


def cmd_monitor(args):
    import urllib.request

    sites = []
    for spec in args.site:
        parts = spec.split("=", 1)
        title = parts[0]
        url = parts[1] if len(parts) > 1 else parts[0]
        if not url.startswith("http"):
            url = f"https://{url}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "waveshare-display"})
            t0 = time.monotonic()
            with urllib.request.urlopen(req, timeout=args.timeout) as resp:
                resp.read()
                status = resp.status
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            sites.append({
                "title": title,
                "url": url,
                "up": 200 <= status < 400,
                "status": status,
                "response_ms": elapsed_ms,
            })
        except Exception:
            sites.append({
                "title": title,
                "url": url,
                "up": False,
                "status": 0,
                "response_ms": 0,
            })

    data = render_monitor(sites, DISPLAY_W, DISPLAY_H)
    up = sum(1 for s in sites if s["up"])
    result(connect(args.port), data, f"{up}/{len(sites)} up")


def cmd_monthcal(args):
    from datetime import datetime as dt
    now = dt.now()
    year = args.year or now.year
    month = args.month or now.month
    highlights = [int(d) for d in args.highlight] if args.highlight else []
    data = render_month_calendar(year, month, highlights,
                                 DISPLAY_W, DISPLAY_H)
    import calendar as _cal
    result(connect(args.port), data, f"{_cal.month_name[month]} {year}")


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

    # on / off
    sub.add_parser("on", help="Turn display on")
    sub.add_parser("off", help="Turn display off")

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

    # notify
    p = sub.add_parser("notify", help="Notification with icon")
    p.add_argument("title", help="Title")
    p.add_argument("body", nargs="?", default="", help="Body text")
    p.add_argument("--icon", default="\uf0e0", help="Nerd Font icon")

    # clock
    p = sub.add_parser("clock", help="Current time and date")
    p.add_argument("--24h", dest="use_24h", action="store_true")

    # weather
    p = sub.add_parser("weather", help="Weather via wttr.in")
    p.add_argument("--location", default="", help="Location (default: auto)")
    p.add_argument("--units", choices=["c", "f"], default="c")

    # sysmon
    p = sub.add_parser("sysmon", help="System monitor")

    # nowplaying
    p = sub.add_parser("nowplaying", help="MPRIS media info")

    # mail
    p = sub.add_parser("mail", help="Unread emails via gog CLI")
    p.add_argument("--query", default="is:unread")

    # calendar
    p = sub.add_parser("calendar", help="Calendar events via gog CLI")
    p.add_argument("--today", action="store_true", help="Today only")
    p.add_argument("--week", action="store_true", help="This week")
    p.add_argument("--days", type=int, default=0, help="Next N days")
    p.add_argument("--max", type=int, default=8, help="Max events (default: 8)")

    # tasks
    p = sub.add_parser("tasks", help="Google Tasks via gog CLI")
    p.add_argument("--list-id", default="", help="Task list ID (default: first list)")
    p.add_argument("--title", default="", help="Widget title (default: list name)")
    p.add_argument("--max", type=int, default=20, help="Max tasks (default: 20)")
    p.add_argument("--show-completed", action="store_true",
                   help="Include completed tasks")
    p.add_argument("--json", help="JSON array of tasks")
    p.add_argument("--stdin", action="store_true", help="Read JSON from stdin")

    # github
    p = sub.add_parser("github", help="GitHub repo stats")
    p.add_argument("repos", nargs="+", help="owner/repo (up to 4)")

    # timer
    p = sub.add_parser("timer", help="Countdown timer")
    p.add_argument("--remaining", type=int, required=True, help="Seconds remaining")
    p.add_argument("--total", type=int, required=True, help="Total seconds")
    p.add_argument("--label", default="")

    # gauge
    p = sub.add_parser("gauge", help="Arc gauges (1-4)")
    p.add_argument("--gauge", "-g", action="append", required=True,
                   help="'label:value:unit[:color]'")

    # qrcode
    p = sub.add_parser("qrcode", help="QR code display")
    p.add_argument("data", nargs="?", help="Data to encode")
    p.add_argument("--stdin", action="store_true")
    p.add_argument("--label", default="")

    # progress
    p = sub.add_parser("progress", help="Progress bars or circles")
    p.add_argument("-i", "--item", action="append", required=True,
                   help="'label:value:max[:color]' or 'label:pct%%[:color]'")
    p.add_argument("--style", choices=["bar", "circle"], default="bar",
                   help="bar (horizontal) or circle (ring)")
    p.add_argument("--title", default="", help="Optional header title")

    # table
    p = sub.add_parser("table", help="Tabular data display")
    p.add_argument("--json", help="JSON array of rows (list of lists or list of dicts)")
    p.add_argument("--stdin", action="store_true", help="Read JSON from stdin")
    p.add_argument("--header", action="append", help="Column header (repeat for each)")
    p.add_argument("--title", default="", help="Optional header title")

    # list
    p = sub.add_parser("list", help="List with icons and secondary text")
    p.add_argument("--json", help="JSON array of items")
    p.add_argument("--stdin", action="store_true", help="Read JSON from stdin")
    p.add_argument("-i", "--item", action="append",
                   help="'text' or 'text:secondary' (repeat for each)")
    p.add_argument("--title", default="", help="Optional header title")

    # departures
    p = sub.add_parser("departures", help="Train departure board")
    p.add_argument("--station", default="Departures", help="Station name for header")
    p.add_argument("--station-id", dest="station_id", default="",
                   help="Rodalies station ID")
    p.add_argument("--minutes", type=int, default=120,
                   help="Lookahead window in minutes (default: 120)")
    p.add_argument("--json", help="JSON array of departures")
    p.add_argument("--stdin", action="store_true", help="Read JSON from stdin")

    # stocks
    p = sub.add_parser("stocks", help="Stock/crypto ticker")
    p.add_argument("symbols", nargs="*", help="Ticker symbols (e.g. AAPL BTC-USD)")
    p.add_argument("--json", help="JSON array of ticker data")
    p.add_argument("--stdin", action="store_true", help="Read JSON from stdin")

    # hackernews
    p = sub.add_parser("hackernews", aliases=["hn"], help="Hacker News top stories")
    p.add_argument("--count", type=int, default=10,
                   help="Number of stories to fetch (default: 10)")

    # monitor
    p = sub.add_parser("monitor", help="Site uptime monitor")
    p.add_argument("-s", "--site", action="append", required=True,
                   help="'Title=https://url' or just URL (repeat for each)")
    p.add_argument("--timeout", type=int, default=10,
                   help="Request timeout in seconds (default: 10)")

    # monthcal
    p = sub.add_parser("monthcal", help="Month calendar grid")
    p.add_argument("--year", type=int, default=0, help="Year (default: current)")
    p.add_argument("--month", type=int, default=0, help="Month 1-12 (default: current)")
    p.add_argument("--highlight", action="append", help="Day number to highlight (repeat)")

    args = parser.parse_args()

    if args.theme:
        load_theme(args.theme)

    commands = {
        "on": cmd_on, "off": cmd_off,
        "image": cmd_image, "message": cmd_message, "notify": cmd_notify,
        "clock": cmd_clock, "weather": cmd_weather, "sysmon": cmd_sysmon,
        "nowplaying": cmd_nowplaying, "mail": cmd_mail, "calendar": cmd_calendar,
        "tasks": cmd_tasks, "github": cmd_github, "timer": cmd_timer, "gauge": cmd_gauge,
        "qrcode": cmd_qrcode, "progress": cmd_progress, "table": cmd_table,
        "list": cmd_list, "departures": cmd_departures, "stocks": cmd_stocks,
        "hackernews": cmd_hackernews, "hn": cmd_hackernews,
        "monitor": cmd_monitor, "monthcal": cmd_monthcal,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
