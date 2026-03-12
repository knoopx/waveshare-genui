#!/usr/bin/env python3
"""Generate screenshots for all widgets into screenshots/."""

import io
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "host"))

from PIL import Image

from display import parse_color
from widgets import (
    parse_gauge_spec, parse_progress_spec, render_calendar, render_clock,
    render_gauges, render_github, render_image, render_mail, render_message,
    render_notify, render_nowplaying, render_progress, render_qrcode,
    render_sysmon, render_timer, render_weather,
)

W, H = 720, 720
BG = parse_color("base00")
FG = parse_color("base05")
OUT = Path(__file__).resolve().parent.parent / "screenshots"
OUT.mkdir(exist_ok=True)


def save(name, webp_data):
    img = Image.open(io.BytesIO(webp_data)).transpose(Image.ROTATE_180)
    img.save(OUT / f"{name}.png")
    print(f"  {name}.png")


def accent(key):
    return parse_color(key)


# --- image ---
gradient = Image.new("RGB", (800, 600))
px = gradient.load()
for y in range(600):
    for x in range(800):
        px[x, y] = (int(x / 800 * 255), int(y / 600 * 255), 128)
save("image", render_image(gradient, W, H))

# --- message ---
save("message", render_message(
    "Hello, World!", W, H, FG, parse_color("base01"), 64, "center", 40))

# --- notify ---
save("notify", render_notify(
    "Build Complete", "All 42 tests passed\nDeployed to staging v1.2.3",
    "\uf058", W, H, BG, accent("base0B"), FG))

# --- clock ---
save("clock", render_clock(
    datetime(2026, 3, 12, 14, 30, 45), W, H, BG, FG, accent("base0A"), True))

# --- weather ---
weather_data = {
    "current_condition": [{
        "temp_C": "18", "temp_F": "64", "FeelsLikeC": "16", "FeelsLikeF": "61",
        "weatherDesc": [{"value": "Partly Cloudy"}], "weatherCode": "116",
        "humidity": "65", "windspeedKmph": "12", "winddir16Point": "NW",
        "precipMM": "0.0",
    }],
    "nearest_area": [{"areaName": [{"value": "Barcelona"}]}],
    "weather": [
        {"date": "2026-03-12", "maxtempC": "20", "mintempC": "12",
         "hourly": [{}] * 5 + [{"weatherCode": "116"}]},
        {"date": "2026-03-13", "maxtempC": "22", "mintempC": "14",
         "hourly": [{}] * 5 + [{"weatherCode": "113"}]},
        {"date": "2026-03-14", "maxtempC": "17", "mintempC": "11",
         "hourly": [{}] * 5 + [{"weatherCode": "302"}]},
    ],
}
save("weather", render_weather(weather_data, W, H, BG, FG, accent("base0C"), "c"))

# --- sysmon ---
save("sysmon", render_sysmon(W, H, BG, FG, accent("base0A")))

# --- nowplaying ---
save("nowplaying", render_nowplaying(
    "Bohemian Rhapsody", "Queen", "A Night at the Opera",
    "Playing", "", W, H, BG, FG, accent("base0B")))

# --- timer ---
save("timer", render_timer(90, 120, "Deploy", W, H, BG, FG, accent("base08")))

# --- gauge ---
gauges = [parse_gauge_spec(s) for s in [
    "CPU:73:%", "RAM:4.2/8:GB", "Disk:120/500:GB", "Temp:62/100:°C"]]
save("gauge", render_gauges(gauges, W, H, BG, FG, accent("base0A")))

# --- qrcode ---
save("qrcode", render_qrcode(
    "https://github.com/knoopx/waveshare-display", "Project Repository",
    W, H, BG, FG, accent("base0A")))

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
save("github", render_github(repos, W, H, BG, FG, accent("base0D")))

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
save("mail", render_mail(emails, "is:unread", W, H, BG, FG, accent("base0A")))

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
save("calendar", render_calendar(events, W, H, BG, FG, accent("base0A")))

# --- progress ---
items = [parse_progress_spec(s) for s in [
    "Build:75:100", "Tests:42:50", "Deploy:30:100"]]
save("progress", render_progress(
    items, "bar", "CI Pipeline", W, H, BG, FG, accent("base0A")))

print("Done.")
