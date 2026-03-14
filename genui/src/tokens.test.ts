import { describe, it, expect } from "bun:test";
import {
  semanticColor,
  paletteColor,
  SPACE,
  FONT,
  FONT_WEIGHT,
  DISPLAY_WIDTH,
  DISPLAY_HEIGHT,
  SEMANTIC_COLOR_NAMES,
  FG,
  BG,
  ACCENT,
} from "./tokens";

describe("tokens", () => {
  describe("display dimensions", () => {
    it("then width and height are 720", () => {
      expect(DISPLAY_WIDTH).toBe(720);
      expect(DISPLAY_HEIGHT).toBe(720);
    });
  });

  describe("spacing scale", () => {
    it("then follows the expected progression", () => {
      expect(SPACE.xs).toBe(4);
      expect(SPACE.sm).toBe(8);
      expect(SPACE.md).toBe(16);
      expect(SPACE.lg).toBe(24);
      expect(SPACE.xl).toBe(32);
    });

    it("then each step is larger than the previous", () => {
      const values = Object.values(SPACE);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe("font scale", () => {
    it("then contains all expected sizes", () => {
      expect(FONT.xs).toBe(20);
      expect(FONT.sm).toBe(22);
      expect(FONT.md).toBe(26);
      expect(FONT.lg).toBe(30);
      expect(FONT.xl).toBe(36);
      expect(FONT["2xl"]).toBe(44);
      expect(FONT["3xl"]).toBe(80);
    });

    it("then font weights are standard values", () => {
      expect(FONT_WEIGHT.normal).toBe(400);
      expect(FONT_WEIGHT.bold).toBe(700);
    });
  });

  describe("base theme colors", () => {
    it("then BG, FG, and ACCENT are valid hex strings", () => {
      expect(BG).toMatch(/^#[0-9a-f]{6}$/);
      expect(FG).toMatch(/^#[0-9a-f]{6}$/);
      expect(ACCENT).toMatch(/^#[0-9a-f]{6}$/);
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
        expect(semanticColor("default")).toBe(FG);
      });
    });

    describe("given an unknown color name", () => {
      it("then falls back to foreground", () => {
        expect(semanticColor("nonexistent")).toBe(FG);
        expect(semanticColor("")).toBe(FG);
      });
    });
  });

  describe("paletteColor", () => {
    describe("given sequential indices", () => {
      it("then returns different colors for first several indices", () => {
        const colors = new Set(Array.from({ length: 7 }, (_, i) => paletteColor(i)));
        expect(colors.size).toBeGreaterThanOrEqual(5);
      });
    });

    describe("given indices beyond palette length", () => {
      it("then wraps around cyclically", () => {
        // Palette has 8 entries
        expect(paletteColor(0)).toBe(paletteColor(8));
        expect(paletteColor(1)).toBe(paletteColor(9));
      });
    });

    describe("given any index", () => {
      it("then returns a valid hex color", () => {
        for (let i = 0; i < 20; i++) {
          expect(paletteColor(i)).toMatch(/^#[0-9a-f]{6}$/);
        }
      });
    });
  });
});
