#!/usr/bin/env bun
/**
 * Now playing — reads current track from playerctl.
 *
 * Usage: nowplaying.tsx [--player spotify]
 */
import React from "react";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { emit } from "../src/openui-emitter";
import {
  Canvas, Content, Stack, Text, Image, ProgressBar, Timestamp,
} from "../src/components";
import { RADIUS } from "../src/tokens";

const argv = process.argv.slice(2);
let player = "";
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--player" && argv[i + 1]) player = argv[++i];
}

const playerFlag = player ? `--player=${player}` : "";

function ctl(field: string): string {
  try {
    return execSync(`playerctl ${playerFlag} metadata ${field} 2>/dev/null`, { timeout: 2000 }).toString().trim();
  } catch {
    return "";
  }
}

function ctlCmd(cmd: string): string {
  try {
    return execSync(`playerctl ${playerFlag} ${cmd} 2>/dev/null`, { timeout: 2000 }).toString().trim();
  } catch {
    return "";
  }
}

const title = ctl("xesam:title") || "No track playing";
const artist = ctl("xesam:artist") || "Unknown";
const album = ctl("xesam:album") || "";
const artUrl = ctl("mpris:artUrl") || "";

// Position / duration in seconds
const posUs = parseInt(ctlCmd("position") || "0");
const durUs = parseInt(ctl("mpris:length") || "0");
const posSec = Math.round(posUs);
const durSec = Math.round(durUs / 1000000);

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const display = durSec > 0 ? `${fmtTime(posSec)} / ${fmtTime(durSec)}` : "";

// Try to resolve album art to a local file
let artPath = "";
if (artUrl.startsWith("file://")) {
  artPath = decodeURIComponent(artUrl.slice(7));
  if (!existsSync(artPath)) artPath = "";
}

emit(
  <Canvas>
    <Content>
      <Stack direction="column" gap="lg" align="center" justify="center">
        {artPath ? (
          <Image src={artPath} width={340} height={340} borderRadius={RADIUS.md} />
        ) : null}
        <Stack direction="column" gap="xs" align="center">
          <Text content={title} size="2xl" weight="bold" align="center" />
          <Text content={artist} size="xl" color="muted" align="center" />
          {album ? <Text content={album} size="md" color="muted" align="center" /> : null}
        </Stack>
        {durSec > 0 ? (
          <ProgressBar label="" value={posSec} max={durSec} display={display} />
        ) : null}
      </Stack>
    </Content>
    <Timestamp />
  </Canvas>,
);
