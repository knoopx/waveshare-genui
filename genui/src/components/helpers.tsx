import React from "react";
void React;
import { z } from "zod";
import { UI, SEMANTIC_COLOR_NAMES, resolveIcon } from "../tokens";

// ─── Shared zod schemas ───────────────────────────────────────────────────────

export const colorEnum = z.union([z.enum(SEMANTIC_COLOR_NAMES), z.string().startsWith("#")]).describe("Semantic color name or hex color (e.g. '#E21B24').");
export const gapEnum = z.enum(["none", "xs", "sm", "md", "lg", "xl"]).describe("Gap size: none(0), xs(4), sm(8), md(16), lg(24), xl(32).");

export const GAP_MAP: Record<string, number> = {
  none: 0,
  xs: UI.space.xs,
  sm: UI.space.sm,
  md: UI.space.md,
  lg: UI.space.lg,
  xl: UI.space.xl,
};

export const ElementChild = z.object({
  type: z.literal("element"),
  typeName: z.string(),
  props: z.object({}).passthrough(),
  partial: z.boolean().optional(),
});

/** One or more children. Accepts a string, a single element, or an array. */
export const Children = z.union([z.string(), ElementChild, z.array(ElementChild)]);

/** Schema for icon props: accepts a named icon string or an Icon element. */
export const iconProp = z.union([z.string(), ElementChild]).describe("Named icon or Icon element for custom color/size.");

// ─── Utility functions ────────────────────────────────────────────────────────

export function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : v != null ? [v] : [];
}

export function percent(value: number, max: number): number {
  return max > 0 ? (value / max) * 100 : 0;
}

export const wrapTextStyle: React.CSSProperties = {
  minWidth: 0,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

export function maxLinesStyle(lines: number, lineHeight: number): React.CSSProperties {
  return {
    maxHeight: `${lines * lineHeight}em`,
    overflow: "hidden",
  };
}

export function multilineEllipsisStyle(lines: number, lineHeight: number): React.CSSProperties {
  return {
    ...maxLinesStyle(lines, lineHeight),
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines,
    textOverflow: "ellipsis",
  };
}

/** Consistent icon span style — every icon glyph in the system uses this. */
export function iconStyle(size: number, color: string): React.CSSProperties {
  return {
    fontFamily: UI.fontFamily.icon,
    fontSize: size,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: size,
    minWidth: size,
  };
}

/** Render an icon prop: string → resolved glyph span, element → renderNode. */
export function renderIcon(
  value: unknown,
  size: number,
  color: string,
  renderNode: (node: unknown) => React.ReactNode,
): React.ReactNode {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return renderNode(value);
  }
  if (typeof value === "string") {
    return <span style={iconStyle(size, color)}>{resolveIcon(value)}</span>;
  }
  return null;
}
