import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Col, Row, Gauge, Separator, List, ListItem, Timestamp,
} from "../ui";

interface Mount {
  fs: string;
  mount: string;
  size: string;
  used: string;
  avail: string;
  pct: number;
}

function parseDf(): Mount[] {
  const raw = execSync("df -h --output=source,target,size,used,avail,pcent -x tmpfs -x devtmpfs -x efivarfs -x overlay 2>/dev/null", {
    timeout: 3000,
  })
    .toString()
    .trim()
    .split("\n")
    .slice(1); // skip header

  return raw
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) return null;
      return {
        fs: parts[0],
        mount: parts[1],
        size: parts[2],
        used: parts[3],
        avail: parts[4],
        pct: parseInt(parts[5]) || 0,
      };
    })
    .filter((m): m is Mount => m !== null)
    .filter((m) => !m.fs.startsWith("tmpfs") && m.mount !== "/boot" && !m.mount.startsWith("/snap"));
}

function gaugeColor(pct: number): string | undefined {
  if (pct > 90) return "red";
  if (pct > 75) return "orange";
  if (pct > 60) return "yellow";
  return undefined;
}

export async function diskScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  try {
    const mounts = parseDf();
    if (mounts.length === 0) return null;

    // Show up to 3 mounts as gauges, rest as list items
    const gauges = mounts.slice(0, 3);
    const rest = mounts.slice(3, 8);

    // Largest IO consumers
    let ioItems: { name: string; detail: string }[] = [];
    try {
      const iotop = execSync(
        "iotop -b -n 1 -o -q -P 2>/dev/null | head -6 | tail -5",
        { timeout: 5000 },
      )
        .toString()
        .trim()
        .split("\n")
        .filter(Boolean);

      ioItems = iotop.map((line) => {
        const parts = line.trim().split(/\s+/);
        // PID PRIO USER DISK_READ DISK_WRITE SWAPIN IO COMMAND
        const cmd = parts.slice(7).join(" ") || parts[parts.length - 1] || "?";
        const read = parts[3] ?? "0";
        const write = parts[4] ?? "0";
        return { name: cmd.slice(0, 24), detail: `R: ${read} W: ${write}` };
      });
    } catch {
      // iotop not available or no permissions
    }

    return {
      name: "disk",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="disk" title="Disk Usage" subtitle={`${mounts.length} volumes`} />
          <Col>
            <Row gap="xl" align="center" justify="center">
              {gauges.map((m) => (
                <Gauge
                  label={m.mount === "/" ? "Root" : m.mount.split("/").pop() || m.mount}
                  value={m.pct}
                  max={100}
                  unit="%"
                  size="sm"
                  color={gaugeColor(m.pct)}
                />
              ))}
            </Row>
            <Separator />
            <List>
              {gauges.map((m) => (
                <ListItem
                  text={m.mount}
                  secondary={`${m.used} / ${m.size} (${m.avail} free)`}
                  icon="disk"
                  value={`${m.pct}%`}
                  color={gaugeColor(m.pct)}
                />
              ))}
              {rest.map((m) => (
                <ListItem
                  text={m.mount}
                  secondary={`${m.used} / ${m.size} (${m.avail} free)`}
                  icon="folder"
                  value={`${m.pct}%`}
                  color={gaugeColor(m.pct)}
                />
              ))}
              {ioItems.map((item) => (
                <ListItem text={item.name} secondary={item.detail} icon="sync" />
              ))}
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
