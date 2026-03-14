import { describe, it, expect } from "bun:test";
import { parseOpenUILang } from "./openui-parser";
import { library } from "./library";

describe("openui-parser", () => {
  describe("given minimal valid openui-lang", () => {
    const source = `root = Canvas([ts])
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then returns a React element with no warnings", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(element.type).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given a standard page layout", () => {
    const source = `root = Canvas([header, content, ts])
header = Header("\\uf021", "Title", "Subtitle")
content = Content([msg])
msg = Text("Hello world", "lg", "bold", "accent")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then returns a valid element tree", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with all layout components", () => {
    const source = `root = Canvas([header, content, ts])
header = Header("\\uf00c", "Test")
content = Content([stack, card, sep, spacer])
stack = Stack([t1, t2], "row", "md", "center", "between")
t1 = Text("Left", "md")
t2 = Text("Right", "md")
card = Card([t3])
t3 = Text("Card content")
sep = Separator()
spacer = Spacer()
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then accepts all layout components without error", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with data display components", () => {
    const source = `root = Canvas([content, ts])
content = Content([tbl, list, kv, stat])
tbl = Table(cols, rows)
cols = [Col("Name"), Col("Value")]
rows = [["Alice", "100"], ["Bob", "200"]]
list = List([ListItem("Item 1", "desc", "\\uf03a", "42")])
kv = KeyValue("Label", "Value", "secondary", "green")
stat = Stat("Metric", "99", "%", "helper", "accent")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then accepts all data display components", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with visualization components", () => {
    const source = `root = Canvas([content, ts])
content = Content([g, pb, spark, dot])
g = Gauge("CPU", 73, 100, "%")
pb = ProgressBar("Progress", 65, 100, "65%", "green")
spark = Sparkline([10, 20, 15, 25, 30], "cyan")
dot = StatusDot(true)
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then accepts all visualization components", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with alert and empty state", () => {
    const source = `root = Canvas([content, ts])
content = Content([alert, empty])
alert = Alert("Warning", "Something happened", "\\uf071", "yellow")
empty = EmptyState("No data", "Check later", "\\uf058", "muted")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then accepts alert and empty state components", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with content components", () => {
    const source = `root = Canvas([content, ts])
content = Content([txt, icon, badge])
txt = Text("Hello", "xl", "bold", "green", "center")
icon = Icon("\\uf058", "accent", 32)
badge = Badge("OK", "green")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then accepts text, icon, and badge", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

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
    const source = `header = Header("\\uf021", "Orphan")`;

    describe("when parsing", () => {
      it("then still produces an element (parser infers root)", () => {
        // The parser resolves a single top-level statement as root
        const { element } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
      });
    });
  });

  describe("given source with unresolved references", () => {
    const source = `root = Canvas([header, missing, ts])
header = Header("\\uf021", "Test")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then returns warnings about unresolved references", () => {
        const { warnings } = parseOpenUILang(source, library);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0]).toContain("missing");
      });
    });
  });

  describe("given source with optional props omitted", () => {
    const source = `root = Canvas([content, ts])
content = Content([txt])
txt = Text("Just text")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then uses defaults for omitted optional props", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with gauge dashboard pattern", () => {
    const source = `root = Canvas([grid, ts])
grid = Stack([g1, g2, g3, g4], "row", "md", "center", "center", true)
g1 = Gauge("CPU", 73, 100, "%")
g2 = Gauge("RAM", 4.2, 8, "GB")
g3 = Gauge("Disk", 120, 500, "GB")
g4 = Gauge("Temp", 62, 100, "°C")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then handles the gauge grid pattern", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with inline component references", () => {
    const source = `root = Canvas([content, ts])
content = Content([list])
list = List([ListItem("A"), ListItem("B"), ListItem("C")])
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then handles inline component construction in arrays", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with boolean props", () => {
    const source = `root = Canvas([content, ts])
content = Content([row])
row = Stack([StatusDot(true), StatusDot(false)], "row", "md")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then handles boolean values in props", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with numeric array values", () => {
    const source = `root = Canvas([content, ts])
content = Content([spark])
spark = Sparkline([1, 2, 3, 4, 5])
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then parses numeric arrays correctly", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("given source with null props", () => {
    const source = `root = Canvas([content, ts])
content = Content([stat])
stat = Stat("Revenue", "$24.8k", null, "+12%", "green")
ts = Timestamp()`;

    describe("when parsing", () => {
      it("then handles null positional arguments", () => {
        const { element, warnings } = parseOpenUILang(source, library);
        expect(element).toBeDefined();
        expect(warnings).toHaveLength(0);
      });
    });
  });
});
