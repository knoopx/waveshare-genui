import React from "react";
void React;
import { UI, semanticColor, resolveIcon, type Color } from "../../tokens";
import { asArray, iconStyle, maxLinesStyle, wrapTextStyle } from "../helpers";
import { Row, Col, Separator } from "./layout";

// ─── KeyValue ───────────────────────────────────────────────────────────────

export interface KeyValueProps {
  label: string;
  value: string;
  secondary?: string;
  color?: Color;
}

export function KeyValue({ label, value, secondary, color = "default" }: KeyValueProps) {
  return (
    <Row gap="md" align="start">
      <Col gap="xs" grow>
        <span style={{ ...wrapTextStyle, ...maxLinesStyle(2, UI.text.lineHeight), fontSize: UI.keyValue.labelSize, color: UI.surface.muted(), lineHeight: UI.text.lineHeight }}>{label}</span>
        {secondary && <span style={{ ...wrapTextStyle, ...maxLinesStyle(2, UI.text.lineHeight), fontSize: UI.keyValue.secondarySize, color: UI.surface.dim(), lineHeight: UI.text.lineHeight }}>{secondary}</span>}
      </Col>
      <span style={{ ...wrapTextStyle, ...maxLinesStyle(2, UI.text.lineHeight), flexBasis: "45%", fontSize: UI.keyValue.valueSize, fontWeight: UI.fontWeight.bold, color: semanticColor(color), textAlign: "right", flexShrink: 1, maxWidth: "45%" }}>{value}</span>
    </Row>
  );
}

// ─── Stat ───────────────────────────────────────────────────────────────────

export interface StatProps {
  label: string;
  value: string;
  unit?: string;
  helper?: string;
  color?: Color;
}

export function Stat({ label, value, unit, helper, color = "default" }: StatProps) {
  return (
    <Col gap="xs" padding="md" background="card" radius="md" grow>
      <span style={{ ...wrapTextStyle, ...maxLinesStyle(2, UI.text.lineHeight), fontSize: UI.stat.labelSize, color: UI.surface.muted(), lineHeight: UI.text.lineHeight }}>{label}</span>
      <Row gap="xs" align="end" wrap>
        <span style={{ ...wrapTextStyle, fontSize: UI.stat.valueSize, fontWeight: UI.fontWeight.bold, color: semanticColor(color), lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ ...wrapTextStyle, fontSize: UI.stat.unitSize, color: UI.surface.dim(), lineHeight: 1.1 }}>{unit}</span>}
      </Row>
      {helper && <span style={{ ...wrapTextStyle, ...maxLinesStyle(2, UI.text.lineHeight), fontSize: UI.stat.helperSize, color: UI.surface.dim(), lineHeight: UI.text.lineHeight }}>{helper}</span>}
    </Col>
  );
}

// ─── List ───────────────────────────────────────────────────────────────────

export interface ListItemData {
  text: string;
  secondary?: string;
  icon?: React.ReactNode;
  value?: string;
  color?: Color;
}

export interface ListProps {
  items: ListItemData[];
}

