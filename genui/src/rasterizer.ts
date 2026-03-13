/**
 * Rasterization pipeline: JSX → SVG (satori) → PNG (resvg) → WebP (sharp)
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from "./tokens";

let fontData: ArrayBuffer | null = null;
let fontBoldData: ArrayBuffer | null = null;
let nerdFontData: ArrayBuffer | null = null;

const FONTS_DIR = resolve(dirname(new URL(import.meta.url).pathname), "../fonts");

const FONT_PATHS = [
  `${FONTS_DIR}/Inter-Regular.ttf`,
];

const FONT_BOLD_PATHS = [
  `${FONTS_DIR}/Inter-Bold.ttf`,
];

const NERD_FONT_PATHS = [
  "/run/current-system/sw/share/X11/fonts/JetBrainsMonoNLNerdFont-Bold.ttf",
  "/usr/share/fonts/TTF/JetBrainsMonoNLNerdFont-Bold.ttf",
];

function readFont(path: string): ArrayBuffer {
  const buf = readFileSync(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function findFont(paths: string[]): ArrayBuffer | null {
  for (const p of paths) {
    if (existsSync(p)) return readFont(p);
  }
  return null;
}

function loadFonts() {
  if (!fontData) {
    fontData = findFont(FONT_PATHS);
    fontBoldData = findFont(FONT_BOLD_PATHS) ?? fontData;
    nerdFontData = findFont(NERD_FONT_PATHS);
  }
}

export interface RasterizeOptions {
  width?: number;
  height?: number;
  rotate?: number;
}

/**
 * Render a React element to a WebP buffer.
 * Rotation is optional and controlled by opts.rotate.
 */
export async function rasterize(
  element: React.ReactElement,
  opts: RasterizeOptions = {},
): Promise<Buffer> {
  const width = opts.width ?? DISPLAY_WIDTH;
  const height = opts.height ?? DISPLAY_HEIGHT;
  const rotate = opts.rotate ?? 0;

  loadFonts();

  const fonts: Parameters<typeof satori>[1]["fonts"] = [];
  if (fontData) {
    fonts.push({
      name: "Inter",
      data: fontData,
      weight: 400,
      style: "normal" as const,
    });
    fonts.push({
      name: "Inter",
      data: fontBoldData!,
      weight: 700,
      style: "normal" as const,
    });
  }
  if (nerdFontData) {
    fonts.push({
      name: "Nerd",
      data: nerdFontData,
      weight: 700,
      style: "normal" as const,
    });
  }

  const svg = await satori(element, { width, height, fonts });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
  });
  const png = resvg.render().asPng();

  const webp = await sharp(png).rotate(rotate).webp({ quality: 90 }).toBuffer();

  return webp;
}
