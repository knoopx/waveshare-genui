import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Col, Row, Gauge, List, ListItem, Separator, Timestamp,
} from "../ui";

function sh(cmd: string): string {
  return execSync(cmd, { timeout: 3000 }).toString().trim();
}

interface Sink {
  name: string;
  volume: number;
  muted: boolean;
  active: boolean;
}

function parseDevices(sectionName: string): Sink[] {
  const raw = sh("wpctl status");
  const devices: Sink[] = [];

  // Find section: "├─ Sinks:" or "├─ Sources:"
  const lines = raw.split("\n");
  let inSection = false;
  for (const line of lines) {
    if (line.includes(`${sectionName}:`)) {
      inSection = true;
      continue;
    }
    if (inSection && (line.includes("├─") || line.includes("└─"))) {
      break; // next section
    }
    if (!inSection) continue;

    // Match: " │  *   68. M-Track 2X2 Analog Stereo           [vol: 0.47]"
    const m = line.match(/(\*?)\s*(\d+)\.\s+(.+?)\s+\[vol:\s*([\d.]+)(,\s*MUTED)?\]/);
    if (m) {
      devices.push({
        name: m[3].trim(),
        volume: Math.round(parseFloat(m[4]) * 100),
        muted: !!m[5],
        active: line.includes("*"),
      });
    }
  }
  return devices;
}

export async function audioScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  try {
    const sinks = parseDevices("Sinks");
    const sources = parseDevices("Sources");
    if (sinks.length === 0 && sources.length === 0) return null;

    const activeSink = sinks.find((s) => s.active) ?? sinks[0];

    return {
      name: "audio",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="music" title="Audio" subtitle={activeSink?.muted ? "Muted" : undefined} />
          <Col>
            {activeSink ? (
              <Row gap="xl" align="center" justify="center">
                <Gauge
                  label="Volume"
                  value={activeSink.volume}
                  max={100}
                  unit="%"
                  size="sm"
                  color={activeSink.muted ? "red" : undefined}
                />
              </Row>
            ) : null}
            <Separator />
            <List>
              {[
                ...sinks.map((s) => (
                  <ListItem
                    text={s.name}
                    secondary={s.muted ? "Muted" : "Output"}
                    icon={s.muted ? "pause" : "music"}
                    value={`${s.volume}%`}
                    color={s.active ? "accent" : undefined}
                  />
                )),
                ...sources.map((s) => (
                  <ListItem
                    text={s.name}
                    secondary="Input"
                    icon="circle"
                    value={`${s.volume}%`}
                    color={s.active ? "cyan" : undefined}
                  />
                )),
              ]}
            </List>
          </Col>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch {
    return null;
  }
}
