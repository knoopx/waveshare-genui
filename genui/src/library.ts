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
  Card,
  Separator,
  Spacer,
  Text,
  Icon,
  Badge,
  Timestamp,
  Table,
  Col,
  List,
  ListItem,
  Gauge,
  ProgressBar,
  Sparkline,
  StatusDot,
} from "./components";

// ─── Component groups ─────────────────────────────────────────────────────────

const componentGroups: ComponentGroup[] = [
  {
    name: "Layout",
    components: ["Canvas", "Header", "Content", "Stack", "Card", "Separator", "Spacer"],
    notes: [
      "- Canvas is always root. Header + Content is the standard page pattern.",
      '- Use Stack(direction="row") for horizontal layouts, Stack(direction="column") for vertical.',
      '- Use Stack(direction="row", wrap=true) for grid layouts (e.g., 2×2 gauges).',
    ],
  },
  {
    name: "Content",
    components: ["Text", "Icon", "Badge", "Timestamp"],
    notes: [
      '- Icon glyphs are Nerd Font Unicode escapes like "\\uf058" (check), "\\uf073" (calendar).',
      "- Timestamp auto-displays current time; place as last Canvas child.",
    ],
  },
  {
    name: "Data Display",
    components: ["Table", "Col", "List", "ListItem"],
    notes: [
      "- Table: define Col references first, then pass rows as 2D array.",
      "- List: define ListItem references, then pass as items array.",
      "- Display fits ~12 table rows or ~8 list items.",
    ],
  },
  {
    name: "Data Visualization",
    components: ["Gauge", "ProgressBar", "Sparkline", "StatusDot"],
    notes: [
      "- Gauge: circular arc gauge. Stack 2-4 in a row+wrap Stack for dashboard grids.",
      "- ProgressBar: full-width horizontal bar with label.",
      "- Sparkline: mini line chart, takes array of numbers.",
    ],
  },
];

// ─── Prompt examples & rules ──────────────────────────────────────────────────

const examples: string[] = [
  `Example 1 — Notification:
root = Canvas([header, content, ts])
header = Header("\\uf058", "Build Complete")
content = Content([msg])
msg = Text("All 42 tests passed. Deployed to staging v1.2.3.", "xl", "normal", "muted")
ts = Timestamp()`,

  `Example 2 — Data table:
root = Canvas([header, content, ts])
header = Header("\\uf0ce", "Team Roster")
content = Content([tbl])
tbl = Table(cols, rows)
cols = [Col("Name"), Col("Role"), Col("Status")]
rows = [["Alice", "Backend", "Active"], ["Bob", "Frontend", "Active"], ["Carol", "DevOps", "On Leave"]]
ts = Timestamp()`,

  `Example 3 — Gauge dashboard:
root = Canvas([grid, ts])
grid = Stack([g1, g2, g3, g4], "row", "m", "center", "center", true)
g1 = Gauge("CPU", 73, 100, "%")
g2 = Gauge("RAM", 4.2, 8, "GB")
g3 = Gauge("Disk", 120, 500, "GB")
g4 = Gauge("Temp", 62, 100, "°C")
ts = Timestamp()`,

  `Example 4 — List with icons:
root = Canvas([header, content, ts])
header = Header("\\uf03a", "To Do")
content = Content([list])
list = List(items)
items = [ListItem("Buy groceries", "Milk, bread, eggs", "\\uf07a"), ListItem("Review PR #284", "Auth refactor", "\\uf126", "3"), ListItem("Deploy staging", "v1.2.3 RC", "\\uf0e7")]
ts = Timestamp()`,

  `Example 5 — Stock ticker with sparklines:
root = Canvas([header, content, ts])
header = Header("\\uf201", "Market")
content = Content([c1, c2], 14)
c1 = Card([row1, spark1])
row1 = Stack([sym1, price1], "row", "s", "center", "between")
sym1 = Text("AAPL", "md", "bold", "muted")
price1 = Text("$178.52", "lg", "bold")
spark1 = Sparkline([170, 172, 175, 173, 178], "green")
c2 = Card([row2, spark2])
row2 = Stack([sym2, price2], "row", "s", "center", "between")
sym2 = Text("MSFT", "md", "bold", "muted")
price2 = Text("$415.80", "lg", "bold")
spark2 = Sparkline([420, 418, 415, 416, 415], "red")
ts = Timestamp()`,
];

const additionalRules: string[] = [
  "Target display is 720×720 pixels. All UIs must fit this space.",
  "Always use Canvas as root. Typical pattern: Canvas([Header, Content([...]), Timestamp()]).",
  "Font is limited to Inter (text) and Nerd Font (icons). No images or external resources.",
  "Colors are from a Base16 theme. Use semantic color names (accent, green, red, muted) not hex values.",
  "Inline SVG is supported for data visualization (gauges, charts, sparklines).",
  "All text children must be strings, not numbers. Wrap numbers with string conversion.",
  "Do NOT use undefined style values. Use spread pattern: ...(condition ? {key: val} : {}) instead.",
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
    Card,
    Separator,
    Spacer,
    Text,
    Icon,
    Badge,
    Timestamp,
    Table,
    Col,
    List,
    ListItem,
    Gauge,
    ProgressBar,
    Sparkline,
    StatusDot,
  ],
});

export const promptOptions: PromptOptions = {
  preamble: `You are an AI assistant that generates UIs for a 720×720 pixel LCD display. Your response must be valid openui-lang code. The display renders React components to images via satori — only inline styles and flexbox layout are supported.`,
  examples,
  additionalRules,
};
