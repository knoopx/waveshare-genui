/**
 * Design tokens — single source of truth for visual consistency.
 */

import { resolveColor, lerpColor } from "./theme";

// ─── Display ──────────────────────────────────────────────────────────────────

export const DISPLAY_WIDTH = 720;
export const DISPLAY_HEIGHT = 720;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export type SpaceKey = keyof typeof SPACE;

export const PADDING = 24;

// ─── Row heights ──────────────────────────────────────────────────────────────

export const ROW_SINGLE = 52;
export const ROW_DOUBLE = 76;
export const ROW_DETAIL = 48;

// ─── Theme base colors ────────────────────────────────────────────────────────

export const BG = resolveColor("base00");
export const FG = resolveColor("base05");
export const ACCENT = resolveColor("base0A");

// ─── Surface colors (derived from BG/FG blending) ────────────────────────────

export const surface = {
  muted: () => lerpColor(FG, BG, 0.3),
  dim: () => lerpColor(FG, BG, 0.45),
  separator: () => lerpColor(BG, FG, 0.1),
  track: () => lerpColor(BG, FG, 0.08),
  card: () => lerpColor(BG, FG, 0.04),
  elevated: () => lerpColor(BG, FG, 0.06),
  overlay: () => lerpColor(BG, FG, 0.12),
} as const;

// ─── Semantic colors ──────────────────────────────────────────────────────────

export const SEMANTIC_COLOR_NAMES = [
  "default",
  "muted",
  "accent",
  "green",
  "red",
  "yellow",
  "cyan",
  "orange",
  "purple",
] as const;

export type SemanticColor = (typeof SEMANTIC_COLOR_NAMES)[number];

const SEMANTIC_MAP: Record<SemanticColor, () => string> = {
  default: () => FG,
  muted: surface.muted,
  accent: () => ACCENT,
  green: () => resolveColor("base0B"),
  red: () => resolveColor("base08"),
  yellow: () => resolveColor("base0A"),
  cyan: () => resolveColor("base0C"),
  orange: () => resolveColor("base09"),
  purple: () => resolveColor("base0E"),
};

export function semanticColor(name: string): string {
  const fn = SEMANTIC_MAP[name as SemanticColor];
  return fn ? fn() : FG;
}

// ─── Palette (for indexed items like list bullets) ────────────────────────────

export function paletteColor(i: number): string {
  const palette = [
    semanticColor("accent"),
    semanticColor("green"),
    semanticColor("orange"),
    semanticColor("purple"),
    semanticColor("red"),
    semanticColor("cyan"),
    semanticColor("yellow"),
    FG,
  ];
  return palette[i % palette.length];
}

// ─── Font ─────────────────────────────────────────────────────────────────────

export const FONT = {
  xs: 20,
  sm: 22,
  md: 26,
  lg: 30,
  xl: 36,
  "2xl": 44,
  "3xl": 80,
} as const;

export type FontSize = keyof typeof FONT;

export const FONT_WEIGHT = {
  normal: 400,
  bold: 700,
} as const;

// ─── Radii ────────────────────────────────────────────────────────────────────

export const RADIUS = {
  xs: 3,
  sm: 8,
  md: 16,
  pill: 999,
} as const;

// ─── Icon sizes ───────────────────────────────────────────────────────────────

export const ICON_SIZE = {
  sm: 28,
  md: 32,
  lg: 40,
} as const;

// ─── Core UI element tokens ───────────────────────────────────────────────────

export const UI = {
  canvas: {
    width: DISPLAY_WIDTH,
    height: DISPLAY_HEIGHT,
  },
  header: {
    accentBarHeight: 6,
    paddingTop: PADDING,
    paddingX: PADDING,
    iconSize: ICON_SIZE.md,
    titleSize: FONT.lg,
    subtitleSize: FONT.sm,
    contentGap: SPACE.md,
    sectionGap: SPACE.lg,
    dividerInset: PADDING,
  },
  content: {
    paddingTop: SPACE.lg,
    paddingX: PADDING,
    paddingBottom: PADDING,
    defaultGap: SPACE.md,
  },
  text: {
    lineHeight: 1.2,
  },
  badge: {
    fontSize: FONT.sm,
    paddingX: SPACE.sm,
    paddingY: SPACE.xs,
    radius: RADIUS.pill,
  },
  alert: {
    padding: SPACE.md,
    gap: SPACE.md,
    radius: RADIUS.md,
    titleSize: FONT.md,
    messageSize: FONT.sm,
    iconSize: ICON_SIZE.md,
    background: surface.elevated,
  },
  emptyState: {
    gap: SPACE.md,
    iconSize: 64,
    titleSize: FONT.xl,
    messageSize: FONT.md,
    maxWidth: 480,
  },
  card: {
    padding: SPACE.md,
    radius: RADIUS.md,
    background: surface.card,
  },
  keyValue: {
    minHeight: ROW_SINGLE,
    gap: SPACE.md,
    labelSize: FONT.sm,
    valueSize: FONT.md,
    secondarySize: FONT.sm,
  },
  stat: {
    padding: SPACE.md,
    gap: SPACE.xs,
    radius: RADIUS.md,
    labelSize: FONT.sm,
    valueSize: FONT["2xl"],
    unitSize: FONT.md,
    helperSize: FONT.sm,
    background: surface.card,
  },
  separator: {
    thickness: 2,
    color: surface.separator,
  },
  table: {
    headerHeight: ROW_DETAIL,
    rowHeight: ROW_DETAIL,
    headerFontSize: FONT.md,
    cellFontSize: FONT.sm,
    cellPaddingX: SPACE.xs,
    zebraBackground: surface.card,
  },
  list: {
    rowSingleHeight: ROW_SINGLE,
    rowDoubleHeight: ROW_DOUBLE,
    rowGap: SPACE.lg,
    rowPaddingY: SPACE.xs,
    bulletWidth: 8,
    bulletRadius: RADIUS.xs,
    textSize: FONT.md,
    secondarySize: FONT.sm,
    valueSize: FONT.md,
    valueMaxWidth: "30%",
  },
  progressBar: {
    labelGap: SPACE.sm,
    height: 20,
  },
  gauge: {
    defaultSize: 240,
    stroke: 14,
  },
  sparkline: {
    stroke: 2,
    height: 40,
    pad: 2,
  },
  statusDot: {
    size: 16,
  },
  timestamp: {
    inset: PADDING,
    fontSize: FONT.sm,
  },
  qrcode: {
    defaultSize: 400,
  },
} as const;

export const ACCENT_BAR_HEIGHT = UI.header.accentBarHeight;

// ─── Component-specific sizes ─────────────────────────────────────────────────

export const SIZE = {
  separator: UI.separator.thickness,
  statusDot: UI.statusDot.size,
  listBulletWidth: UI.list.bulletWidth,
  listBulletHeight: 14,
  progressBarHeight: UI.progressBar.height,
  gaugeStroke: UI.gauge.stroke,
  gaugeDefault: UI.gauge.defaultSize,
  sparklineStroke: UI.sparkline.stroke,
  sparklineHeight: UI.sparkline.height,
  sparklinePad: UI.sparkline.pad,
  svgViewBoxWidth: 600,
  qrCodeDefault: UI.qrcode.defaultSize,
} as const;

// ─── Gauge arc geometry ───────────────────────────────────────────────────────

export const GAUGE = {
  arcStart: -135,
  arcEnd: 135,
  arcSweep: 2.7,
  valueFontRatio: 0.22,
  unitFontRatio: 0.12,
  labelFontRatio: 0.12,
  labelBottomRatio: 0.08,
} as const;
