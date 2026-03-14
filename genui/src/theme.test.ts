import { describe, it, expect, beforeEach } from "bun:test";
import { loadTheme, resolveColor, resolveColorRgb, lerpColor } from "./theme";
import { resolve, dirname } from "path";

const THEME_PATH = resolve(
  dirname(new URL(import.meta.url).pathname),
  "../theme.json",
);

describe("theme", () => {
  beforeEach(() => {
    loadTheme(THEME_PATH);
  });

  describe("resolveColor", () => {
    describe("given a base16 key", () => {
      it("then returns the hex color from the theme", () => {
        expect(resolveColor("base00")).toBe("#191033");
        expect(resolveColor("base05")).toBe("#f8f8f8");
        expect(resolveColor("base08")).toBe("#ff628c");
      });
    });

    describe("given a key with different casing", () => {
      it("then resolves case-insensitively", () => {
        expect(resolveColor("Base00")).toBe("#191033");
        expect(resolveColor("BASE05")).toBe("#f8f8f8");
      });
    });

    describe("given a hex string", () => {
      it("then returns it unchanged", () => {
        expect(resolveColor("#abcdef")).toBe("#abcdef");
        expect(resolveColor("#000000")).toBe("#000000");
      });
    });

    describe("given an unknown key", () => {
      it("then returns the fallback color", () => {
        expect(resolveColor("nonexistent")).toBe("#f8f8f8");
      });
    });
  });

  describe("resolveColorRgb", () => {
    describe("given a base16 key", () => {
      it("then returns RGB tuple", () => {
        expect(resolveColorRgb("base00")).toEqual([25, 16, 51]);
        expect(resolveColorRgb("base05")).toEqual([248, 248, 248]);
      });
    });

    describe("given a hex string", () => {
      it("then parses it to RGB", () => {
        expect(resolveColorRgb("#ff0000")).toEqual([255, 0, 0]);
        expect(resolveColorRgb("#00ff00")).toEqual([0, 255, 0]);
        expect(resolveColorRgb("#0000ff")).toEqual([0, 0, 255]);
      });
    });

    describe("given an unknown key", () => {
      it("then returns the fallback RGB", () => {
        expect(resolveColorRgb("nonexistent")).toEqual([248, 248, 248]);
      });
    });
  });

  describe("lerpColor", () => {
    describe("given t=0", () => {
      it("then returns the first color", () => {
        expect(lerpColor("#000000", "#ffffff", 0)).toBe("#000000");
      });
    });

    describe("given t=1", () => {
      it("then returns the second color", () => {
        expect(lerpColor("#000000", "#ffffff", 1)).toBe("#ffffff");
      });
    });

    describe("given t=0.5", () => {
      it("then returns the midpoint color", () => {
        const result = lerpColor("#000000", "#ffffff", 0.5);
        // Each channel: round(0 + 255 * 0.5) = 128
        expect(result).toBe("#808080");
      });
    });

    describe("given base16 keys", () => {
      it("then resolves keys before interpolating", () => {
        const result = lerpColor("base00", "base05", 0);
        expect(result).toBe(resolveColor("base00"));
      });
    });
  });

  describe("loadTheme", () => {
    describe("given a valid theme file", () => {
      it("then subsequent resolveColor calls use the new theme", () => {
        const before = resolveColor("base00");
        // Reload same theme — should still work
        loadTheme(THEME_PATH);
        expect(resolveColor("base00")).toBe(before);
      });
    });
  });
});
