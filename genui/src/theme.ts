import { readFileSync } from "fs";
import { resolve, dirname } from "path";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

let themeColors: Record<string, [number, number, number]> = {};

export function loadTheme(path: string): void {
  const data: Record<string, string> = JSON.parse(readFileSync(path, "utf-8"));
  themeColors = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === "string") {
      themeColors[key.toLowerCase()] = hexToRgb(val);
    }
  }
}

// Load default theme
const defaultThemePath = resolve(
  dirname(new URL(import.meta.url).pathname),
  "../theme.json",
);
loadTheme(defaultThemePath);

export function resolveColor(s: string): string {
  if (s.startsWith("#")) return s;
  const rgb = themeColors[s.toLowerCase()];
  if (rgb) return rgbToHex(rgb);
  return "#f8f8f8";
}

export function resolveColorRgb(s: string): [number, number, number] {
  if (s.startsWith("#")) return hexToRgb(s);
  return themeColors[s.toLowerCase()] ?? [248, 248, 248];
}

export function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = resolveColorRgb(a);
  const [br, bg, bb] = resolveColorRgb(b);
  return rgbToHex([
    Math.round(ar + (br - ar) * t),
    Math.round(ag + (bg - ag) * t),
    Math.round(ab + (bb - ab) * t),
  ]);
}
