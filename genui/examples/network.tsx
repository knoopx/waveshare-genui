#!/usr/bin/env bun
/**
 * Network status — interface, IP, link speed, live throughput, and total transfer.
 *
 * Usage: network.tsx [--iface IFACE] [--interval-ms 1000]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import {
  Canvas, Header, Content, Stack, Text, Card, List, ListItem, Separator, Timestamp,
} from "../src/components";

const argv = process.argv.slice(2);
let iface = "";
let intervalMs = 1000;

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--iface" && argv[i + 1]) iface = argv[++i];
  else if (argv[i] === "--interval-ms" && argv[i + 1]) intervalMs = parseInt(argv[++i]);
}

function sh(cmd: string): string {
  return execSync(cmd, { timeout: 3000 }).toString().trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readNum(path: string): number {
  return parseInt(readFileSync(path, "utf8").trim(), 10);
}

function fmtBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return value >= 100 || i === 0 ? `${Math.round(value)} ${units[i]}` : `${value.toFixed(1)} ${units[i]}`;
}

function fmtRate(bytesPerSec: number): string {
  return `${fmtBytes(bytesPerSec)}/s`;
}

function defaultIface(): string {
  if (iface) return iface;
  const fromRoute = sh("ip route | awk '/default/ {print $5; exit}'");
  if (fromRoute) return fromRoute;
  throw new Error("Could not determine default interface");
}

function readStats(name: string) {
  return {
    rx: readNum(`/sys/class/net/${name}/statistics/rx_bytes`),
    tx: readNum(`/sys/class/net/${name}/statistics/tx_bytes`),
  };
}

const networkInterface = defaultIface();
const operstate = existsSync(`/sys/class/net/${networkInterface}/operstate`)
  ? readFileSync(`/sys/class/net/${networkInterface}/operstate`, "utf8").trim()
  : "unknown";
const carrier = existsSync(`/sys/class/net/${networkInterface}/carrier`)
  ? readFileSync(`/sys/class/net/${networkInterface}/carrier`, "utf8").trim() === "1"
  : operstate === "up";

let ip = "N/A";
try {
  ip = sh(`ip -4 addr show dev ${networkInterface} | awk '/inet / {print $2; exit}'`).split("/")[0] || "N/A";
} catch { /* ignore */ }

let speed = "N/A";
if (existsSync(`/sys/class/net/${networkInterface}/speed`)) {
  try {
    const raw = readFileSync(`/sys/class/net/${networkInterface}/speed`, "utf8").trim();
    if (raw && raw !== "-1") speed = `${raw} Mb/s`;
  } catch { /* ignore */ }
}

let ssid = "";
try {
  const wireless = sh(`iw dev ${networkInterface} link 2>/dev/null | awk -F': ' '/SSID/ {print $2; exit}'`);
  if (wireless) ssid = wireless;
} catch { /* ignore */ }

let signal = "";
try {
  const value = sh(`iw dev ${networkInterface} link 2>/dev/null | awk -F': ' '/signal/ {print $2; exit}'`);
  if (value) signal = value;
} catch { /* ignore */ }

let mac = "N/A";
try {
  mac = readFileSync(`/sys/class/net/${networkInterface}/address`, "utf8").trim();
} catch { /* ignore */ }

const first = readStats(networkInterface);
await sleep(intervalMs);
const second = readStats(networkInterface);
const seconds = Math.max(intervalMs / 1000, 0.1);
const rxRate = Math.max(0, (second.rx - first.rx) / seconds);
const txRate = Math.max(0, (second.tx - first.tx) / seconds);

const subtitleParts = [carrier ? "connected" : operstate];
if (ssid) subtitleParts.push(ssid);

const infoItems = [
  <ListItem text="IPv4" icon={"\uf0ac"} value={ip} />,
  <ListItem text="Link Speed" icon={"\uf2db"} value={speed} />,
  <ListItem text="MAC Address" icon={"\uf023"} value={mac} />,
  ...(signal ? [<ListItem text="Signal" icon={"\uf1eb"} value={signal} />] : []),
];

emit(
  <Canvas>
    <Header icon={"\uf0ac"} title={networkInterface} subtitle={subtitleParts.join(" · ")} />
    <Content gap="md">
      <Stack direction="row" gap="md" justify="center" align="stretch">
        <Card>
          <Stack direction="column" gap="xs" align="center">
            <Text content="Download" size="sm" color="muted" />
            <Text content={fmtRate(rxRate)} size="2xl" weight="bold" color="accent" align="center" />
            <Text content={`total ${fmtBytes(second.rx)}`} size="sm" color="muted" align="center" />
          </Stack>
        </Card>
        <Card>
          <Stack direction="column" gap="xs" align="center">
            <Text content="Upload" size="sm" color="muted" />
            <Text content={fmtRate(txRate)} size="2xl" weight="bold" color="accent" align="center" />
            <Text content={`total ${fmtBytes(second.tx)}`} size="sm" color="muted" align="center" />
          </Stack>
        </Card>
      </Stack>
      <Separator />
      <List>{infoItems}</List>
    </Content>
    <Timestamp />
  </Canvas>,
);
