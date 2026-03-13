#!/usr/bin/env python3
"""Generate screenshots for all widgets into screenshots/."""

import io
import math
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "host"))

from PIL import Image

from display import parse_color
from widgets import (
    parse_gauge_spec, parse_progress_spec, render_calendar, render_clock,
    render_dashboard, render_departures, render_gauges, render_github,
    render_hackernews, render_image, render_list, render_mail,
    render_message, render_monitor, render_month_calendar, render_notify,
    render_nowplaying, render_progress, render_qrcode, render_stocks,
    render_sysmon, render_table, render_tasks, render_timer,
    render_weather,
)

W, H = 720, 720
OUT = Path(__file__).resolve().parent.parent / "screenshots"
OUT.mkdir(exist_ok=True)


def save(name, webp_data):
    img = Image.open(io.BytesIO(webp_data)).transpose(Image.ROTATE_180)
    img.save(OUT / f"{name}.png")
    print(f"  {name}.png")


# --- image ---
gradient = Image.new("RGB", (800, 600))
px = gradient.load()
for y in range(600):
    for x in range(800):
        px[x, y] = (int(x / 800 * 255), int(y / 600 * 255), 128)
save("image", render_image(gradient, W, H))

# --- message ---
save("message", render_message("Hello, World!", W, H, 64, "center", 40))

# --- notify ---
save("notify", render_notify(
    "Build Complete", "All 42 tests passed\nDeployed to staging v1.2.3",
    "\uf058", W, H))

# --- clock ---
save("clock", render_clock(datetime(2026, 3, 12, 14, 30, 45), W, H, True))

# --- dashboard ---
weather_data = {
    "current_condition": [{
        "temp_C": "18", "temp_F": "64", "FeelsLikeC": "16", "FeelsLikeF": "61",
        "weatherDesc": [{"value": "Partly Cloudy"}], "weatherCode": "116",
        "humidity": "65", "windspeedKmph": "12", "winddir16Point": "NW",
        "precipMM": "0.0",
    }],
    "nearest_area": [{"areaName": [{"value": "Barcelona"}]}],
}
dashboard_events = [
    {"summary": "Team Standup", "time": "09:00 – 09:15", "location": "Google Meet"},
    {"summary": "Sprint Planning", "time": "10:00 – 11:00", "location": ""},
    {"summary": "Lunch with Alex", "time": "13:00 – 14:00", "location": "Bar Central"},
    {"summary": "Code Review: Auth refactor", "time": "15:00 – 15:30", "location": ""},
    {"summary": "1:1 with Manager", "time": "16:00 – 16:30", "location": "Google Meet"},
]
dashboard_np = {"title": "Bohemian Rhapsody", "artist": "Queen"}
dashboard_dep = [{"time": "18:33", "destination": "L'Hospitalet de Llobregat",
                  "line": "R1", "delay": 0}]
dashboard_tickers = [
    {"symbol": "AAPL", "price": 178.50, "change_pct": 1.23},
    {"symbol": "BTC", "price": 67500, "change_pct": -2.45},
    {"symbol": "MSFT", "price": 415, "change_pct": 0.67},
]
save("dashboard", render_dashboard(
    datetime(2026, 3, 13, 17, 58, 0), weather_data, dashboard_events,
    dashboard_np, dashboard_dep, dashboard_tickers, "c", True, W, H))

# --- weather ---
weather_data["weather"] = [
    {"date": "2026-03-12", "maxtempC": "20", "mintempC": "12",
     "hourly": [{}] * 5 + [{"weatherCode": "116"}]},
    {"date": "2026-03-13", "maxtempC": "22", "mintempC": "14",
     "hourly": [{}] * 5 + [{"weatherCode": "113"}]},
    {"date": "2026-03-14", "maxtempC": "17", "mintempC": "11",
     "hourly": [{}] * 5 + [{"weatherCode": "302"}]},
]
save("weather", render_weather(weather_data, W, H, "c"))

# --- sysmon ---
save("sysmon", render_sysmon(W, H))

# --- nowplaying ---
save("nowplaying", render_nowplaying(
    "Bohemian Rhapsody", "Queen", "A Night at the Opera", "Playing", "", W, H))

# --- timer ---
save("timer", render_timer(90, 120, "Deploy", W, H))

