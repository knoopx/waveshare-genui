import { describe, it, expect } from "bun:test";
import React from "react";
import { toOpenUILang } from "./openui-emitter";
import { parseOpenUILang } from "./openui-parser";
import { library } from "./library";
import {
  Canvas,
  Header,
  Content,
  Text,
  Timestamp,
  Stack,
  Badge,
  Icon,
  Separator,
  Spacer,
  Card,
  Alert,
  EmptyState,
  KeyValue,
  Stat,
  StatusDot,
  Gauge,
  ProgressBar,
  Sparkline,
  Table,
  Col,
  List,
  ListItem,
  QRCode,
} from "./components";

// Helper: emit JSX → openui-lang → parse back → verify no errors
function roundtrip(element: React.ReactElement): string {
  const source = toOpenUILang(element);
  const { warnings } = parseOpenUILang(source, library);
  expect(warnings).toHaveLength(0);
  return source;
}

describe("openui-emitter", () => {
  describe("given a minimal Canvas", () => {
    describe("when emitting", () => {
      it("then produces valid openui-lang with root = Canvas", () => {
        const source = toOpenUILang(
          <Canvas>
            <Timestamp />
          </Canvas>,
        );
        expect(source).toContain("root = Canvas(");
        expect(source).toContain("Timestamp()");
      });
    });
  });

  describe("given a standard page layout", () => {
    describe("when emitting", () => {
      it("then includes Header, Content, and Timestamp", () => {
        const source = roundtrip(
          <Canvas>
            <Header icon="\uf021" title="Test Title" subtitle="Sub" />
            <Content>
              <Text content="Hello" />
            </Content>
            <Timestamp />
          </Canvas>,
        );
        expect(source).toContain("Header(");
        expect(source).toContain("Content(");
        expect(source).toContain('"Test Title"');
        expect(source).toContain('"Hello"');
      });
    });
  });

  describe("given Text with all props", () => {
    describe("when emitting", () => {
      it("then includes size, weight, color, and align as positional args", () => {
        const source = toOpenUILang(
          <Canvas>
            <Text content="Bold text" size="xl" weight="bold" color="green" align="center" />
          </Canvas>,
        );
        expect(source).toContain('"Bold text"');
        expect(source).toContain('"xl"');
        expect(source).toContain('"bold"');
        expect(source).toContain('"green"');
        expect(source).toContain('"center"');
      });
    });
  });

  describe("given a Nerd Font icon glyph", () => {
    describe("when emitting", () => {
      it("then escapes PUA codepoints as \\uXXXX", () => {
        const source = toOpenUILang(
          <Canvas>
            <Icon glyph={"\uf058"} />
          </Canvas>,
        );
        expect(source).toContain("\\uf058");
        // Should not contain the raw PUA character
        expect(source).not.toContain("\uf058");
      });
    });
  });

  describe("given a Stack with direction and gap", () => {
    describe("when emitting", () => {
      it("then includes layout props as positional args", () => {
        const source = roundtrip(
          <Canvas>
            <Stack direction="row" gap="md" align="center" justify="between">
              <Text content="A" />
              <Text content="B" />
            </Stack>
          </Canvas>,
        );
        expect(source).toContain('"row"');
        expect(source).toContain('"md"');
        expect(source).toContain('"center"');
        expect(source).toContain('"between"');
      });
    });
  });

  describe("given a Stack with wrap=true", () => {
    describe("when emitting", () => {
      it("then includes the boolean wrap argument", () => {
        const source = toOpenUILang(
          <Canvas>
            <Stack direction="row" wrap={true}>
              <Text content="A" />
            </Stack>
          </Canvas>,
        );
        expect(source).toContain("true");
      });
    });
  });

  describe("given Badge and Icon components", () => {
    describe("when emitting", () => {
      it("then emits Badge with label and color", () => {
        const source = roundtrip(
          <Canvas>
            <Badge label="OK" color="green" />
            <Icon glyph={"\uf058"} color="accent" size={32} />
          </Canvas>,
        );
        expect(source).toContain('Badge("OK"');
        expect(source).toContain('"green"');
        expect(source).toContain("32");
      });
    });
  });

  describe("given Separator and Spacer", () => {
    describe("when emitting", () => {
      it("then emits them as no-arg calls", () => {
        const source = roundtrip(
          <Canvas>
            <Separator />
            <Spacer />
          </Canvas>,
        );
        expect(source).toContain("Separator()");
        expect(source).toContain("Spacer()");
      });
    });
  });

  describe("given a Card with children", () => {
    describe("when emitting", () => {
      it("then emits Card wrapping child references", () => {
        const source = roundtrip(
          <Canvas>
            <Card>
              <Text content="Inside card" />
            </Card>
          </Canvas>,
        );
        expect(source).toContain("Card(");
        expect(source).toContain('"Inside card"');
      });
    });
  });

  describe("given Alert with all props", () => {
    describe("when emitting", () => {
      it("then emits title, message, icon, and color", () => {
        const source = roundtrip(
          <Canvas>
            <Alert title="Warning" message="Something broke" icon={"\uf071"} color="yellow" />
          </Canvas>,
        );
        expect(source).toContain('"Warning"');
        expect(source).toContain('"Something broke"');
        expect(source).toContain("\\uf071");
        expect(source).toContain('"yellow"');
      });
    });
  });

  describe("given EmptyState with all props", () => {
    describe("when emitting", () => {
      it("then emits all fields", () => {
        const source = roundtrip(
          <Canvas>
            <EmptyState title="No data" message="Try again" icon={"\uf058"} color="muted" />
          </Canvas>,
        );
        expect(source).toContain('"No data"');
        expect(source).toContain('"Try again"');
      });
    });
  });

  describe("given KeyValue component", () => {
    describe("when emitting", () => {
      it("then emits label, value, secondary, color", () => {
        const source = roundtrip(
          <Canvas>
            <KeyValue label="CPU" value="73%" secondary="4 cores" color="green" />
          </Canvas>,
        );
        expect(source).toContain('"CPU"');
        expect(source).toContain('"73%"');
        expect(source).toContain('"4 cores"');
        expect(source).toContain('"green"');
      });
    });
  });

  describe("given Stat component", () => {
    describe("when emitting", () => {
      it("then emits label, value, unit, helper, color", () => {
        const source = roundtrip(
          <Canvas>
            <Stat label="Latency" value="142" unit="ms" helper="p95" color="yellow" />
          </Canvas>,
        );
        expect(source).toContain('"Latency"');
        expect(source).toContain('"142"');
        expect(source).toContain('"ms"');
        expect(source).toContain('"p95"');
      });
    });
  });

  describe("given StatusDot", () => {
    describe("when emitting", () => {
      it("then emits boolean up value", () => {
        const source = toOpenUILang(
          <Canvas>
            <StatusDot up={true} />
            <StatusDot up={false} />
          </Canvas>,
        );
        expect(source).toContain("StatusDot(true)");
        expect(source).toContain("StatusDot(false)");
      });
    });
  });

  describe("given Gauge component", () => {
    describe("when emitting", () => {
      it("then emits label, value, max, unit", () => {
        const source = roundtrip(
          <Canvas>
            <Gauge label="CPU" value={73} max={100} unit="%" />
          </Canvas>,
        );
        expect(source).toContain('"CPU"');
        expect(source).toContain("73");
        expect(source).toContain("100");
        expect(source).toContain('"%"');
      });
    });
  });

  describe("given ProgressBar component", () => {
    describe("when emitting", () => {
      it("then emits all fields", () => {
        const source = roundtrip(
          <Canvas>
            <ProgressBar label="Upload" value={65} max={100} display="65%" color="green" />
          </Canvas>,
        );
        expect(source).toContain('"Upload"');
        expect(source).toContain("65");
      });
    });
  });

  describe("given Sparkline component", () => {
    describe("when emitting", () => {
      it("then emits numeric array values", () => {
        const source = roundtrip(
          <Canvas>
            <Sparkline values={[10, 20, 30, 40, 50]} color="cyan" />
          </Canvas>,
        );
        expect(source).toContain("[10, 20, 30, 40, 50]");
        expect(source).toContain('"cyan"');
      });
    });
  });

  describe("given Table with Col and rows", () => {
    describe("when emitting", () => {
      it("then emits column definitions and row data", () => {
        const source = roundtrip(
          <Canvas>
            <Table
              columns={[
                <Col label="Name" />,
                <Col label="Value" />,
              ]}
              rows={[
                ["Alice", "100"],
                ["Bob", "200"],
              ]}
            />
          </Canvas>,
        );
        expect(source).toContain("Table(");
        expect(source).toContain("Col(");
        expect(source).toContain('"Name"');
        expect(source).toContain('"Alice"');
      });
    });
  });

  describe("given List with ListItems", () => {
    describe("when emitting", () => {
      it("then emits items with all fields", () => {
        const source = roundtrip(
          <Canvas>
            <List
              items={[
                <ListItem text="First" secondary="desc" icon={"\uf03a"} value="42" />,
                <ListItem text="Second" />,
              ]}
            />
          </Canvas>,
        );
        expect(source).toContain("List(");
        expect(source).toContain("ListItem(");
        expect(source).toContain('"First"');
        expect(source).toContain('"Second"');
      });
    });
  });

  describe("given QRCode component", () => {
    describe("when emitting", () => {
      it("then emits data and size", () => {
        const source = toOpenUILang(
          <Canvas>
            <QRCode data="https://example.com" size={300} />
          </Canvas>,
        );
        expect(source).toContain('"https://example.com"');
        expect(source).toContain("300");
      });
    });
  });

  describe("given strings with special characters", () => {
    describe("when emitting", () => {
      it("then escapes quotes and backslashes", () => {
        const source = toOpenUILang(
          <Canvas>
            <Text content={'He said "hello"'} />
          </Canvas>,
        );
        expect(source).toContain('\\"hello\\"');
      });

      it("then escapes newlines", () => {
        const source = toOpenUILang(
          <Canvas>
            <Text content={"line1\nline2"} />
          </Canvas>,
        );
        expect(source).toContain("\\n");
      });
    });
  });

  describe("roundtrip: emit then parse", () => {
    describe("given a complex layout", () => {
      describe("when emitting then parsing", () => {
        it("then the result parses without errors", () => {
          roundtrip(
            <Canvas>
              <Header icon={"\uf201"} title="Dashboard" subtitle="Live" />
              <Content gap="sm">
                <Stack direction="row" gap="md" align="stretch">
                  <Stat label="CPU" value="73" unit="%" color="green" />
                  <Stat label="RAM" value="4.2" unit="GB" color="accent" />
                </Stack>
                <Separator />
                <Card>
                  <Stack direction="row" gap="sm" align="center" justify="between">
                    <Text content="AAPL" size="md" weight="bold" color="muted" />
                    <Text content="$178.52" size="lg" weight="bold" />
                  </Stack>
                  <Sparkline values={[170, 172, 175, 173, 178]} color="green" />
                </Card>
                <Alert title="Notice" message="Deploy paused" icon={"\uf071"} color="yellow" />
              </Content>
              <Timestamp />
            </Canvas>,
          );
        });
      });
    });
  });

  describe("variable naming", () => {
    describe("given multiple components of the same type", () => {
      it("then generates unique variable names", () => {
        const source = toOpenUILang(
          <Canvas>
            <Text content="A" />
            <Text content="B" />
            <Text content="C" />
          </Canvas>,
        );
        // Should have text, text2, text3 (or similar numbering scheme)
        const lines = source.split("\n");
        const ids = lines.map((l) => l.split(" = ")[0]);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });
  });

  describe("statement ordering", () => {
    describe("given a tree with dependencies", () => {
      it("then root comes first in the output", () => {
        const source = toOpenUILang(
          <Canvas>
            <Text content="Hello" />
          </Canvas>,
        );
        const lines = source.trim().split("\n");
        expect(lines[0]).toStartWith("root = Canvas(");
      });
    });
  });
});
