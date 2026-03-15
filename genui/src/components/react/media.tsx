import React from "react";
void React;
import { readFileSync } from "fs";
import qrcode from "qrcode-generator";
import { UI, semanticColor, type Color, type QRCodeSize } from "../../tokens";
import { Row } from "./layout";

// ─── QRCode ─────────────────────────────────────────────────────────────────

export interface QRCodeProps {
  data: string;
  size?: QRCodeSize;
  color?: Color;
}

export function QRCode({ data, size: sizeName = "md", color = "default" }: QRCodeProps) {
  const size = UI.qrcode.size[sizeName];
  const fg = semanticColor(color);
  const qr = qrcode(0, "M");
  qr.addData(data);
  qr.make();
  const count = qr.getModuleCount();
  const cellSize = size / count;
  const rects: React.ReactElement[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        rects.push(<rect key={`${row}-${col}`} x={col * cellSize} y={row * cellSize} width={cellSize} height={cellSize} fill={fg} />);
      }
    }
  }
  return (
    <Row align="center" justify="center" gap="none">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>{rects}</svg>
    </Row>
  );
}

// ─── Image ──────────────────────────────────────────────────────────────────

export interface ImageProps {
  src: string;
  width?: number;
  height?: number;
  fit?: "contain" | "cover" | "fill";
  borderRadius?: number;
}

export function Image({ src: srcProp, width = UI.image.defaultWidth, height = UI.image.defaultHeight, fit = "contain", borderRadius = 0 }: ImageProps) {
  let src = srcProp;
  if (!src.startsWith("data:") && !src.startsWith("http")) {
    const buf = readFileSync(src);
    const ext = src.split(".").pop()?.toLowerCase() ?? "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/png";
    src = `data:${mime};base64,${buf.toString("base64")}`;
  }
  return (
    <Row align="center" justify="center" gap="none">
      <img src={src} width={width} height={height} style={{ objectFit: fit, borderRadius }} />
    </Row>
  );
}
