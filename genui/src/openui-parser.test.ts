import { describe, it, expect } from "bun:test";
import { parseOpenUILang } from "./openui-parser";
import { library } from "./library";

/** Parse source, assert element exists and no warnings. */
function expectCleanParse(source: string) {
  const { element, warnings } = parseOpenUILang(source, library);
  expect(element).toBeDefined();
  expect(element.type).toBeDefined();
  expect(warnings).toHaveLength(0);
}

describe("openui-parser", () => {
  // ─── Clean parse cases ────────────────────────────────────────────────

  const cleanCases: [string, string][] = [
    [
      "minimal valid openui-lang",
      `root = Canvas([ts])\nts = Timestamp()`,
    ],
    [
      "standard page layout",
      `root = Canvas([header, content, ts])
header = Header("sync", "Title", "Subtitle")
content = Col([msg])
msg = Text("Hello world", "lg", "bold", "accent")
ts = Timestamp()`,
    ],
    [
      "all layout components",
      `root = Canvas([header, content, ts])
header = Header("check", "Test")
content = Col([row, card, sep, spacer])
row = Row([t1, t2], "md", "center", "between")
t1 = Text("Left", "md")
t2 = Text("Right", "md")
card = Card([t3])
t3 = Text("Card content")
sep = Separator()
spacer = Spacer()
ts = Timestamp()`,
    ],
    [
      "data display components",
      `root = Canvas([content, ts])
content = Col([tbl, list, kv, stat])
tbl = Table(cols, rows)
cols = [TableCol("Name"), TableCol("Value")]
rows = [["Alice", "100"], ["Bob", "200"]]
list = List([ListItem("Item 1", "desc", "list", "42")])
kv = KeyValue("Label", "Value", "secondary", "green")
stat = Stat("Metric", "99", "%", "helper", "accent")
ts = Timestamp()`,
    ],
    [
      "visualization components",
      `root = Canvas([content, ts])
content = Col([g, pb, spark, dot])
g = Gauge("CPU", 73, 100, "%")
pb = ProgressBar("Progress", 65, 100, "65%", "green")
spark = Sparkline([10, 20, 15, 25, 30], "cyan")
dot = StatusDot(true)
ts = Timestamp()`,
    ],
    [
      "alert and empty state",
      `root = Canvas([content, ts])
content = Col([alert, empty])
alert = Alert("Warning", "Something happened", "warning", "yellow")
empty = EmptyState("No data", "Check later", "check", "muted")
ts = Timestamp()`,
    ],
    [
      "content components (text, icon, badge)",
      `root = Canvas([content, ts])
content = Col([txt, icon, badge])
txt = Text("Hello", "xl", "bold", "green", "center")
icon = Icon("check", "accent", 32)
badge = Badge("OK", "green")
ts = Timestamp()`,
    ],
    [
      "optional props omitted",
      `root = Canvas([content, ts])
content = Col([txt])
txt = Text("Just text")
ts = Timestamp()`,
    ],
    [
      "gauge dashboard pattern",
      `root = Canvas([grid, ts])
grid = Row([g1, g2, g3, g4], "md", "center", "center", true)
g1 = Gauge("CPU", 73, 100, "%")
g2 = Gauge("RAM", 4.2, 8, "GB")
g3 = Gauge("Disk", 120, 500, "GB")
g4 = Gauge("Temp", 62, 100, "°C")
ts = Timestamp()`,
    ],
    [
      "inline component references in arrays",
      `root = Canvas([content, ts])
content = Col([list])
list = List([ListItem("A"), ListItem("B"), ListItem("C")])
ts = Timestamp()`,
    ],
    [
      "boolean props",
      `root = Canvas([content, ts])
content = Col([row])
row = Row([StatusDot(true), StatusDot(false)], "md")
ts = Timestamp()`,
    ],
    [
      "numeric array values",
      `root = Canvas([content, ts])
content = Col([spark])
spark = Sparkline([1, 2, 3, 4, 5])
ts = Timestamp()`,
    ],
    [
      "CodeBlock with language and code",
      `root = Canvas([content, ts])
content = Col([code])
code = CodeBlock("typescript", "const x = 42;")
ts = Timestamp()`,
    ],
    [
      "Steps with StepsItem children",
      `root = Canvas([content, ts])
content = Col([steps])
steps = Steps([StepsItem("First", "Do this"), StepsItem("Second", "Then this"), StepsItem("Third")])
ts = Timestamp()`,
    ],
    [
      "TagBlock with Tag children",
      `root = Canvas([content, ts])
content = Col([tags])
tags = TagBlock([Tag("TypeScript", "code", "accent"), Tag("React", "react", "cyan"), Tag("Plain")])
ts = Timestamp()`,
    ],
    [
      "Card with variant prop",
      `root = Canvas([content, ts])
content = Col([c1, c2, c3])
c1 = Card([Text("Default card")])
c2 = Card([Text("Sunk card")], "sunk")
c3 = Card([Text("Clear card")], "clear")
ts = Timestamp()`,
    ],
    [
      "TableCol with type prop",
      `root = Canvas([content, ts])
content = Col([tbl])
tbl = Table(cols, rows)
cols = [TableCol("Name", "string"), TableCol("Score", "number")]
rows = [["Alice", "95"], ["Bob", "87"]]
ts = Timestamp()`,
    ],
    [
      "Row baseline align and evenly justify",
      `root = Canvas([content, ts])
content = Col([row])
row = Row([Text("A", "xl"), Text("B", "sm")], "md", "baseline", "evenly")
ts = Timestamp()`,
    ],
    [
      "null positional arguments",
      `root = Canvas([content, ts])
content = Col([stat])
stat = Stat("Revenue", "$24.8k", null, "+12%", "green")
ts = Timestamp()`,
    ],
  ];

  cleanCases.forEach(([label, source]) => {
    describe(`given source with ${label}`, () => {
      describe("when parsing", () => {
        it("then parses without warnings", () => {
          expectCleanParse(source);
        });
      });
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────

  describe("given empty source", () => {
    describe("when parsing", () => {
      it("then throws a parse error", () => {
        expect(() => parseOpenUILang("", library)).toThrow();
      });
    });
  });

  describe("given source with only whitespace", () => {
    describe("when parsing", () => {
      it("then throws a parse error", () => {
        expect(() => parseOpenUILang("   \n\n  ", library)).toThrow();
      });
    });
  });

  describe("given source with no root assignment", () => {
    describe("when parsing", () => {
      it("then still produces an element (parser infers root)", () => {
        const { element } = parseOpenUILang(`header = Header("sync", "Orphan")`, library);
        expect(element).toBeDefined();
      });
    });
  });

  describe("given source with unresolved references", () => {
    const source = `root = Canvas([header, missing, ts])\nheader = Header("sync", "Test")\nts = Timestamp()`;

    describe("when parsing", () => {
      it("then returns warnings about unresolved references", () => {
        const { warnings } = parseOpenUILang(source, library);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0]).toContain("missing");
      });
    });
  });
});
