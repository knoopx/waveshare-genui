import React from "react";
import { execSync } from "child_process";
import { existsSync } from "fs";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Text, Image, Timestamp } from "../ui";
import { UI } from "../../genui/src/tokens";

function ctl(field: string): string {
  try {
    return execSync(`playerctl metadata ${field} 2>/dev/null`, { timeout: 2000 })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

export async function nowplayingScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  const title = ctl("xesam:title");
  if (!title) return null;

  const artist = ctl("xesam:artist") || "Unknown";
  const album = ctl("xesam:album") || "";
  const artUrl = ctl("mpris:artUrl") || "";

  let artPath = "";
  if (artUrl.startsWith("file://")) {
    artPath = decodeURIComponent(artUrl.slice(7));
    if (!existsSync(artPath)) artPath = "";
  }

  return {
    name: "nowplaying",
    priority: "high",
    element: (
      <Canvas>
        <Col align="center" justify="center">
          <Col gap="xl">
            {artPath ? (
              <Image src={artPath} width={340} height={340} borderRadius={UI.radius.md} />
            ) : null}
            <Col gap="xs" align="center" justify="center">
              <Text size="2xl" weight="bold" align="center">{title}</Text>
              <Text size="xl" color="muted" align="center">{artist}</Text>
              {album ? <Text size="md" color="muted" align="center">{album}</Text> : null}
            </Col>
          </Col>
        </Col>
        <Timestamp />
      </Canvas>
    ),
  };
}
