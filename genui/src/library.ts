/**
 * Library assembly — wires components into an OpenUI Library
 * and defines prompt configuration for LLM generation.
 */

import { createLibrary } from "@openuidev/react-lang";
import type { ComponentGroup, PromptOptions } from "@openuidev/react-lang";
import {
  Canvas,
  Header,
  Content,
  Stack,
  Alert,
  EmptyState,
  Card,
  Separator,
  Spacer,
  Text,
  Icon,
  Badge,
  KeyValue,
  Stat,
  Timestamp,
  Table,
  Col,
  List,
  ListItem,
  Gauge,
  ProgressBar,
  Sparkline,
  StatusDot,
  QRCode,
  Image,
} from "./components";

// ─── Component groups ─────────────────────────────────────────────────────────

const componentGroups: ComponentGroup[] = [
  {
    name: "Layout",
    components: ["Canvas", "Header", "Content", "Stack", "Alert", "EmptyState", "Card", "Separator", "Spacer"],
    notes: [
      "- Canvas is always root. Header + Content is the standard page pattern.",
      '- Stack(direction="row") for horizontal, Stack(direction="column") for vertical.',
      '- Stack(direction="row", wrap=true) for grid layouts (e.g., 2×2 gauges).',
      "- Alert highlights important state changes or failures.",
      "- EmptyState is a good fallback when there is no data to show.",
    ],
  },
  {
    name: "Content",
    components: ["Text", "Icon", "Badge", "Timestamp"],
    notes: [
      '- Icon glyphs are Nerd Font Unicode escapes like "\\uf058" (check), "\\uf073" (calendar).',
      "- Timestamp auto-displays current time; place as last Canvas child.",
      "- All components share the same color options: default, muted, accent, green, red, yellow, cyan, orange, purple.",
    ],
  },
  {
    name: "Data Display",
    components: ["Table", "Col", "List", "ListItem", "KeyValue", "Stat"],
    notes: [
      "- Table: define Col references first, then pass rows as 2D array.",
      "- List: define ListItem references, then pass as items array.",
      "- KeyValue is ideal for metadata and settings summaries.",
      "- Stat is ideal for dashboard KPI cards and metric grids.",
      "- Display fits ~12 table rows or ~8 list items.",
    ],
  },
  {
    name: "Data Visualization",
    components: ["Gauge", "ProgressBar", "Sparkline", "StatusDot"],
    notes: [
      "- Gauge: circular arc. Stack 2–4 in a row+wrap Stack for dashboard grids.",
      "- ProgressBar: full-width horizontal bar with label.",
      "- Sparkline: mini line chart, takes array of numbers.",
    ],
  },
  {
    name: "Media",
    components: ["QRCode", "Image"],
    notes: [
      '- QRCode: renders a QR code SVG from a data string. size defaults to 400.',
      '- Image: displays a PNG/JPG/WebP from a file path or data URI. Paths are base64-embedded automatically.',
    ],
  },
];

// ─── Prompt examples ──────────────────────────────────────────────────────────

