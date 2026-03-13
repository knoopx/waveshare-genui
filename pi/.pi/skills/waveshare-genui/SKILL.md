---
name: waveshare-genui
description: Renders UI to a Waveshare 720×720 display using waveshare-genui CLI and openui-lang DSL. Use when asked to show content on the display.
---

# Waveshare Display

720×720 IPS LCD driven by `waveshare-genui`. Write openui-lang to stdout and pipe to `waveshare-genui -`.

## CLI

```bash
waveshare-genui -              # Read openui-lang from stdin
waveshare-genui <file.oui>    # Parse openui-lang file
waveshare-genui prompt           Print LLM system prompt
waveshare-genui schema           Print component JSON schema
waveshare-genui on|off         # Display power control
```

Options: `-p <port>` (default `/dev/ttyACM0`), `--rotate <deg>` (default 180), `-o <file.png>` (write PNG instead of sending).

## openui-lang Syntax

- Each statement: `identifier = Expression`
- `root = Canvas(...)` is the entry point — always required, always first
- Expressions: strings `"..."`, numbers, booleans, arrays `[...]`, objects `{...}`, component calls `TypeName(arg1, arg2, ...)`
- Arguments are POSITIONAL (order matters)
- Optional arguments omitted from the end
- Every variable must be reachable from root or it won't render
- Write top-down: root → components → data (hoisting resolves forward refs)
- Output ONLY openui-lang, no surrounding text

## Colors

All components share the same semantic color options:
`"default"` `"muted"` `"accent"` `"green"` `"red"` `"yellow"` `"cyan"` `"orange"` `"purple"`

## Components

### Layout
- `Canvas(children[])` — 720×720 root. MUST be root.
- `Header(icon, title, subtitle?)` — accent bar + Nerd Font icon + title
- `Content(children[], gap?)` — scrollable area below Header, adds padding. gap: "none"|"xs"|"sm"|"md"|"lg"|"xl"
- `Stack(children[], direction?, gap?, align?, justify?, wrap?)` — flex container. direction: "row"|"column". gap: "none"(0)|"xs"(4)|"sm"(8)|"md"(16)|"lg"(24)|"xl"(32). align: "start"|"center"|"end"|"stretch". justify: "start"|"center"|"end"|"between"|"around"
- `Card(children[])` — elevated container with rounded corners
- `Separator()` — horizontal divider
- `Spacer()` — flexible space filler in a row/column

### Text & Icons
- `Text(content, size?, weight?, color?, align?)` — size: "xs"|"sm"|"md"|"lg"|"xl"|"2xl"|"3xl". weight: "normal"|"bold". align: "left"|"center"|"right"
- `Icon(glyph, color?, size?)` — Nerd Font unicode e.g. "\uf058". size is a number in px (default ~24)
- `Badge(label, color?)` — colored pill

### Data Display
- `KeyValue(label, value, secondary?, color?)` — label on left, bold value on right. Stack several in a Card for info panels.
- `Stat(label, value, unit?, helper?, color?)` — compact metric card with prominent value. Grows to fill row. Use in `Stack(direction="row")` for stat rows.
- `Table(columns, rows)` — columns: Col[]. rows: (string|number)[][]. Max ~12 rows.
- `Col(label, align?)` — column def for Table. align: "left"|"center"|"right"
- `List(items)` — items: ListItem[]. Max ~8 items.
- `ListItem(text, secondary?, icon?, value?)` — value shows on right side
- `Alert(title, message?, icon?, color?)` — emphasized callout box
- `EmptyState(title, message?, icon?, color?)` — centered placeholder when there's no data

### Data Visualization
- `Gauge(label, value, max?, unit?, size?, color?)` — arc gauge. max default 100, unit "%", size 240
- `ProgressBar(label, value, max?, display?, color?)` — horizontal bar. display is a string shown as the value label (e.g. "120GB / 500GB")
- `Sparkline(values[], color?, height?)` — mini line chart. height default 40
- `StatusDot(up)` — green/red dot

### Media
- `Image(src, width?, height?, fit?, borderRadius?)` — local file path or data URI. fit: "contain"|"cover"|"fill". Files are base64-embedded automatically.
- `QRCode(data, size?, color?)` — QR code from string. size default 400.

### Utility
- `Timestamp()` — current time, bottom-right. Always place as LAST Canvas child.

## Layout Patterns

**Standard page** — most common. Header for context, Content for body:
```
root = Canvas([header, content, ts])
header = Header("\uf058", "Build Complete")
content = Content([msg])
msg = Text("All 42 tests passed.", "xl", "normal", "muted")
ts = Timestamp()
```