# --- gauge ---
gauges = [parse_gauge_spec(s) for s in [
    "CPU:73:%", "RAM:4.2/8:GB", "Disk:120/500:GB", "Temp:62/100:°C"]]
save("gauge", render_gauges(gauges, W, H))

# --- qrcode ---
save("qrcode", render_qrcode(
    "https://github.com/knoopx/waveshare-display", "Project Repository", W, H))

# --- github ---
repos = [
    {"full_name": "torvalds/linux", "stargazers_count": 191000,
     "forks_count": 55400, "open_issues_count": 348, "subscribers_count": 8100,
     "language": "C", "description": "Linux kernel source tree"},
    {"full_name": "facebook/react", "stargazers_count": 234000,
     "forks_count": 47800, "open_issues_count": 912, "subscribers_count": 6500,
     "language": "JavaScript",
     "description": "The library for web and native user interfaces"},
]
save("github", render_github(repos, W, H))

# --- mail ---
emails = [
    {"from": "GitHub <noreply@github.com>",
     "subject": "[react] Fix hydration mismatch in Suspense (#28431)",
     "date": "2026-03-12 14:30"},
    {"from": "Linear <notifications@linear.app>",
     "subject": "6 unread notifications on SLNG", "date": "2026-03-12 12:20"},
    {"from": "AWS Notifications",
     "subject": "AWS Notification Message", "date": "2026-03-12 09:07"},
    {"from": "Notion Team <notify@mail.notion.so>",
     "subject": "Ismael made updates in Project Board",
     "date": "2026-03-12 08:27"},
    {"from": "Datadog <no-reply@dtdg.eu>",
     "subject": "Your Daily Digest from Datadog", "date": "2026-03-11 15:39"},
]
save("mail", render_mail(emails, "is:unread", W, H))

# --- calendar ---
events = [
    {"summary": "Team Standup", "time": "09:00 – 09:15", "all_day": False,
     "location": "Google Meet", "attendees": 8},
    {"summary": "Sprint Planning", "time": "10:00 – 11:00", "all_day": False,
     "location": "", "attendees": 12},
    {"summary": "Lunch with Alex", "time": "13:00 – 14:00", "all_day": False,
     "location": "Bar Central", "attendees": 2},
    {"summary": "Code Review: Auth refactor", "time": "15:00 – 15:30",
     "all_day": False, "location": "", "attendees": 3},
    {"summary": "1:1 with Manager", "time": "16:00 – 16:30", "all_day": False,
     "location": "Google Meet", "attendees": 2},
]
save("calendar", render_calendar(events, W, H))

# --- tasks ---
tasks = [
    {"title": "Review PR #284", "due": "2026-03-12T00:00:00Z",
     "notes": "Auth refactor — check token rotation", "status": "needsAction"},
    {"title": "Update API docs", "due": "2026-03-13T00:00:00Z",
     "notes": "New endpoints for batch processing", "status": "needsAction"},
    {"title": "Fix flaky CI test", "due": "2026-03-10T00:00:00Z",
     "notes": "", "status": "needsAction"},
    {"title": "Deploy staging v1.2.3", "due": "2026-03-14T00:00:00Z",
     "notes": "", "status": "needsAction"},
    {"title": "Write migration script", "due": "",
     "notes": "PostgreSQL 15 → 16", "status": "needsAction"},
    {"title": "Set up monitoring alerts", "due": "2026-03-15T00:00:00Z",
     "notes": "", "status": "completed"},
    {"title": "Order new keyboard", "due": "",
     "notes": "", "status": "completed"},
]
save("tasks", render_tasks(tasks, "My Tasks", W, H))

# --- progress ---
items = [parse_progress_spec(s) for s in [
    "Build:75:100", "Tests:42:50", "Deploy:30:100"]]
save("progress-bar", render_progress(items, "bar", "CI Pipeline", W, H))
save("progress-ring", render_progress(items, "circle", "CI Pipeline", W, H))

# --- table ---
save("table", render_table(
    ["Name", "Role", "Status"],
    [["Alice", "Backend", "Active"],
     ["Bob", "Frontend", "Active"],
     ["Carol", "DevOps", "On Leave"],
     ["Dave", "QA", "Active"],
     ["Eve", "Design", "Active"],
     ["Frank", "Backend", "Inactive"]],
    "Team Roster", W, H))

