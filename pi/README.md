# Pi Agent — Waveshare Display Controller

A [pi](https://github.com/badlogic/pi-mono) agent that autonomously drives a Waveshare 720×720 display. It wakes up periodically, checks what data sources are available, picks the most useful thing to show, renders it, and goes back to sleep.

## How It Works

```
startup → what data is available? → render openui-lang → pipe to waveshare-genui → heartbeat(60s) → repeat
```

The agent uses a local model via llama-server on port 11434. The `@marcfargas/pi-heartbeat` package provides non-blocking periodic wake-ups so the display stays fresh without blocking the session.

## Prerequisites

- `llama-server` running on port 11434 with a loaded model
- [pi](https://github.com/badlogic/pi-mono) (`npm i -g @mariozechner/pi-coding-agent`)
- `waveshare-genui` CLI on PATH (see parent project)

## Setup

```bash
cd pi/
pi
```

Everything is preconfigured:
- Model auto-selects via `defaultProvider`/`defaultModel` in settings
- Heartbeat package auto-installs via `packages` in settings
- Agent loop starts via `AGENTS.md`

## Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Autonomous loop: check sources → write openui-lang → render → sleep |
| `.pi/settings.json` | Model default, heartbeat package, compaction |
| `.pi/skills/waveshare-display/SKILL.md` | openui-lang syntax, component reference, CLI usage |
