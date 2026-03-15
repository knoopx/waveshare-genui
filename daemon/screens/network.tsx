import React from "react";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Row, Col, Text, Card, List, ListItem, Separator, Timestamp,
} from "../ui";

function sh(cmd: string): string {
  return execSync(cmd, { timeout: 3000 }).toString().trim();
}

function readNum(path: string): number {
  return parseInt(readFileSync(path, "utf8").trim(), 10);
}

function fmtBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return value >= 100 || i === 0 ? `${Math.round(value)} ${units[i]}` : `${value.toFixed(1)} ${units[i]}`;
}

function fmtRate(bps: number): string {
  return `${fmtBytes(bps)}/s`;
}

export async function networkScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  try {
    const iface = sh("ip route | awk '/default/ {print $5; exit}'");
    if (!iface) return null;

    const operstate = existsSync(`/sys/class/net/${iface}/operstate`)
      ? readFileSync(`/sys/class/net/${iface}/operstate`, "utf8").trim()
      : "unknown";
    const carrier = operstate === "up";

    let ip = "N/A";
    try {
      ip = sh(`ip -4 addr show dev ${iface} | awk '/inet / {print $2; exit}'`).split("/")[0] || "N/A";
    } catch { /* ignore */ }

    let mac = "N/A";
    try { mac = readFileSync(`/sys/class/net/${iface}/address`, "utf8").trim(); } catch { /* ignore */ }

    // Throughput sample
    const rx1 = readNum(`/sys/class/net/${iface}/statistics/rx_bytes`);
    const tx1 = readNum(`/sys/class/net/${iface}/statistics/tx_bytes`);
    await new Promise((r) => setTimeout(r, 1000));
    const rx2 = readNum(`/sys/class/net/${iface}/statistics/rx_bytes`);
    const tx2 = readNum(`/sys/class/net/${iface}/statistics/tx_bytes`);
    const rxRate = Math.max(0, rx2 - rx1);
    const txRate = Math.max(0, tx2 - tx1);

    return {
      name: "network",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="globe" title={iface} subtitle={carrier ? "connected" : operstate} />
          <Col gap="md">
            <Row gap="md" justify="center" align="start">
              <Card>
                <Col gap="xs" align="center">
                  <Text size="sm" color="muted">Download</Text>
                  <Text size="2xl" weight="bold" color="accent" align="center">{fmtRate(rxRate)}</Text>
                  <Text size="sm" color="muted" align="center">{`total ${fmtBytes(rx2)}`}</Text>
                </Col>
              </Card>
              <Card>
                <Col gap="xs" align="center">
                  <Text size="sm" color="muted">Upload</Text>
                  <Text size="2xl" weight="bold" color="accent" align="center">{fmtRate(txRate)}</Text>
                  <Text size="sm" color="muted" align="center">{`total ${fmtBytes(tx2)}`}</Text>
                </Col>
              </Card>
            </Row>
            <Separator />
            <List>
              <ListItem text="IPv4" icon="globe" value={ip} />
              <ListItem text="MAC" icon="lock" value={mac} />
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
