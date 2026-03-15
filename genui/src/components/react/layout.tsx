import React from "react";
void React;
import { UI, semanticColor } from "../../tokens";
import type { Color } from "../../tokens";
import { multilineEllipsisStyle, wrapTextStyle } from "../helpers";

// ─── Token maps ─────────────────────────────────────────────────────────────

type SpaceToken = "none" | "xs" | "sm" | "md" | "lg" | "xl";
type RadiusToken = "none" | "xs" | "sm" | "md" | "pill";
type AlignToken = "start" | "center" | "end" | "stretch" | "baseline";
type JustifyToken = "start" | "center" | "end" | "between" | "around" | "evenly";
type SurfaceToken = "card" | "track" | "elevated" | "overlay" | "separator" | "transparent";
type BackgroundToken = Color | SurfaceToken;

const SPACE: Record<SpaceToken, number> = { none: 0, xs: UI.space.xs, sm: UI.space.sm, md: UI.space.md, lg: UI.space.lg, xl: UI.space.xl };
const RADIUS: Record<RadiusToken, number> = { none: 0, xs: UI.radius.xs, sm: UI.radius.sm, md: UI.radius.md, pill: UI.radius.pill };
const ALIGN: Record<AlignToken, string> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch", baseline: "baseline" };
const JUSTIFY: Record<JustifyToken, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around", evenly: "space-evenly" };
const GROW_JUSTIFY = new Set(["center", "space-between", "space-around", "space-evenly"]);

const SURFACE: Record<SurfaceToken, () => string> = {
  card: UI.surface.card,
  track: UI.surface.track,
  elevated: UI.surface.elevated,
  overlay: UI.surface.overlay,
  separator: UI.surface.separator,
  transparent: () => "transparent",
};

function resolveBackground(token: BackgroundToken): string {
  if (token in SURFACE) return SURFACE[token as SurfaceToken]();
  return semanticColor(token);
}

// ─── Flex primitives ────────────────────────────────────────────────────────

export { type SpaceToken, type RadiusToken, type AlignToken, type JustifyToken, type BackgroundToken, type SurfaceToken };

export interface FlexProps {
  gap?: SpaceToken;
  padding?: SpaceToken | `${SpaceToken} ${SpaceToken}`;
  align?: AlignToken;
  justify?: JustifyToken;
  grow?: boolean;
  shrink?: boolean;
  background?: BackgroundToken;
  radius?: RadiusToken;
  border?: Color;
  color?: Color;
  font?: "normal" | "monospace";
  children?: React.ReactNode;
}

export interface RowProps extends FlexProps {
  wrap?: boolean;
}

function parsePadding(padding?: string): React.CSSProperties {
  if (!padding) return {};
  const parts = padding.split(/\s+/) as SpaceToken[];
  if (parts.length === 2) {
    return { paddingTop: SPACE[parts[0]], paddingBottom: SPACE[parts[0]], paddingLeft: SPACE[parts[1]], paddingRight: SPACE[parts[1]] };
  }
  return { padding: SPACE[parts[0] as SpaceToken] };
}

function flexStyle(dir: "row" | "column", { gap = "md", padding, align = "stretch", justify = "start", grow, shrink, background, radius, border, color, font }: FlexProps): React.CSSProperties {
  const ai = ALIGN[align];
  const jc = JUSTIFY[justify];
  return {
    display: "flex",
    flexDirection: dir,
    gap: SPACE[gap],
    alignItems: ai,
    justifyContent: jc,
    ...parsePadding(padding as string | undefined),
    ...(grow || GROW_JUSTIFY.has(jc) ? { flexGrow: 1 } : {}),
    ...(shrink === false ? { flexShrink: 0 } : {}),
    ...(background ? { backgroundColor: resolveBackground(background) } : {}),
    ...(radius ? { borderRadius: RADIUS[radius] } : {}),
    ...(border ? { borderWidth: 1, borderStyle: "solid" as const, borderColor: semanticColor(border) } : {}),
    ...(color ? { color: semanticColor(color) } : {}),
    ...(font === "monospace" ? { fontFamily: "monospace" } : font === "normal" ? { fontFamily: UI.fontFamily.text } : {}),
  };
}

export function Row({ wrap, children, ...props }: RowProps) {
  return (
    <div style={{ ...flexStyle("row", props), ...(wrap ? { flexWrap: "wrap" } : {}) }}>
      {children}
    </div>
  );
}

export function Col({ children, ...props }: FlexProps) {
  return (
    <div style={flexStyle("column", props)}>
      {children}
    </div>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────────────────

export function Canvas({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ ...flexStyle("column", { gap: "none", font: "normal" }), width: UI.canvas.width, height: UI.canvas.height, backgroundColor: UI.color.bg, color: UI.color.fg, position: "relative", overflow: "hidden" }}>
      {children}
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

export interface HeaderProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function Header({ icon, title, subtitle }: HeaderProps) {
  return (
    <Col gap="none" shrink={false}>
      <Row gap="none" background="accent" shrink={false}>
        <span style={{ height: UI.header.accentBarHeight }} />
      </Row>
      <Row gap="md" align="center" padding="lg">
        {icon}
        <Row gap="md" align="center" grow>
          {typeof title === "string" ? <span style={{ ...wrapTextStyle, ...multilineEllipsisStyle(UI.header.titleMaxLines, UI.text.lineHeight), fontSize: UI.header.titleSize, fontWeight: UI.fontWeight.bold, color: UI.color.fg, lineHeight: UI.text.lineHeight }}>{title}</span> : title}
        </Row>
        {subtitle && (
          <Row gap="md" align="center">
            {typeof subtitle === "string" ? <span style={{ ...wrapTextStyle, ...multilineEllipsisStyle(3, UI.text.lineHeight), fontSize: UI.header.subtitleSize, color: UI.surface.dim(), lineHeight: UI.text.lineHeight, textAlign: "right" }}>{subtitle}</span> : subtitle}
          </Row>
        )}
      </Row>
      <Separator />
    </Col>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

export type CardVariant = "card" | "sunk" | "clear";

export function Card({ variant = "card", children }: { variant?: CardVariant; children?: React.ReactNode }) {
  return (
    <Col gap="none" padding="md" background={variant === "clear" ? "transparent" : variant === "sunk" ? "track" : "card"} radius={variant === "clear" ? "none" : "md"} border={variant === "sunk" ? "muted" : undefined}>
      {children}
    </Col>
  );
}

// ─── Separator ──────────────────────────────────────────────────────────────

export function Separator() {
  return <Row gap="none" shrink={false}><span style={{ height: UI.separator.thickness, width: "100%", backgroundColor: UI.separator.color() }} /></Row>;
}

// ─── Spacer ─────────────────────────────────────────────────────────────────

export function Spacer() {
  return <Col gap="none" grow><span /></Col>;
}
