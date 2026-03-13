/**
 * Waveshare Display UI components — OpenUI-compatible.
 *
 * Each component has a zod schema, description, and satori-compatible renderer.
 */

import React from "react";
import { z } from "zod";

void React;
import { defineComponent } from "@openuidev/react-lang";
import {
  BG,
  FG,
  ACCENT,
  FONT,
  FONT_WEIGHT,
  ICON_SIZE,
  PADDING,
  SPACE,
  RADIUS,
  SIZE,
  DISPLAY_WIDTH,
  DISPLAY_HEIGHT,
  ACCENT_BAR_HEIGHT,
  ROW_SINGLE,
  ROW_DOUBLE,
  ROW_DETAIL,

  GREEN,
  RED,
  YELLOW,
  CYAN,
  ORANGE,
  PURPLE,
  PALETTE,
  muted,
  dim,
  separator,
  track,
  cardBackground,
} from "./tokens";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paletteColor(i: number): string {
  return PALETTE[i % PALETTE.length];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start[0]} ${start[1]} A ${r} ${r} 0 ${large} 0 ${end[0]} ${end[1]}`;
}

function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : v != null ? [v] : [];
}

function percent(value: number, max: number): number {
  return max > 0 ? (value / max) * 100 : 0;
}

const ElementChild = z.object({
  type: z.literal("element"),
  typeName: z.string(),
  props: z.object({}).passthrough(),
  partial: z.boolean().optional(),
});

// ─── Layout components ────────────────────────────────────────────────────────

export const Stack = defineComponent({
  name: "Stack",
  props: z.object({
    children: z.array(ElementChild),
    direction: z.enum(["row", "column"]).optional(),
    gap: z.enum(["none", "xs", "s", "m", "l", "xl"]).optional(),
    align: z.enum(["start", "center", "end", "stretch"]).optional(),
    justify: z.enum(["start", "center", "end", "between", "around"]).optional(),
    wrap: z.boolean().optional(),
  }),
  description:
    'Flex container. Root layout component. direction: "row"|"column" (default "column"). gap sizes: none=0, xs=4, s=8, m=16, l=24, xl=32.',
  component: ({ props, renderNode }) => {
    const gapMap: Record<string, number> = { none: 0, xs: 4, s: 8, m: 16, l: 24, xl: 32 };
    const alignMap: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
    const justifyMap: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around" };
    const justify = (props.justify as string) ?? "start";
    const needsSpace = justify === "center" || justify === "between" || justify === "around";
    return (
      <div
        style={{
          display: "flex",
          flexDirection: ((props.direction as string) ?? "column") as "row" | "column",
          gap: gapMap[(props.gap as string) ?? "m"] ?? 16,
          alignItems: alignMap[(props.align as string) ?? "stretch"] ?? "stretch",
          justifyContent: justifyMap[justify] ?? "flex-start",
          ...(needsSpace ? { flexGrow: 1 } : {}),
          ...(props.wrap ? { flexWrap: "wrap" } : {}),
        }}
      >
        {renderNode(props.children)}
      </div>
    );
  },
});

export const Canvas = defineComponent({
  name: "Canvas",
  props: z.object({
    children: z.array(ElementChild),
  }),
  description:
    "720×720 root canvas. MUST be the root component. Sets background, font, and display dimensions.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        backgroundColor: BG,
        color: FG,
        fontFamily: "Inter",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {renderNode(props.children)}
    </div>
  ),
});

export const Header = defineComponent({
  name: "Header",
  props: z.object({
    icon: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
  }),
  description:
    "Page header with accent bar, Nerd Font icon, title, and optional subtitle. Place as first child of Canvas.",
  component: ({ props }) => (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ display: "flex", width: "100%", height: ACCENT_BAR_HEIGHT, backgroundColor: ACCENT, flexShrink: 0 }} />
      <div style={{ display: "flex", alignItems: "center", padding: `${PADDING}px ${PADDING}px 0`, gap: SPACE.xl }}>
        <span style={{ fontFamily: "Nerd", fontSize: ICON_SIZE.md, color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: ICON_SIZE.md, minWidth: ICON_SIZE.md }}>{props.icon}</span>
        <span style={{ fontSize: ICON_SIZE.md, fontWeight: FONT_WEIGHT.bold, color: FG, flexGrow: 1 }}>{props.title}</span>
        {props.subtitle && <span style={{ fontSize: FONT.sm, color: dim() }}>{props.subtitle}</span>}
      </div>
      <div style={{ display: "flex", height: SPACE.xxl, flexShrink: 0 }} />
      <div style={{ display: "flex", height: SIZE.separator, backgroundColor: separator(), marginLeft: PADDING, marginRight: PADDING, flexShrink: 0 }} />
    </div>
  ),
});

export const Content = defineComponent({
  name: "Content",
  props: z.object({
    children: z.array(ElementChild),
    gap: z.number().optional(),
  }),
  description: "Scrollable content area below Header. Adds padding and overflow handling.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        padding: `${SPACE.xxl}px ${PADDING}px ${PADDING}px`,
        overflow: "hidden",
        ...(props.gap != null ? { gap: props.gap } : {}),
      }}
    >
      {renderNode(props.children)}
    </div>
  ),
});

// ─── Content components ───────────────────────────────────────────────────────

export const Text = defineComponent({
  name: "Text",
  props: z.object({
    content: z.string(),
    size: z.enum(["xs", "sm", "md", "lg", "xl", "2xl", "3xl"]).optional(),
    weight: z.enum(["normal", "bold"]).optional(),
    color: z.enum(["default", "muted", "accent", "green", "red", "yellow", "cyan"]).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
  }),
  description:
    'Text block. size: "xs"(20)–"3xl"(80). color: "default"|"muted"|"accent"|"green"|"red"|"yellow"|"cyan". align: "left"|"center"|"right".',
  component: ({ props }) => {
    const sizeMap: Record<string, number> = { xs: FONT.xs, sm: FONT.sm, md: FONT.md, lg: FONT.lg, xl: FONT.xl, "2xl": FONT["2xl"], "3xl": FONT["3xl"] };
    const colorMap: Record<string, string> = { default: FG, muted: muted(), accent: ACCENT, green: GREEN, red: RED, yellow: YELLOW, cyan: CYAN };
    return (
      <span
        style={{
          fontSize: sizeMap[(props.size as string) ?? "md"] ?? FONT.md,
          fontWeight: (props.weight ?? "normal") === "bold" ? FONT_WEIGHT.bold : FONT_WEIGHT.normal,
          color: colorMap[(props.color as string) ?? "default"] ?? FG,
          ...(props.align ? { textAlign: props.align as "left" | "center" | "right" } : {}),
        }}
      >
        {props.content}
      </span>
    );
  },
});

export const Icon = defineComponent({
  name: "Icon",
  props: z.object({
    glyph: z.string(),
    color: z.enum(["accent", "muted", "green", "red", "yellow", "cyan", "default"]).optional(),
    size: z.number().optional(),
  }),
  description: 'Nerd Font icon glyph. Use Unicode escape like "\\uf058". color defaults to accent.',
  component: ({ props }) => {
    const colorMap: Record<string, string> = { accent: ACCENT, muted: dim(), green: GREEN, red: RED, yellow: YELLOW, cyan: CYAN, default: FG };
    return (
      <span
        style={{
          fontFamily: "Nerd",
          fontSize: props.size ?? ICON_SIZE.sm,
          color: colorMap[(props.color as string) ?? "accent"] ?? ACCENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: props.size ?? ICON_SIZE.sm,
          minWidth: props.size ?? ICON_SIZE.sm,
        }}
      >
        {props.glyph}
      </span>
    );
  },
});

export const Badge = defineComponent({
  name: "Badge",
  props: z.object({
    label: z.string(),
    color: z.enum(["accent", "green", "red", "yellow", "cyan", "orange", "purple", "muted"]).optional(),
  }),
  description: "Colored pill badge with label text.",
  component: ({ props }) => {
    const colorMap: Record<string, string> = { accent: ACCENT, green: GREEN, red: RED, yellow: YELLOW, cyan: CYAN, orange: ORANGE, purple: PURPLE, muted: muted() };
    const bg = colorMap[(props.color as string) ?? "accent"] ?? ACCENT;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          color: BG,
          fontSize: FONT.sm,
          fontWeight: FONT_WEIGHT.bold,
          borderRadius: RADIUS.sm,
          paddingLeft: SPACE.md,
          paddingRight: SPACE.md,
          paddingTop: SPACE.xs,
          paddingBottom: SPACE.xs,
        }}
      >
        {props.label}
      </div>
    );
  },
});

export const Card = defineComponent({
  name: "Card",
  props: z.object({
    children: z.array(ElementChild),
  }),
  description: "Elevated card container with subtle background and rounded corners.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: cardBackground(),
        borderRadius: RADIUS.md,
        padding: PADDING / 2,
      }}
    >
      {renderNode(props.children)}
    </div>
  ),
});

export const Separator = defineComponent({
  name: "Separator",
  props: z.object({}),
  description: "Horizontal divider line.",
  component: () => (
    <div style={{ display: "flex", height: SIZE.separator, backgroundColor: separator(), flexShrink: 0 }} />
  ),
});

export const Spacer = defineComponent({
  name: "Spacer",
  props: z.object({}),
  description: "Flexible spacer that expands to fill available space.",
  component: () => <div style={{ display: "flex", flexGrow: 1 }} />,
});

// ─── Data Display ─────────────────────────────────────────────────────────────

export const Col = defineComponent({
  name: "Col",
  props: z.object({
    label: z.string(),
    align: z.enum(["left", "center", "right"]).optional(),
  }),
  description: "Column definition for Table.",
  component: () => null,
});

export const Table = defineComponent({
  name: "Table",
  props: z.object({
    columns: z.array(Col.ref),
    rows: z.array(z.array(z.union([z.string(), z.number()]))),
  }),
  description: "Data table with headers and rows. Max ~12 rows fit on display.",
  component: ({ props }) => {
    const columns = asArray(props.columns);
    const rows = asArray(props.rows) as unknown[][];
    if (!columns.length) return null;
    const colW = `${Math.floor(100 / columns.length)}%`;

    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "row", height: ROW_DETAIL, width: "100%" }}>
          {columns.map((c: any, j: number) => (
            <div key={j} style={{ display: "flex", width: colW, alignItems: "center", fontSize: FONT.md, fontWeight: FONT_WEIGHT.bold, color: ACCENT, paddingLeft: SPACE.xxs, paddingRight: SPACE.xxs }}>
              {c.props?.label ?? String(c)}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", height: SIZE.separator, backgroundColor: separator(), flexShrink: 0, width: "100%" }} />
        {rows.map((row: any, i: number) => {
          const cells = asArray(row);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "row", height: ROW_DETAIL, width: "100%", backgroundColor: i % 2 === 0 ? cardBackground() : BG }}>
              {cells.map((cell: any, j: number) => (
                <div key={j} style={{ display: "flex", width: colW, alignItems: "center", fontSize: FONT.sm, color: FG, overflow: "hidden", paddingLeft: SPACE.xxs, paddingRight: SPACE.xxs }}>
                  {String(cell ?? "")}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  },
});

export const ListItem = defineComponent({
  name: "ListItem",
  props: z.object({
    text: z.string(),
    secondary: z.string().optional(),
    icon: z.string().optional(),
    value: z.string().optional(),
  }),
  description: "List row. icon is a Nerd Font glyph. value shows on the right side.",
  component: () => null,
});

export const List = defineComponent({
  name: "List",
  props: z.object({
    items: z.array(ListItem.ref),
  }),
  description: "Vertical list with optional icons, secondary text, and right-side values. Max ~8 items fit.",
  component: ({ props }) => {
    const items = asArray(props.items);
    const hasSecondary = items.some((it: any) => it.props?.secondary);
    const rowH = hasSecondary ? ROW_DOUBLE : ROW_SINGLE;
    const sepColor = separator();

    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item: any, i: number) => {
          const p = item.props ?? {};
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", height: rowH, gap: SPACE.lg, ...(i < items.length - 1 ? { borderBottom: `1px solid ${sepColor}` } : {}) }}>
              {p.icon ? (
                <span style={{ fontFamily: "Nerd", fontSize: ICON_SIZE.sm, color: paletteColor(i), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: ICON_SIZE.sm, minWidth: ICON_SIZE.sm }}>{p.icon}</span>
              ) : (
                <div style={{ display: "flex", width: SIZE.listBulletWidth, height: SIZE.listBulletHeight, backgroundColor: paletteColor(i), borderRadius: RADIUS.xs, flexShrink: 0 }} />
              )}
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" }}>
                <span style={{ display: "flex", overflow: "hidden", textOverflow: "ellipsis", fontSize: FONT.lg, fontWeight: FONT_WEIGHT.bold, color: FG }}>{p.text}</span>
                {p.secondary && <span style={{ display: "flex", overflow: "hidden", textOverflow: "ellipsis", fontSize: FONT.md, color: muted() }}>{p.secondary}</span>}
              </div>
              {p.value && <span style={{ fontSize: FONT.md, fontWeight: FONT_WEIGHT.bold, color: muted(), flexShrink: 0 }}>{p.value}</span>}
            </div>
          );
        })}
      </div>
    );
  },
});

// ─── Data Visualization ───────────────────────────────────────────────────────

export const Gauge = defineComponent({
  name: "Gauge",
  props: z.object({
    label: z.string(),
    value: z.number(),
    max: z.number().optional(),
    unit: z.string().optional(),
    size: z.number().optional(),
  }),
  description: "Arc gauge showing value/max. Defaults: max=100, unit=\"%\", size=240. Use inside a Stack(direction=\"row\", wrap=true) for grids.",
  component: ({ props }) => {
    const max = props.max ?? 100;
    const pct = percent(props.value, max);
    const display = max === 100 ? String(Math.round(props.value)) : `${props.value}/${max}`;
    const unit = props.unit ?? "%";
    const size = props.size ?? 240;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - SIZE.gaugeStroke;
    const trackColor = track();
    const sweep = Math.min(pct, 100) * 2.7;

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ position: "absolute" }}>
          <path d={describeArc(cx, cy, r, -135, 135)} fill="none" stroke={trackColor} stroke-width={SIZE.gaugeStroke} stroke-linecap="round" />
          {sweep > 0 && <path d={describeArc(cx, cy, r, -135, -135 + sweep)} fill="none" stroke={ACCENT} stroke-width={SIZE.gaugeStroke} stroke-linecap="round" />}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "absolute", top: 0, left: 0, width: size, height: size }}>
          <span style={{ fontSize: size * 0.22, fontWeight: FONT_WEIGHT.bold, color: FG }}>{display}</span>
          <span style={{ fontSize: size * 0.12, color: muted() }}>{unit}</span>
        </div>
        <div style={{ display: "flex", position: "absolute", bottom: size * 0.08, fontSize: size * 0.12, color: dim() }}>{props.label}</div>
      </div>
    );
  },
});

export const ProgressBar = defineComponent({
  name: "ProgressBar",
  props: z.object({
    label: z.string(),
    value: z.number(),
    max: z.number().optional(),
    display: z.string().optional(),
  }),
  description: "Horizontal progress bar with label and value display. max defaults to 100.",
  component: ({ props }) => {
    const max = props.max ?? 100;
    const pct = Math.min(percent(props.value, max), 100);
    const display = props.display ?? `${Math.round(pct)}%`;
    const vbW = 600;
    const h = SIZE.progressBarHeight;
    const r = h / 2;
    const fillW = pct * (vbW / 100);
    const trackColor = track();

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: FONT.lg, fontWeight: FONT_WEIGHT.bold, color: FG }}>{props.label}</span>
          <span style={{ fontSize: FONT.md, color: muted() }}>{display}</span>
        </div>
        <svg viewBox={`0 0 ${vbW} ${h}`} width="100%" height={h} preserveAspectRatio="none">
          <rect x="0" y="0" width={vbW} height={h} rx={r} ry={r} fill={trackColor} />
          {fillW > r * 2 && <rect x="0" y="0" width={fillW} height={h} rx={r} ry={r} fill={ACCENT} />}
        </svg>
      </div>
    );
  },
});

export const Sparkline = defineComponent({
  name: "Sparkline",
  props: z.object({
    values: z.array(z.number()),
    color: z.enum(["accent", "green", "red", "cyan", "muted"]).optional(),
    height: z.number().optional(),
  }),
  description: "Mini line chart. Color defaults to accent. Height defaults to 40px. Full width.",
  component: ({ props }) => {
    const values = asArray(props.values);
    if (values.length < 2) return null;
    const colorMap: Record<string, string> = { accent: ACCENT, green: GREEN, red: RED, cyan: CYAN, muted: muted() };
    const color = colorMap[(props.color as string) ?? "accent"] ?? ACCENT;
    const vbW = 600;
    const h = props.height ?? 40;
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    const span = mx !== mn ? mx - mn : 1;
    const pad = 2;
    const points = values.map((v, i) => `${pad + (i / (values.length - 1)) * (vbW - pad * 2)},${pad + (h - pad * 2) - ((v - mn) / span) * (h - pad * 2)}`).join(" ");

    return (
      <svg viewBox={`0 0 ${vbW} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" />
      </svg>
    );
  },
});

export const StatusDot = defineComponent({
  name: "StatusDot",
  props: z.object({
    up: z.boolean(),
  }),
  description: "Green/red status indicator dot.",
  component: ({ props }) => (
    <div
      style={{
        display: "flex",
        width: SIZE.statusDot,
        height: SIZE.statusDot,
        borderRadius: SIZE.statusDotRadius,
        backgroundColor: props.up ? GREEN : RED,
        flexShrink: 0,
      }}
    />
  ),
});

export const Timestamp = defineComponent({
  name: "Timestamp",
  props: z.object({}),
  description: "Shows current time in bottom-right corner. Place as last child of Canvas.",
  component: () => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return (
      <div style={{ display: "flex", position: "absolute", bottom: PADDING, right: PADDING, fontSize: FONT.sm, color: dim() }}>{ts}</div>
    );
  },
});


