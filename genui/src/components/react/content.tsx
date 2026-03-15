import React from "react";
void React;
import { UI, semanticColor, resolveIcon, ICON_NAMES, type Color, type IconSize } from "../../tokens";
import { iconStyle, maxLinesStyle, wrapTextStyle } from "../helpers";
import { Row, Col } from "./layout";

// ─── Text ───────────────────────────────────────────────────────────────────

export { ICON_NAMES };

export interface TextProps {
  children: string;
  size?: keyof typeof UI.font;
  weight?: "normal" | "bold";
  color?: Color;
  align?: "left" | "center" | "right";
}

export function Text({ children, size = "md", weight = "normal", color = "default", align }: TextProps) {
  return (
    <span style={{ ...wrapTextStyle, display: "block", width: "100%", fontSize: UI.font[size] ?? UI.font.md, fontWeight: weight === "bold" ? UI.fontWeight.bold : UI.fontWeight.normal, color: semanticColor(color), lineHeight: UI.text.lineHeight, ...(align ? { textAlign: align } : {}) }}>
      {children}
    </span>
  );
}

// ─── Icon ───────────────────────────────────────────────────────────────────

export interface IconProps {
  name: string;
  color?: Color;
  size?: IconSize;
}

export function Icon({ name, color = "accent", size: sizeName = "sm" }: IconProps) {
  const size = UI.icon.size[sizeName];
  return <span style={iconStyle(size, semanticColor(color))}>{resolveIcon(name)}</span>;
}

// ─── Badge ──────────────────────────────────────────────────────────────────

export interface BadgeProps {
  label: string;
  color?: Color;
}

export function Badge({ label, color = "accent" }: BadgeProps) {
  return (
    <Row align="center" justify="center" gap="none">
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", backgroundColor: semanticColor(color), color: "white", fontSize: UI.badge.fontSize, fontWeight: UI.fontWeight.bold, borderRadius: UI.badge.radius, paddingLeft: UI.badge.paddingX, paddingRight: UI.badge.paddingX, paddingTop: UI.badge.paddingY, paddingBottom: UI.badge.paddingY }}>{label}</span>
    </Row>
  );
}

// ─── Alert ──────────────────────────────────────────────────────────────────

export interface AlertProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  color?: Color;
}

export function Alert({ title, message, icon, color = "accent" }: AlertProps) {
  return (
    <Row gap="md" align="center" padding="md" background="elevated" radius="md" border={color}>
      {icon}
      <Col gap="xs" grow>
        <span style={{ ...wrapTextStyle, ...maxLinesStyle(2, UI.text.lineHeight), fontSize: UI.alert.titleSize, fontWeight: UI.fontWeight.bold, color: UI.color.fg, lineHeight: UI.text.lineHeight }}>{title}</span>
        {message && <span style={{ ...wrapTextStyle, ...maxLinesStyle(2, UI.text.lineHeight), fontSize: UI.alert.messageSize, color: UI.surface.muted(), lineHeight: UI.text.lineHeight }}>{message}</span>}
      </Col>
    </Row>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  color?: Color;
}

export function EmptyState({ title, message, icon }: EmptyStateProps) {
  return (
    <Col gap="md" align="center" justify="center" grow>
      {icon}
      <span style={{ ...wrapTextStyle, ...maxLinesStyle(3, UI.text.lineHeight), fontSize: UI.emptyState.titleSize, fontWeight: UI.fontWeight.bold, color: UI.color.fg, lineHeight: UI.text.lineHeight, textAlign: "center" }}>{title}</span>
      {message && <span style={{ ...wrapTextStyle, ...maxLinesStyle(3, UI.text.lineHeight), fontSize: UI.emptyState.messageSize, color: UI.surface.muted(), lineHeight: UI.text.lineHeight, textAlign: "center" }}>{message}</span>}
    </Col>
  );
}

// ─── Timestamp ──────────────────────────────────────────────────────────────

export function Timestamp() {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return <span style={{ position: "absolute", bottom: UI.timestamp.inset, right: UI.timestamp.inset, fontSize: UI.timestamp.fontSize, color: UI.surface.dim() }}>{ts}</span>;
}

// ─── CodeBlock ──────────────────────────────────────────────────────────────

export interface CodeBlockProps {
  language: string;
  codeString: string;
}

export function CodeBlock({ language, codeString }: CodeBlockProps) {
  return (
    <Col gap="none" background="track" radius="md">
      <Row gap="none" padding="xs" background="overlay">
        <span style={{ fontSize: UI.codeBlock.languageSize, fontWeight: UI.fontWeight.bold, color: UI.surface.muted(), textTransform: "uppercase" as const }}>{language}</span>
      </Row>
      <Row gap="none" padding="md">
        <span style={{ display: "block", width: "100%", minWidth: 0, ...maxLinesStyle(2, UI.codeBlock.codeLineHeight), fontFamily: UI.fontFamily.icon, fontSize: UI.codeBlock.codeSize, color: UI.color.fg, lineHeight: UI.codeBlock.codeLineHeight, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{codeString}</span>
      </Row>
    </Col>
  );
}
