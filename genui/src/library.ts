/**
 * Library assembly — wires components into an OpenUI Library
 * and defines prompt configuration for LLM generation.
 */

import { createLibrary } from "@openuidev/react-lang";
import type { ComponentGroup, PromptOptions } from "@openuidev/react-lang";
import { ICON_NAMES } from "./tokens";
import {
  OUICanvas as Canvas,
  OUIHeader as Header,
  OUIRow as Row,
  OUICol as Col,
  OUICard as Card,
  OUISeparator as Separator,
  OUISpacer as Spacer,
  OUIText as Text,
  OUIIcon as Icon,
  OUIBadge as Badge,
  OUIAlert as Alert,
  OUIEmptyState as EmptyState,
  OUITimestamp as Timestamp,
  OUICodeBlock as CodeBlock,
  OUIKeyValue as KeyValue,
  OUIStat as Stat,
  OUITable as Table,
  OUITableCol as TableCol,
  OUIList as List,
  OUIListItem as ListItem,
  OUISteps as Steps,
  OUIStepsItem as StepsItem,
  OUITagBlock as TagBlock,
  OUITag as Tag,
  OUIGauge as Gauge,
  OUIProgressBar as ProgressBar,
  OUISparkline as Sparkline,
  OUIStatusDot as StatusDot,
  OUIQRCode as QRCode,
  OUIImage as Image,
} from "./components";

// ─── Component groups ─────────────────────────────────────────────────────────

const componentGroups: ComponentGroup[] = [
  {
    name: "Layout",
    components: ["Canvas", "Header", "Row", "Col", "Card", "Separator", "Spacer"],
    notes: [
      "- Canvas is always root. Header + Col is the standard page pattern.",
      "- Row for horizontal layout, Col for vertical layout.",
      "- Row(wrap=true) for grid layouts (e.g., 2×2 gauges).",
      '- Both support align="baseline" for text-aligned rows and justify="evenly" for equal spacing.',
      '- Card(variant="card") is elevated (default), "sunk" is recessed, "clear" is transparent.',
    ],
  },
  {
    name: "Content Elements",
    components: ["Text", "Icon", "Badge", "CodeBlock", "Alert", "EmptyState", "Timestamp"],
    notes: [
      `- Icon uses named icons: ${ICON_NAMES.join(", ")}.`,
      '- Icon("check") renders a named icon. Icon("check", "green") adds color. Icon("check", "green", 40) adds size.',
      "- Anywhere an icon is accepted, pass a name string or an Icon element for custom color/size.",
      "- Timestamp auto-displays current time; place as last Canvas child.",
      "- CodeBlock: displays code with a language label and monospace font.",
      "- Alert highlights important state changes or failures.",
      "- EmptyState is a good fallback when there is no data to show.",
      "- All components share the same color options: default, muted, accent, green, red, yellow, cyan, orange, purple.",
    ],
  },
  {
    name: "Data Display",
    components: ["Table", "TableCol", "List", "ListItem", "KeyValue", "Stat", "Steps", "StepsItem", "TagBlock", "Tag"],
    notes: [
      "- Table: define TableCol references first, then pass rows as 2D array.",
      '- TableCol type="number" auto-aligns right; explicit align overrides type default.',
      "- List: define ListItem references, then pass as items array.",
      "- KeyValue is ideal for metadata and settings summaries.",
      "- Stat is ideal for dashboard KPI cards and metric grids.",
      "- Steps: numbered sequential process with title and optional details per step.",
      "- TagBlock: flow-wrapped group of Tag pills with optional icons and colors.",
      "- Display fits ~12 table rows or ~8 list items.",
    ],
  },
  {
    name: "Data Visualization",
    components: ["Gauge", "ProgressBar", "Sparkline", "StatusDot"],
    notes: [
      "- Gauge: circular arc. Place 2–4 in a Row(wrap=true) for dashboard grids.",
      "- ProgressBar: full-width horizontal bar with label.",
      "- Sparkline: mini line chart, takes array of numbers.",
    ],
  },
  {
    name: "Media",
    components: ["QRCode", "Image"],
    notes: [
      "- QRCode: renders a QR code SVG from a data string. size defaults to 400.",
      "- Image: displays a PNG/JPG/WebP from a file path or data URI. Paths are base64-embedded automatically.",
    ],
  },
];

// ─── Prompt examples ──────────────────────────────────────────────────────────

