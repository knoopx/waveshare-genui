import { describe, it, expect } from "bun:test";
import { UI, semanticColor, SEMANTIC_COLOR_NAMES } from "./tokens";

describe("tokens", () => {
  describe("display dimensions", () => {
    it("then width and height are 720", () => {
      expect(UI.canvas.width).toBe(720);
      expect(UI.canvas.height).toBe(720);
    });
  });

  describe("spacing scale", () => {
    it("then follows the expected progression", () => {
      expect(UI.space.xs).toBe(4);
      expect(UI.space.sm).toBe(8);
      expect(UI.space.md).toBe(16);
      expect(UI.space.lg).toBe(24);
      expect(UI.space.xl).toBe(32);
    });

    it("then each step is larger than the previous", () => {
      const values = Object.values(UI.space);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe("font scale", () => {
    it("then contains all expected sizes", () => {
      expect(UI.font.xs).toBe(20);
      expect(UI.font.sm).toBe(22);
      expect(UI.font.md).toBe(26);
      expect(UI.font.lg).toBe(30);
      expect(UI.font.xl).toBe(36);
      expect(UI.font["2xl"]).toBe(44);
      expect(UI.font["3xl"]).toBe(80);
    });

    it("then font weights are standard values", () => {
      expect(UI.fontWeight.normal).toBe(400);
      expect(UI.fontWeight.bold).toBe(700);
    });
  });

  describe("base theme colors", () => {
    it("then bg, fg, and accent are valid hex strings", () => {
      expect(UI.color.bg).toMatch(/^#[0-9a-f]{6}$/);
      expect(UI.color.fg).toMatch(/^#[0-9a-f]{6}$/);
      expect(UI.color.accent).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe("semanticColor", () => {
    describe("given each valid semantic color name", () => {
      SEMANTIC_COLOR_NAMES.forEach((name) => {
        it(`then "${name}" returns a valid hex color`, () => {
          const color = semanticColor(name);
          expect(color).toMatch(/^#[0-9a-f]{6}$/);
        });
      });
    });

    describe("given 'default'", () => {
      it("then returns the foreground color", () => {
        expect(semanticColor("default")).toBe(UI.color.fg);
      });
    });

    describe("given a hex color string", () => {
      it("then passes it through", () => {
        expect(semanticColor("#ff0000")).toBe("#ff0000");
        expect(semanticColor("#E21B24")).toBe("#E21B24");
      });
    });

    describe("given an unknown color name", () => {
      it("then falls back to foreground", () => {
        expect(semanticColor("nonexistent")).toBe(UI.color.fg);
        expect(semanticColor("")).toBe(UI.color.fg);
      });
    });

  });
});
