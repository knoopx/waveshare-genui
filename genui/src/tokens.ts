/**
 * Design tokens — single source of truth for visual consistency.
 * All values are numbers (pixels) or ratios (0–1 for lerp).
 */

import { resolveColor, lerpColor } from "./theme";

// Display dimensions
export const DISPLAY_WIDTH = 720;
export const DISPLAY_HEIGHT = 720;

// Spacing
export const SPACE = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
} as const;

export const PADDING = SPACE.xxxl;
export const ACCENT_BAR_HEIGHT = SPACE.xs;

// Row heights
export const ROW_SINGLE = 52;
export const ROW_DOUBLE = 76;
export const ROW_DETAIL = 48;

// Lerp ratios (FG→BG blending)
export const MUTED_RATIO = 0.3;
export const DIM_RATIO = 0.4;
export const SEP_RATIO = 0.1;
export const TRACK_RATIO = 0.08;
export const CARD_BG_RATIO = 0.04;

// Resolved theme colors
export const BG = resolveColor("base00");
export const FG = resolveColor("base05");
export const ACCENT = resolveColor("base0A");

// Derived colors
export const muted = () => lerpColor(FG, BG, MUTED_RATIO);
export const dim = () => lerpColor(FG, BG, DIM_RATIO);
export const separator = () => lerpColor(BG, FG, SEP_RATIO);
export const track = () => lerpColor(BG, FG, TRACK_RATIO);
export const cardBackground = () => lerpColor(BG, FG, CARD_BG_RATIO);

// Font sizes
export const FONT = {
  xs: 20,
  sm: 22,
  md: 26,
  lg: 30,
  xl: 36,
  "2xl": 44,
  "3xl": 80,
} as const;

export const FONT_WEIGHT = {
  normal: 400,
  bold: 700,
} as const;

export const RADIUS = {
  xs: 3,
  sm: 8,
  md: 16,
  round: 999,
} as const;

export const ICON_SIZE = {
  sm: 28,
  md: 32,
  lg: 40,
} as const;

export const SIZE = {
  separator: 2,
  statusDot: 16,
  statusDotRadius: 8,
  listBulletWidth: 8,
  listBulletHeight: 14,
  progressBarHeight: 20,
  gaugeStroke: 14,
} as const;

// Color palette for indexed items
export const PALETTE = [
  resolveColor("base0A"),
  resolveColor("base0B"),
  resolveColor("base09"),
  resolveColor("base0F"),
  resolveColor("base08"),
  resolveColor("base0C"),
  resolveColor("base0E"),
  resolveColor("base05"),
];

export const GREEN = resolveColor("base0B");
export const RED = resolveColor("base08");
export const CYAN = resolveColor("base0C");
export const YELLOW = resolveColor("base0A");
export const ORANGE = resolveColor("base09");
export const PURPLE = resolveColor("base0E");
