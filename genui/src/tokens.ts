/**
 * Design tokens — single source of truth for visual consistency.
 *
 * Everything lives under `UI`. No other exported constants.
 * `semanticColor()` is the only exported function.
 */

import { resolveColor, lerpColor } from "./theme";

// ─── Private building blocks (used only to assemble UI) ──────────────────────

const DISPLAY = { width: 720, height: 720 } as const;
const PADDING = 24;

const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
const FONT = { xs: 20, sm: 22, md: 26, lg: 30, xl: 36, "2xl": 44, "3xl": 80 } as const;
const FONT_WEIGHT = { normal: 400, bold: 700 } as const;
const RADIUS = { xs: 3, sm: 8, md: 16, pill: 999 } as const;
const ICON_SIZE = { sm: 28, md: 32, lg: 40, xl: 48, "2xl": 64 } as const;
const ROW = { single: 52, double: 76, detail: 48 } as const;

const BG = resolveColor("base00");
const FG = resolveColor("base05");
const ACCENT = resolveColor("base0A");

const surface = {
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
  "default", "muted", "accent",
  "green", "red", "yellow", "cyan", "orange", "purple",
] as const;

export type SemanticColor = (typeof SEMANTIC_COLOR_NAMES)[number];

/** Semantic name or hex string — preserves autocomplete for semantic names. */
export type Color = SemanticColor | (string & {});

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

export function semanticColor(name: SemanticColor | (string & {})): string {
  const fn = SEMANTIC_MAP[name as SemanticColor];
  if (fn) return fn();
  if (name.startsWith("#")) return name;
  return FG;
}

// ─── Icon registry ────────────────────────────────────────────────────────────