# --- list ---
save("list", render_list(
    [{"text": "Buy groceries", "secondary": "Milk, bread, eggs", "icon": "\uf07a"},
     {"text": "Review PR #284", "secondary": "Auth refactor", "icon": "\uf126", "value": "3"},
     {"text": "Deploy staging", "secondary": "v1.2.3 release candidate", "icon": "\uf0e7"},
     {"text": "Team standup", "secondary": "09:00 – Google Meet", "icon": "\uf073"},
     {"text": "Write docs", "secondary": "API reference update", "icon": "\uf15c"},
     {"text": "Fix CI pipeline", "secondary": "Flaky test in auth module", "icon": "\uf085", "value": "!"},
     {"text": "Book flights", "secondary": "Conference in Berlin", "icon": "\uf072"}],
    "To Do", W, H))

# --- month calendar ---
save("monthcal", render_month_calendar(2026, 3, [5, 10, 15, 22, 28], W, H))

# --- departures ---
save("departures", render_departures(
    [{"time": "14:32", "destination": "Maçanet-Massanes", "line": "R1", "delay": 3},
     {"time": "14:45", "destination": "Molins de Rei", "line": "R4", "delay": 0},
     {"time": "15:02", "destination": "L'Hospitalet", "line": "R2S", "delay": 0},
     {"time": "15:18", "destination": "Aeroport", "line": "R2N", "delay": 5},
     {"time": "15:33", "destination": "Sant Celoni", "line": "R1", "delay": 0},
     {"time": "15:50", "destination": "Terrassa", "line": "R4", "delay": 0}],
    "Passeig de Gràcia", W, H))

# --- stocks ---
spark_up = [100 + 5 * math.sin(i / 3) + i * 0.3 for i in range(50)]
spark_down = [200 - i * 0.8 + 3 * math.sin(i / 2) for i in range(50)]
spark_flat = [50 + 2 * math.sin(i / 4) for i in range(50)]
save("stocks", render_stocks(
    [{"symbol": "AAPL", "price": 178.52, "change_pct": 1.34,
      "sparkline": spark_up},
     {"symbol": "MSFT", "price": 415.80, "change_pct": -0.67,
      "sparkline": spark_down},
     {"symbol": "BTC-USD", "price": 67432.10, "change_pct": 2.85,
      "sparkline": spark_flat},
     {"symbol": "ETH-USD", "price": 3521.45, "change_pct": -1.12,
      "sparkline": spark_down}],
    W, H))

# --- hackernews ---
save("hackernews", render_hackernews(
    [{"title": "Show HN: A minimal text editor in 500 lines of C", "score": 482, "comments": 187, "age": "3h"},
     {"title": "Why SQLite is so great for the edge", "score": 341, "comments": 142, "age": "5h"},
     {"title": "The death of the Unix philosophy", "score": 289, "comments": 231, "age": "7h"},
     {"title": "Rust in the Linux kernel: progress report 2026", "score": 256, "comments": 98, "age": "4h"},
     {"title": "How we reduced our AWS bill by 90%", "score": 198, "comments": 67, "age": "2h"},
     {"title": "A visual guide to QUIC and HTTP/3", "score": 167, "comments": 43, "age": "6h"},
     {"title": "The surprising math behind parking lots", "score": 145, "comments": 56, "age": "8h"},
     {"title": "Building a CPU from scratch with Nand gates", "score": 134, "comments": 89, "age": "1d"}],
    W, H))

# --- monitor ---
save("monitor", render_monitor(
    [{"title": "Home Assistant", "url": "https://ha.example.com", "up": True,
      "status": 200, "response_ms": 142},
     {"title": "Immich", "url": "https://photos.example.com", "up": True,
      "status": 200, "response_ms": 89},
     {"title": "Jellyfin", "url": "https://media.example.com", "up": True,
      "status": 200, "response_ms": 231},
     {"title": "Gitea", "url": "https://git.example.com", "up": False,
      "status": 0, "response_ms": 0},
     {"title": "Grafana", "url": "https://grafana.example.com", "up": True,
      "status": 200, "response_ms": 567},
     {"title": "Nextcloud", "url": "https://cloud.example.com", "up": True,
      "status": 200, "response_ms": 1230}],
    W, H))

print("Done.")