**Full-screen centered** — clock, message, timer. No Header/Content, Stack fills Canvas:
```
root = Canvas([center, ts])
center = Stack([time, date], "column", "lg", "center", "center")
time = Text("14:30", "3xl", "bold")
date = Text("Monday, March 13", "lg", "normal", "muted")
ts = Timestamp()
```

**Gauge dashboard** — row of gauges, wrap for >3:
```
root = Canvas([grid, ts])
grid = Stack([g1, g2, g3, g4], "row", "xl", "center", "center", true)
g1 = Gauge("CPU", 73, 100, "%")
g2 = Gauge("RAM", 4.2, 8, "GB")
g3 = Gauge("Disk", 120, 500, "GB")
g4 = Gauge("Temp", 62, 100, "°C")
ts = Timestamp()
```

**Feed/list** — Header + Content + List for news, tasks, departures:
```
root = Canvas([header, content, ts])
header = Header("\uf03a", "To Do")
content = Content([list])
list = List(items)
items = [ListItem("Buy groceries", "Milk, bread, eggs", "\uf07a"), ListItem("Review PR #284", "Auth refactor", "\uf126", "3")]
ts = Timestamp()
```

**Stats row + info card** — Stat cards across top, KeyValue details below:
```
root = Canvas([header, content, ts])
header = Header("\uf108", "System")
content = Content([stats, card], "md")
stats = Stack([s1, s2, s3], "row", "md", "stretch")
s1 = Stat("Memory", "42", "%", "3.2 / 7.6 GB", "green")
s2 = Stat("Disk", "71%", "", "340 / 480 GB", "orange")
s3 = Stat("Load", "1.23", "", "", "cyan")
card = Card([details])
details = Stack([kv1, kv2, kv3], "column", "xs")
kv1 = KeyValue("Kernel", "6.6.10")
kv2 = KeyValue("CPU", "8", "logical cores")
kv3 = KeyValue("Uptime", "3d 12h")
ts = Timestamp()
```

**Cards with sparklines** — Card per item, Badge + Sparkline for stock/metric views:
```
root = Canvas([header, content, ts])
header = Header("\uf201", "Market")
content = Content([card1], "sm")
card1 = Card([row1, spark1])
row1 = Stack([sym, badge, spacer, price], "row", "sm", "center")
sym = Text("AAPL", "md", "bold", "muted")
badge = Badge("+1.42%", "green")
spacer = Spacer()
price = Text("$198.50", "lg", "bold")
spark1 = Sparkline([195, 196, 197, 198, 198.5], "green")
ts = Timestamp()
```

**Mixed gauges + list** — gauges on top, Separator, then List below:
```
root = Canvas([header, content, ts])
header = Header("\uf108", "System Monitor")
content = Content([gauges, sep, list])
gauges = Stack([g1, g2, g3], "row", "xl", "center", "center")
g1 = Gauge("CPU", 45, 100, "%", 160)
g2 = Gauge("RAM", 62, 100, "%", 160)
g3 = Gauge("Disk", 88, 100, "%", 160, "orange")
sep = Separator()
list = List([i1, i2])
i1 = ListItem("CPU Freq: 3200 MHz", "", "\uf2db")
i2 = ListItem("Load: 1.2 / 0.8 / 0.5", "", "\uf085")
ts = Timestamp()
```

**Side-by-side cards** — two Card columns in a row for comparison:
```
root = Canvas([header, content, ts])
header = Header("\uf0ac", "Network")
content = Content([row], "md")
row = Stack([dl, ul], "row", "md", "center", "center")
dl = Card([dlStack])
dlStack = Stack([dlLabel, dlVal, dlTotal], "column", "xs", "center")
dlLabel = Text("Download", "sm", "muted")
dlVal = Text("12.4 MB/s", "2xl", "bold", "accent")
dlTotal = Text("total 1.2 GB", "sm", "muted")
ul = Card([ulStack])
ulStack = Stack([ulLabel, ulVal, ulTotal], "column", "xs", "center")
ulLabel = Text("Upload", "sm", "muted")
ulVal = Text("840 KB/s", "2xl", "bold", "accent")
ulTotal = Text("total 320 MB", "sm", "muted")
ts = Timestamp()
```

## Constraints

- 720×720 px display area
- Font: Inter (text) + Nerd Font (icons only)
- Semantic colors only — no hex values
- Image component reads local files only (auto base64-embedded) — no remote URLs
