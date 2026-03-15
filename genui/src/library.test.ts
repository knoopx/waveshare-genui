import { describe, it, expect } from "bun:test";
import { library, promptOptions } from "./library";

describe("library", () => {
  describe("component registry", () => {
    const EXPECTED_COMPONENTS = [
      "Canvas",
      "Header",
      "Row",
      "Col",
      "Card",
      "Separator",
      "Spacer",
      "Text",
      "Icon",
      "Badge",
      "CodeBlock",
      "Alert",
      "EmptyState",
      "Timestamp",
      "Table",
      "TableCol",
      "List",
      "ListItem",
      "KeyValue",
      "Stat",
      "Steps",
      "StepsItem",
      "TagBlock",
      "Tag",
      "Gauge",
      "ProgressBar",
      "Sparkline",
      "StatusDot",
      "QRCode",
      "Image",
    ];

    describe("given the library", () => {
      it("then contains all expected components", () => {
        const registered = Object.keys(library.components);
        for (const name of EXPECTED_COMPONENTS) {
          expect(registered).toContain(name);
        }
      });

      it("then has no unexpected components", () => {
        const registered = Object.keys(library.components);
        for (const name of registered) {
          expect(EXPECTED_COMPONENTS).toContain(name);
        }
      });

      it("then root is Canvas", () => {
        expect(library.root).toBe("Canvas");
      });
    });

    describe("given each registered component", () => {
      const entries = Object.entries(library.components);

      entries.forEach(([name, def]) => {
        describe(`"${name}"`, () => {
          it("then has a name matching its key", () => {
            expect(def.name).toBe(name);
          });

          it("then has a non-empty description", () => {
            expect(def.description.length).toBeGreaterThan(0);
          });

          it("then has a component renderer function", () => {
            expect(typeof def.component).toBe("function");
          });

          it("then has a zod props schema", () => {
            expect(def.props).toBeDefined();
          });
        });
      });
    });
  });

  describe("component groups", () => {
    describe("given the library groups", () => {
      it("then groups are defined", () => {
        expect(library.componentGroups).toBeDefined();
        expect(library.componentGroups!.length).toBeGreaterThan(0);
      });

      it("then every grouped component exists in the registry", () => {
        for (const group of library.componentGroups!) {
          for (const compName of group.components) {
            expect(library.components[compName]).toBeDefined();
          }
        }
      });

      it("then groups cover all registered components", () => {
        const grouped = new Set(
          library.componentGroups!.flatMap((g) => g.components),
        );
        for (const name of Object.keys(library.components)) {
          expect(grouped.has(name)).toBe(true);
        }
      });
    });
  });

  describe("JSON schema generation", () => {
    describe("given the library", () => {
      describe("when generating JSON schema", () => {
        it("then returns a valid schema object", () => {
          const schema = library.toJSONSchema();
          expect(schema).toBeDefined();
          expect(typeof schema).toBe("object");
        });

        it("then has $defs for all components", () => {
          const schema = library.toJSONSchema() as { $defs?: Record<string, unknown> };
          expect(schema.$defs).toBeDefined();
          for (const name of Object.keys(library.components)) {
            expect(schema.$defs![name]).toBeDefined();
          }
        });
      });
    });
  });

  describe("prompt generation", () => {
    describe("given prompt options", () => {
      describe("when generating a prompt", () => {
        it("then includes the preamble", () => {
          const prompt = library.prompt(promptOptions);
          expect(prompt).toContain("720×720");
        });

        it("then includes component descriptions", () => {
          const prompt = library.prompt(promptOptions);
          expect(prompt).toContain("Canvas");
          expect(prompt).toContain("Header");
          expect(prompt).toContain("Text");
        });

        it("then includes examples", () => {
          const prompt = library.prompt(promptOptions);
          expect(prompt).toContain("Example");
        });

        it("then includes additional rules", () => {
          const prompt = library.prompt(promptOptions);
          expect(prompt).toContain("semantic color");
        });

        it("then is a non-trivial length", () => {
          const prompt = library.prompt(promptOptions);
          expect(prompt.length).toBeGreaterThan(500);
        });
      });
    });

    describe("given no prompt options", () => {
      describe("when generating a prompt", () => {
        it("then still produces output with component info", () => {
          const prompt = library.prompt();
          expect(prompt).toContain("Canvas");
          expect(prompt.length).toBeGreaterThan(100);
        });
      });
    });
  });
});
