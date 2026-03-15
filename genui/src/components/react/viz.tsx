import React from "react";
void React;
import { UI, semanticColor, type Color, type GaugeSize } from "../../tokens";
import { asArray, maxLinesStyle, percent } from "../helpers";
import { Row, Col } from "./layout";

// ─── Gauge ──────────────────────────────────────────────────────────────────

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

export interface GaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  size?: GaugeSize;
  color?: Color;
}

export function Gauge({ label, value, max = 100, unit = "%", size: sizeName = "md", color = "accent" }: GaugeProps) {
  const size = UI.gauge.size[sizeName];
  const pct = percent(value, max);
  const display = max === 100 ? String(Math.round(value)) : `${value}/${max}`;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - UI.gauge.stroke;
  const sweep = Math.min(pct, 100) * UI.gauge.arcSweep;

  // Gauge uses absolute positioning for SVG overlays — unique to this component
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <path d={describeArc(cx, cy, r, UI.gauge.arcStart, UI.gauge.arcEnd)} fill="none" stroke={UI.surface.track()} stroke-width={UI.gauge.stroke} stroke-linecap="round" />
        {sweep > 0 && <path d={describeArc(cx, cy, r, UI.gauge.arcStart, UI.gauge.arcStart + sweep)} fill="none" stroke={semanticColor(color)} stroke-width={UI.gauge.stroke} stroke-linecap="round" />}
      </svg>
      <span style={{ position: "absolute", top: 0, left: 0, width: size, height: size, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * UI.gauge.valueFontRatio * Math.min(1, 3 / display.length), fontWeight: UI.fontWeight.bold, color: UI.color.fg }}>{display}</span>
        <span style={{ fontSize: size * UI.gauge.unitFontRatio, color: UI.surface.muted() }}>{unit}</span>
      </span>
      <span style={{ position: "absolute", bottom: size * UI.gauge.labelBottomRatio, left: 0, width: size, display: "flex", justifyContent: "center", fontSize: size * UI.gauge.labelFontRatio, color: UI.surface.dim() }}>{label}</span>
    </div>
  );
}

// ─── ProgressBar ────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  display?: string;
  color?: Color;
}

export function ProgressBar({ label, value, max = 100, display: displayProp, color = "accent" }: ProgressBarProps) {
  const pct = Math.min(percent(value, max), 100);
  const display = displayProp ?? `${Math.round(pct)}%`;
  const vbW = UI.svgViewBoxWidth;
  const h = UI.progressBar.height;
  const r = h / 2;
  const fillW = pct * (vbW / 100);

  return (
    <Col gap="sm">
      <Row gap="md" justify="between" align="start">
        <span style={{ minWidth: 0, flexGrow: 1, flexBasis: 0, ...maxLinesStyle(2, UI.text.lineHeight), whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", fontSize: UI.progressBar.labelSize, fontWeight: UI.fontWeight.bold, color: UI.color.fg, lineHeight: UI.text.lineHeight }}>{label}</span>
        <span style={{ minWidth: 0, flexShrink: 1, maxWidth: "40%", textAlign: "right", ...maxLinesStyle(2, UI.text.lineHeight), whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", fontSize: UI.progressBar.valueSize, color: UI.surface.muted(), lineHeight: UI.text.lineHeight }}>{display}</span>
      </Row>
      <svg viewBox={`0 0 ${vbW} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <rect x="0" y="0" width={vbW} height={h} rx={r} ry={r} fill={UI.surface.track()} />
        {fillW > r * 2 && <rect x="0" y="0" width={fillW} height={h} rx={r} ry={r} fill={semanticColor(color)} />}
      </svg>
    </Col>
  );
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

export interface SparklineProps {
  values: number[];
  color?: Color;
  height?: number;
}

export function Sparkline({ values: valuesProp, color = "accent", height = UI.sparkline.height }: SparklineProps) {
  const values = asArray(valuesProp);
  if (values.length < 2) return null;
  const vbW = UI.svgViewBoxWidth;
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const span = mx !== mn ? mx - mn : 1;
  const pad = UI.sparkline.pad;
  const points = values.map((v, i) => `${pad + (i / (values.length - 1)) * (vbW - pad * 2)},${pad + (height - pad * 2) - ((v - mn) / span) * (height - pad * 2)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${vbW} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={semanticColor(color)} stroke-width={UI.sparkline.stroke} stroke-linejoin="round" />
    </svg>
  );
}

// ─── StatusDot ──────────────────────────────────────────────────────────────

export function StatusDot({ up }: { up: boolean }) {
  return (
    <Row gap="none" background={up ? "green" : "red"} radius="sm" shrink={false}>
      <span style={{ width: UI.statusDot.size, height: UI.statusDot.size }} />
    </Row>
  );
}