const ICONS = {
  // Status
  check: "\uf058",
  warning: "\uf071",
  error: "\uf06a",
  info: "\uf05a",
  question: "\uf059",

  // Navigation / UI
  home: "\uf015",
  search: "\uf002",
  settings: "\uf085",
  menu: "\uf0c9",
  list: "\uf03a",
  grid: "\uf00a",
  edit: "\uf044",
  sync: "\uf021",
  refresh: "\uf021",
  filter: "\uf0b0",
  layers: "\uf0328",
  compass: "\uf14e",
  map: "\uf279",

  // Objects
  clock: "\uf017",
  calendar: "\uf073",
  mail: "\uf0e0",
  bell: "\uf0f3",
  lock: "\uf023",
  key: "\uf084",
  globe: "\uf0ac",
  link: "\uf0c1",
  file: "\uf15b",
  folder: "\uf07b",
  image: "\uf03e",
  music: "\uf001",
  video: "\uf008",
  camera: "\uf030",
  lightbulb: "\uf0eb",
  bolt: "\uf0e7",
  fire: "\uf06d",
  tag: "\uf02c",
  bookmark: "\uf02e",
  star: "\uf005",
  heart: "\uf004",
  user: "\uf007",
  users: "\uf0c0",
  cart: "\uf07a",
  box: "\ued75",
  clipboard: "\uf07f",
  pin: "\uf08d",
  wrench: "\uf0ad",
  eye: "\uf06e",
  hash: "\uf292",
  at: "\uf1fa",
  percent: "\uf295",
  infinity: "\uedfe",
  fingerprint: "\uee40",
  database: "\uf1c0",
  server: "\uf233",
  desktop: "\uf108",
  cloud: "\uf0c2",
  wifi: "\uf1eb",
  bluetooth: "\uf293",
  rss: "\uf09e",
  power: "\uf011",
  battery: "\uf0079",
  phone: "\uf095",
  headphones: "\uf025",
  microphone: "\uf130",

  // Weather
  sun: "\uf185",
  moon: "\uf186",
  rain: "\uf0e9",
  snow: "\uf2dc",
  wind: "\uef16",

  // Arrows / Direction
  up: "\uf062",
  down: "\uf063",
  left: "\uf060",
  right: "\uf061",
  location: "\uf124",

  // Data / Charts
  chart: "\uf201",
  bars: "\uf080",
  table: "\uf0ce",
  steps: "\uf0ae",

  // Actions
  play: "\uf04b",
  pause: "\uf04c",
  stop: "\uf04d",
  download: "\uf019",
  upload: "\uf093",
  trash: "\uf1f8",
  plus: "\uf067",
  minus: "\uf068",
  toggle: "\uf205",

  // Development
  code: "\uf121",
  bug: "\uf188",
  git: "\uf126",
  github: "\uf09b",
  terminal: "\uf120",
  cpu: "\uf2db",
  memory: "\uefc5",
  disk: "\uf0a0",
  thermometer: "\uf2c9",

  // Transport
  train: "\uf238",
  rocket: "\uf135",

  // Brands / Tech
  docker: "\uf308",
  nix: "\uf313",
  react: "\uf41b",
  rust: "\ue7a8",
  python: "\ue73c",
  typescript: "\ue8ca",
  javascript: "\ue74e",
  nodejs: "\ue719",
  npm: "\ue71e",
  java: "\ue738",
  go: "\ue724",
  ruby: "\ue739",
  php: "\ue73d",
  swift: "\ue755",
  kotlin: "\ue81b",
  lua: "\ue826",
  vim: "\ue7c5",
  neovim: "\ue83a",
  kubernetes: "\ue81d",
  terraform: "\ue8bd",
  aws: "\ue7ad",
  linux: "\uf17c",
  windows: "\uf17a",
  apple: "\uf179",
  android: "\uf17b",
  chrome: "\uf268",
  firefox: "\uf269",

  // Social
  hackernews: "\uf2e5",
  reddit: "\uf1a1",
  twitter: "\uf099",
  discord: "\uf1ff",
  slack: "\uf198",
  telegram: "\uf2c6",
  youtube: "\uf16a",
  twitch: "\uf1e8",
  spotify: "\uf1bc",

  // Misc
  circle: "\uf111",
  dot: "\uf192",
  shield: "\uf132",
  flag: "\uf024",
  trophy: "\uf091",
  monitor: "\uf21b",
  qrcode: "\uf029",
  palette: "\uefcc",
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export const GAUGE_SIZE_NAMES = ["sm", "md", "lg", "xl"] as const;
export type GaugeSize = (typeof GAUGE_SIZE_NAMES)[number];

export const ICON_SIZE_NAMES = ["sm", "md", "lg", "xl", "2xl"] as const;
export type IconSize = (typeof ICON_SIZE_NAMES)[number];

export const QRCODE_SIZE_NAMES = ["sm", "md", "lg"] as const;
export type QRCodeSize = (typeof QRCODE_SIZE_NAMES)[number];

export function resolveIcon(name: string): string {
  return ICONS[name as IconName] ?? name;
}

// ─── UI — the single exported token tree ──────────────────────────────────────

export const UI = {
  color: { bg: BG, fg: FG, accent: ACCENT },
  surface,
  space: SPACE,
  font: FONT,
  fontWeight: FONT_WEIGHT,
  fontFamily: { text: "Inter", icon: "Nerd" },
  radius: RADIUS,

  canvas: {
    width: DISPLAY.width,
    height: DISPLAY.height,
  },
  header: {
    accentBarHeight: 6,
    paddingTop: PADDING,
    paddingX: PADDING,
    iconSize: ICON_SIZE.md,
    titleSize: FONT.lg,
    subtitleSize: FONT.sm,
    titleMaxLines: 3,
    contentGap: SPACE.md,
    sectionGap: SPACE.lg,
    dividerInset: PADDING,
  },
  content: {
    paddingTop: SPACE.lg,
    paddingX: PADDING,
    paddingBottom: PADDING + FONT.sm + SPACE.sm,
    defaultGap: SPACE.md,
  },
  text: {
    lineHeight: 1.2,
  },
  icon: {
    size: ICON_SIZE,
  },
  badge: {
    fontSize: FONT.sm,
    paddingX: SPACE.md,
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
    minHeight: ROW.single,
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
    headerHeight: ROW.detail,
    rowHeight: ROW.detail,
    headerFontSize: FONT.md,
    cellFontSize: FONT.sm,
    cellPaddingX: SPACE.xs,
    zebraBackground: surface.card,
  },
  list: {
    rowSingleHeight: ROW.single,
    rowDoubleHeight: ROW.double,
    rowGap: SPACE.lg,
    rowPaddingY: SPACE.xs,
    bulletWidth: 8,
    bulletRadius: RADIUS.xs,
    iconSize: ICON_SIZE.sm,
    textSize: FONT.md,
    secondarySize: FONT.sm,
    valueSize: FONT.md,
    valueMaxWidth: "30%",
  },
  progressBar: {
    labelGap: SPACE.sm,
    labelSize: FONT.lg,
    valueSize: FONT.md,
    height: 20,
  },
  gauge: {
    size: { sm: 160, md: 240, lg: 320, xl: 480 } as const,
    stroke: 14,
    arcStart: -135,
    arcEnd: 135,
    arcSweep: 2.7,
    valueFontRatio: 0.22,
    unitFontRatio: 0.12,
    labelFontRatio: 0.12,
    labelBottomRatio: 0.08,
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
  codeBlock: {
    languageSize: FONT.xs,
    codeSize: FONT.sm,
    codeLineHeight: 1.4,
  },
  steps: {
    gap: SPACE.sm,
    circleSize: 32,
    numberSize: FONT.sm,
    titleSize: FONT.md,
    detailsSize: FONT.sm,
  },
  tagBlock: {
    gap: SPACE.sm,
    iconSize: FONT.sm,
    textSize: FONT.sm,
  },
  qrcode: {
    size: { sm: 200, md: 400, lg: 480 } as const,
  },
  image: {
    defaultWidth: DISPLAY.width,
    defaultHeight: DISPLAY.height,
  },
  svgViewBoxWidth: 600,
} as const;
