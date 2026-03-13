#!/usr/bin/env bun
/**
 * Waveshare Display CLI
 *
 * Renders openui-lang to the display, or generates the system prompt.
 *
 * Usage:
 *   waveshare-genui <file.oui>             Parse openui-lang and send to display
 *   waveshare-genui -                      Read openui-lang from stdin
 *   waveshare-genui prompt                 Print system prompt for LLM
 *   waveshare-genui schema                 Print JSON schema
 *   waveshare-genui on|off                 Display power control
 *   -o, --output <file.png>                Write PNG instead of sending
 *   -p, --port <path>                      Serial port (default /dev/ttyACM0)
 *   --theme <file>                         Base16 theme JSON
 *   --rotate <degrees>                     Optional output rotation (default: 180)
 */

import { access, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { rasterize } from "./rasterizer";
import { loadTheme } from "./theme";
import { parseOpenUILang } from "./openui-parser";
import {
  connect,
  sendFrame,
  sendCommand,
  disconnect,
  CMD_ON,
  CMD_OFF,
} from "./serial";
import { library, promptOptions } from "./library";
import sharp from "sharp";

// ─── Parse CLI args ───────────────────────────────────────────────────────────

let port = "/dev/ttyACM0";
let theme: string | undefined;
let output: string | undefined;
let rotate = 180;
const positionals: string[] = [];

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if ((a === "--port" || a === "-p") && argv[i + 1]) port = argv[++i];
  else if (a === "--theme" && argv[i + 1]) theme = argv[++i];
  else if ((a === "--output" || a === "-o") && argv[i + 1]) output = argv[++i];
  else if (a === "--rotate" && argv[i + 1]) rotate = Number(argv[++i]);
  else positionals.push(a);
}

if (!Number.isFinite(rotate)) {
  console.error("Invalid --rotate value");
  process.exit(1);
}

if (theme) loadTheme(theme);

const command = positionals[0];

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (!command) {
  console.log(`waveshare-genui — render openui-lang to a 720×720 display

Usage:
  waveshare-genui <file.oui>       Render openui-lang file
  waveshare-genui -                Read openui-lang from stdin
  waveshare-genui prompt           Print LLM system prompt
  waveshare-genui schema           Print component JSON schema
  waveshare-genui on|off           Display power control

Options:
  -p, --port <path>    Serial port (default: /dev/ttyACM0)
  -o, --output <file>  Write PNG instead of sending to display
  --theme <file>       Base16 theme JSON
  --rotate <degrees>   Optional output rotation (default: 180)`);
  process.exit(1);
}

// ─── Power commands ───────────────────────────────────────────────────────────

if (command === "on" || command === "off") {
  const serial = await connect(port);
  const ok = await sendCommand(serial, command === "on" ? CMD_ON : CMD_OFF);
  console.log(`Display ${command}: ${ok ? "OK" : "FAIL"}`);
  await disconnect(serial);
  process.exit(ok ? 0 : 1);
}

// ─── Prompt / schema commands ─────────────────────────────────────────────────

if (command === "prompt") {
  console.log(library.prompt(promptOptions));
  process.exit(0);
}

if (command === "schema") {
  console.log(JSON.stringify(library.toJSONSchema(), null, 2));
  process.exit(0);
}

// ─── Render openui-lang ───────────────────────────────────────────────────────

let source: string;
if (command === "-") {
  source = await readStdin();
} else {
  if (!(await fileExists(command))) {
    console.error(`File not found: ${command}`);
    process.exit(1);
  }
  source = await readFile(command, "utf8");
}

source = source.trim();
if (!source) {
  console.error("Empty input");
  process.exit(1);
}

const { element, warnings } = parseOpenUILang(source, library);
for (const w of warnings) console.error(`Warning: ${w}`);
const webp = await rasterize(element, { rotate });

if (output) {
  const png = await sharp(webp).png().toBuffer();
  await writeFile(output, png);
  console.log(`${output} (${Math.floor(png.length / 1024)} KB)`);
} else {
  const serial = await connect(port);
  const ok = await sendFrame(serial, webp);
  console.log(`${ok ? "OK" : "FAIL"} (${Math.floor(webp.length / 1024)} KB)`);
  await disconnect(serial);
}