const examples: string[] = [
  `Example — Notification:
root = Canvas([header, content, ts])
header = Header("check", "Build Complete")
content = Col([msg])
msg = Text("All 42 tests passed. Deployed to staging.", "xl", "normal", "muted")
ts = Timestamp()`,

  `Example — List with icons:
root = Canvas([header, content, ts])
header = Header("list", "To Do")
content = Col([list])
list = List(items)
items = [ListItem("Buy groceries", "Milk, bread, eggs", "cart"), ListItem("Review PR #284", "Auth refactor", "git", "3"), ListItem("Deploy staging", "v1.2.3 RC", "bolt")]
ts = Timestamp()`,

  `Example — Gauge dashboard:
root = Canvas([grid, ts])
grid = Row([g1, g2, g3, g4], "md", "center", "center", true)
g1 = Gauge("CPU", 73, 100, "%")
g2 = Gauge("RAM", 4.2, 8, "GB")
g3 = Gauge("Disk", 120, 500, "GB")
g4 = Gauge("Temp", 62, 100, "°C")
ts = Timestamp()`,

  `Example — Cards with sparklines:
root = Canvas([header, content, ts])
header = Header("chart", "Market")
content = Col([c1, c2], "sm")
c1 = Card([row1, spark1])
row1 = Row([sym1, price1], "sm", "center", "between")
sym1 = Text("AAPL", "md", "bold", "muted")
price1 = Text("$178.52", "lg", "bold")
spark1 = Sparkline([170, 172, 175, 173, 178], "green")
c2 = Card([row2, spark2])
row2 = Row([sym2, price2], "sm", "center", "between")
sym2 = Text("MSFT", "md", "bold", "muted")
price2 = Text("$415.80", "lg", "bold")
spark2 = Sparkline([420, 418, 415, 416, 415], "red")
ts = Timestamp()`,

  `Example — Status monitor:
root = Canvas([header, content, ts])
header = Header("monitor", "Monitor", "5/6 up")
content = Col([s1, sep1, s2, sep2, s3])
s1 = Row([StatusDot(true), Text("API Server", "md", "bold"), Badge("142ms", "green")], "md", "center")
sep1 = Separator()
s2 = Row([StatusDot(true), Text("Database", "md", "bold"), Badge("89ms", "green")], "md", "center")
sep2 = Separator()
s3 = Row([StatusDot(false), Text("CDN", "md", "bold"), Badge("DOWN", "red")], "md", "center")
ts = Timestamp()`,

  `Example — Table:
root = Canvas([header, content, ts])
header = Header("table", "Team Roster")
content = Col([tbl])
tbl = Table(cols, rows)
cols = [TableCol("Name"), TableCol("Role"), TableCol("Status")]
rows = [["Alice", "Backend", "Active"], ["Bob", "Frontend", "Active"], ["Carol", "DevOps", "On Leave"]]
ts = Timestamp()`,

  `Example — KPI grid:
root = Canvas([header, content, ts])
header = Header("bars", "Overview")
content = Col([grid], "md")
grid = Row([stat1, stat2, stat3, stat4], "md", "stretch", "start", true)
stat1 = Stat("Revenue", "$24.8k", null, "+12% vs last week", "green")
stat2 = Stat("Orders", "182", null, "14 pending", "accent")
stat3 = Stat("Latency", "142", "ms", "p95", "yellow")
stat4 = Stat("Errors", "3", null, "last hour", "red")
ts = Timestamp()`,

  `Example — Empty state with alert:
root = Canvas([header, content, ts])
header = Header("info", "Deployments")
content = Col([alert, empty], "lg")
alert = Alert("Maintenance Window", "Production deploys are paused until 22:00.", "warning", "yellow")
empty = EmptyState("No pending deploys", "Everything is shipped. Check back after the freeze.", "check", "green")
ts = Timestamp()`,

  `Example — Steps process:
root = Canvas([header, content, ts])
header = Header("steps", "Setup Guide")
content = Col([steps])
steps = Steps([StepsItem("Install dependencies", "Run bun install in the project root."), StepsItem("Configure environment", "Copy .env.example to .env and fill in values."), StepsItem("Start development", "Run bun run dev to launch the dev server.")])
ts = Timestamp()`,

  `Example — Code block:
root = Canvas([header, content, ts])
header = Header("code", "Snippet")
content = Col([code])
code = CodeBlock("typescript", "const greeting = (name: string) =>\\n  \`Hello, \${name}!\`;\\n\\nconsole.log(greeting(\\"world\\"));")
ts = Timestamp()`,

  `Example — Tag cloud:
root = Canvas([header, content, ts])
header = Header("tag", "Topics")
content = Col([tags])
tags = TagBlock([Tag("TypeScript", "code", "accent"), Tag("React", "react", "cyan"), Tag("Rust", "rust", "orange"), Tag("NixOS", "nix", "purple"), Tag("Docker", "docker", "cyan")])
ts = Timestamp()`,

  `Example — Icon with custom color:
root = Canvas([header, content, ts])
header = Header(Icon("warning", "red"), "Alerts")
content = Col([row])
row = Row([Icon("check", "green", 40), Text("All systems operational", "lg")], "md", "center")
ts = Timestamp()`,
];

const additionalRules: string[] = [
  "Target display is 720×720 pixels. All UIs must fit this space.",
  "Always use Canvas as root. Standard pattern: Canvas([Header(...), Col([...]), Timestamp()]).",
  "Use named icons everywhere: Header(\"check\", ...), Alert(..., \"warning\"), ListItem(..., \"cart\").",
  "For custom icon color/size, use Icon element: Header(Icon(\"warning\", \"red\"), ...).",
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
    Row,
    Col,
    Card,
    Separator,
    Spacer,
    Text,
    Icon,
    Badge,
    CodeBlock,
    Alert,
    EmptyState,
    Timestamp,
    Table,
    TableCol,
    List,
    ListItem,
    KeyValue,
    Stat,
    Steps,
    StepsItem,
    TagBlock,
    Tag,
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
