---
name: waveshare-display
description: Renders UI to a Waveshare 720×720 display using waveshare-genui CLI and openui-lang DSL. Use when asked to show content on the display.
---

# Waveshare Display

720×720 IPS LCD driven by `waveshare-genui`. Write openui-lang to stdout and pipe to `waveshare-genui -`.

## CLI

```bash
waveshare-genui -              # Read openui-lang from stdin
waveshare-genui <file.oui>    # Parse openui-lang file
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

## Components

### Layout
- `Canvas(children[])` — 720×720 root. MUST be root.
- `Header(icon, title, subtitle?)` — accent bar + Nerd Font icon + title
- `Content(children[], gap?)` — scrollable area below Header, adds padding
- `Stack(children[], direction?, gap?, align?, justify?, wrap?)` — flex container. direction: "row"|"column". gap: "none"|"xs"|"s"|"m"|"l"|"xl". align: "start"|"center"|"end"|"stretch". justify: "start"|"center"|"end"|"between"|"around"
- `Card(children[])` — elevated container with rounded corners
- `Separator()` — horizontal divider
- `Spacer()` — flexible space filler

### Content
- `Text(content, size?, weight?, color?, align?)` — size: "xs"|"sm"|"md"|"lg"|"xl"|"2xl"|"3xl". weight: "normal"|"bold". color: "default"|"muted"|"accent"|"green"|"red"|"yellow"|"cyan". align: "left"|"center"|"right"
- `Icon(glyph, color?, size?)` — Nerd Font unicode e.g. "\uf058"
- `Badge(label, color?)` — colored pill. color: "accent"|"green"|"red"|"yellow"|"cyan"|"orange"|"purple"|"muted"
- `Timestamp()` — current time, bottom-right. Place as last Canvas child.

### Data Display
- `Table(columns, rows)` — columns: Col[]. rows: (string|number)[][]. Max ~12 rows.
- `Col(label, align?)` — column def for Table
- `List(items)` — items: ListItem[]. Max ~8 items.
- `ListItem(text, secondary?, icon?, value?)` — value shows on right side

### Data Visualization
- `Gauge(label, value, max?, unit?, size?)` — arc gauge. max default 100, unit "%", size 240
- `ProgressBar(label, value, max?, display?)` — horizontal bar
- `Sparkline(values[], color?, height?)` — mini line chart. color: "accent"|"green"|"red"|"cyan"|"muted"
- `StatusDot(up)` — green/red dot

## Examples

```
root = Canvas([header, content, ts])
header = Header("\uf058", "Build Complete")
content = Content([msg])
msg = Text("All 42 tests passed.", "xl", "normal", "muted")
ts = Timestamp()
```

```
root = Canvas([grid, ts])
grid = Stack([g1, g2, g3, g4], "row", "m", "center", "center", true)
g1 = Gauge("CPU", 73, 100, "%")
g2 = Gauge("RAM", 4.2, 8, "GB")
g3 = Gauge("Disk", 120, 500, "GB")
g4 = Gauge("Temp", 62, 100, "°C")
ts = Timestamp()
```

```
root = Canvas([header, content, ts])
header = Header("\uf03a", "To Do")
content = Content([list])
list = List(items)
items = [ListItem("Buy groceries", "Milk, bread, eggs", "\uf07a"), ListItem("Review PR #284", "Auth refactor", "\uf126", "3")]
ts = Timestamp()
```

## Constraints

- 720×720 px display area
- Font: Inter (text) + Nerd Font (icons only)
- Semantic colors only: accent, muted, green, red, yellow, cyan
- No images, no external resources, no hex colors