export function List({ items }: ListProps) {
  const hasSecondary = items.some((p) => p.secondary);
  const rowH = hasSecondary ? UI.list.rowDoubleHeight : UI.list.rowSingleHeight;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((p, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "row", alignItems: "center", minHeight: rowH, gap: UI.list.rowGap, paddingTop: UI.list.rowPaddingY, paddingBottom: UI.list.rowPaddingY, overflow: "hidden", ...(i < items.length - 1 ? { borderBottom: `${UI.separator.thickness}px solid ${UI.separator.color()}` } : {}) }}>
          {p.icon ? (
            p.icon
          ) : (
            <div style={{ display: "flex", width: UI.list.bulletWidth, alignSelf: "stretch", backgroundColor: semanticColor(p.color ?? "accent"), borderRadius: UI.list.bulletRadius, flexShrink: 0 }} />
          )}
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0, overflow: "hidden" }}>
            <span style={{ overflow: "hidden", whiteSpace: "pre-wrap", overflowWrap: "break-word", fontSize: UI.list.textSize, fontWeight: UI.fontWeight.bold, color: UI.color.fg, lineHeight: UI.text.lineHeight }}>{p.text}</span>
            {p.secondary && <span style={{ overflow: "hidden", whiteSpace: "pre-wrap", overflowWrap: "break-word", fontSize: UI.list.secondarySize, color: UI.surface.muted(), lineHeight: UI.text.lineHeight }}>{p.secondary}</span>}
          </div>
          {p.value && <span style={{ fontSize: UI.list.valueSize, fontWeight: UI.fontWeight.bold, color: UI.surface.muted(), flexShrink: 0, maxWidth: UI.list.valueMaxWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.value}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Table ──────────────────────────────────────────────────────────────────

export interface TableColData {
  label: string;
  type?: "string" | "number";
  align?: "left" | "center" | "right";
}

export interface TableProps {
  columns: TableColData[];
  rows: (string | number)[][];
}

export function Table({ columns, rows }: TableProps) {
  if (!columns.length) return null;
  const colW = `${Math.floor(100 / columns.length)}%`;
  const alignMap: Record<string, "start" | "center" | "end"> = { left: "start", center: "center", right: "end" };

  function colJustify(c: TableColData): "start" | "center" | "end" {
    if (c.align) return alignMap[c.align] ?? "start";
    if (c.type === "number") return "end";
    return "start";
  }

  return (
    <Col gap="none">
      <Row gap="none">
        {columns.map((c, j) => (
          <span key={j} style={{ width: colW, height: UI.table.headerHeight, display: "flex", alignItems: "center", justifyContent: colJustify(c) === "end" ? "flex-end" : colJustify(c) === "center" ? "center" : "flex-start", fontSize: UI.table.headerFontSize, fontWeight: UI.fontWeight.bold, color: UI.color.accent, paddingLeft: UI.table.cellPaddingX, paddingRight: UI.table.cellPaddingX, overflow: "hidden", whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>
            {c.label}
          </span>
        ))}
      </Row>
      <Separator />
      {rows.map((row, i) => (
        <Row key={i} gap="none" background={i % 2 === 0 ? "card" : undefined}>
          {asArray(row).map((cell: any, j: number) => (
            <span key={j} style={{ width: colW, height: UI.table.rowHeight, display: "flex", alignItems: "center", justifyContent: colJustify(columns[j]) === "end" ? "flex-end" : colJustify(columns[j]) === "center" ? "center" : "flex-start", fontSize: UI.table.cellFontSize, color: UI.color.fg, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", paddingLeft: UI.table.cellPaddingX, paddingRight: UI.table.cellPaddingX }}>
              {String(cell ?? "")}
            </span>
          ))}
        </Row>
      ))}
    </Col>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────

export interface StepData {
  title: string;
  details?: string;
}

export interface StepsProps {
  items: StepData[];
}

export function Steps({ items }: StepsProps) {
  return (
    <Col gap="sm">
      {items.map((p, i) => {
        const isLast = i === items.length - 1;
        return (
          <Row key={i} gap="md">
            <Col gap="none" align="center" shrink={false}>
              <Row gap="none" align="center" justify="center" background="accent" radius="md" shrink={false}>
                <span style={{ width: UI.steps.circleSize, height: UI.steps.circleSize, display: "flex", alignItems: "center", justifyContent: "center", color: UI.color.bg, fontSize: UI.steps.numberSize, fontWeight: UI.fontWeight.bold }}>{String(i + 1)}</span>
              </Row>
              {!isLast && <Col gap="none" background="separator" grow><span style={{ width: 2 }} /></Col>}
            </Col>
            <Col gap="xs">
              <span style={{ ...wrapTextStyle, ...maxLinesStyle(3, UI.text.lineHeight), fontSize: UI.steps.titleSize, fontWeight: UI.fontWeight.bold, color: UI.color.fg, lineHeight: UI.text.lineHeight }}>{p.title}</span>
              {p.details && <span style={{ ...wrapTextStyle, ...maxLinesStyle(3, UI.text.lineHeight), fontSize: UI.steps.detailsSize, color: UI.surface.muted(), lineHeight: UI.text.lineHeight }}>{p.details}</span>}
            </Col>
          </Row>
        );
      })}
    </Col>
  );
}

// ─── Tags ───────────────────────────────────────────────────────────────────

export interface TagData {
  text: string;
  icon?: string;
  color?: Color;
}

export interface TagBlockProps {
  tags: TagData[];
}

export function TagBlock({ tags }: TagBlockProps) {
  return (
    <Row gap="sm" wrap>
      {tags.map((p, i) => {
        const color = semanticColor(p.color ?? "muted");
        return (
          <Row key={i} gap="xs" align="center">
            <span style={{ backgroundColor: UI.surface.elevated(), borderRadius: UI.badge.radius, paddingLeft: UI.space.sm, paddingRight: UI.space.sm, paddingTop: UI.space.xs, paddingBottom: UI.space.xs, borderWidth: 1, borderStyle: "solid", borderColor: color, display: "flex", alignItems: "center", gap: UI.space.xs }}>
              {p.icon && <span style={iconStyle(UI.tagBlock.iconSize, color)}>{resolveIcon(p.icon)}</span>}
              <span style={{ ...wrapTextStyle, fontSize: UI.tagBlock.textSize, color, fontWeight: UI.fontWeight.bold, maxWidth: 220 }}>{p.text}</span>
            </span>
          </Row>
        );
      })}
    </Row>
  );
}