const examples: string[] = [
  `Example — Notification:
root = Canvas([header, content, ts])
header = Header("\\uf058", "Build Complete")
content = Content([msg])
msg = Text("All 42 tests passed. Deployed to staging.", "xl", "normal", "muted")
ts = Timestamp()`,

  `Example — List with icons:
root = Canvas([header, content, ts])
header = Header("\\uf03a", "To Do")
content = Content([list])
list = List(items)
items = [ListItem("Buy groceries", "Milk, bread, eggs", "\\uf07a"), ListItem("Review PR #284", "Auth refactor", "\\uf126", "3"), ListItem("Deploy staging", "v1.2.3 RC", "\\uf0e7")]
ts = Timestamp()`,

  `Example — Gauge dashboard:
root = Canvas([grid, ts])
grid = Stack([g1, g2, g3, g4], "row", "md", "center", "center", true)
g1 = Gauge("CPU", 73, 100, "%")
g2 = Gauge("RAM", 4.2, 8, "GB")
g3 = Gauge("Disk", 120, 500, "GB")
g4 = Gauge("Temp", 62, 100, "°C")
ts = Timestamp()`,

  `Example — Cards with sparklines:
root = Canvas([header, content, ts])
header = Header("\\uf201", "Market")
content = Content([c1, c2], 14)
c1 = Card([row1, spark1])
row1 = Stack([sym1, price1], "row", "sm", "center", "between")
sym1 = Text("AAPL", "md", "bold", "muted")
price1 = Text("$178.52", "lg", "bold")
spark1 = Sparkline([170, 172, 175, 173, 178], "green")
c2 = Card([row2, spark2])
row2 = Stack([sym2, price2], "row", "sm", "center", "between")
sym2 = Text("MSFT", "md", "bold", "muted")
price2 = Text("$415.80", "lg", "bold")
spark2 = Sparkline([420, 418, 415, 416, 415], "red")
ts = Timestamp()`,

  `Example — Status monitor:
root = Canvas([header, content, ts])
header = Header("\\uf21b", "Monitor", "5/6 up")
content = Content([s1, sep1, s2, sep2, s3])
s1 = Stack([StatusDot(true), Text("API Server", "md", "bold"), Badge("142ms", "green")], "row", "md", "center")
sep1 = Separator()
s2 = Stack([StatusDot(true), Text("Database", "md", "bold"), Badge("89ms", "green")], "row", "md", "center")
sep2 = Separator()
s3 = Stack([StatusDot(false), Text("CDN", "md", "bold"), Badge("DOWN", "red")], "row", "md", "center")
ts = Timestamp()`,

  `Example — Table:
root = Canvas([header, content, ts])
header = Header("\\uf0ce", "Team Roster")
content = Content([tbl])
tbl = Table(cols, rows)
cols = [Col("Name"), Col("Role"), Col("Status")]
rows = [["Alice", "Backend", "Active"], ["Bob", "Frontend", "Active"], ["Carol", "DevOps", "On Leave"]]
ts = Timestamp()`,

  `Example — KPI grid:
root = Canvas([header, content, ts])
header = Header("\\uf080", "Overview")
content = Content([grid], "md")
grid = Stack([stat1, stat2, stat3, stat4], "row", "md", "stretch", "start", true)
stat1 = Stat("Revenue", "$24.8k", null, "+12% vs last week", "green")
stat2 = Stat("Orders", "182", null, "14 pending", "accent")
stat3 = Stat("Latency", "142", "ms", "p95", "yellow")
stat4 = Stat("Errors", "3", null, "last hour", "red")
ts = Timestamp()`,

  `Example — Empty state with alert:
root = Canvas([header, content, ts])
header = Header("\\uf05a", "Deployments")
content = Content([alert, empty], "lg")
alert = Alert("Maintenance Window", "Production deploys are paused until 22:00.", "\\uf071", "yellow")
empty = EmptyState("No pending deploys", "Everything is shipped. Check back after the freeze.", "\\uf058", "green")
ts = Timestamp()`,
];

const additionalRules: string[] = [
  "Target display is 720×720 pixels. All UIs must fit this space.",
  "Always use Canvas as root. Standard pattern: Canvas([Header(...), Content([...]), Timestamp()]).",
  "Font is limited to Inter (text) and Nerd Font (icons). Use Image component for images and QRCode for QR codes.",
  "Use semantic color names (default, muted, accent, green, red, yellow, cyan, orange, purple) — not hex values.",
  "All text content must be strings, not numbers.",
];

// ─── Library & prompt options ─────────────────────────────────────────────────

export const library = createLibrary({
  root: "Canvas",
  componentGroups,
  components: [
    Canvas,
    Header,
    Content,
    Stack,
    Alert,
    EmptyState,
    Card,
    Separator,
    Spacer,
    Text,
    Icon,
    Badge,
    KeyValue,
    Stat,
    Timestamp,
    Table,
    Col,
    List,
    ListItem,
    Gauge,
    ProgressBar,
    Sparkline,
    StatusDot,
    QRCode,
    Image,
  ],
});

export const promptOptions: PromptOptions = {
  preamble: `You are an AI assistant that generates UIs for a 720×720 pixel LCD display. Your response must be valid openui-lang code.`,
  examples,
  additionalRules,
};
