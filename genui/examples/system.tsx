#!/usr/bin/env bun
/**
 * System info — host, OS, kernel, uptime, load, memory, disk, and network summary.
 *
 * Usage: system.tsx
 */
import React from "react";
import os from "os";
import { execSync } from "child_process";
import { emit } from "../src/openui-emitter";
import {
  Canvas,
  Header,
  Content,
  Stack,
  Stat,
  Card,
  KeyValue,
  Timestamp,
} from "../src/components";


function sh(cmd: string): string {
  try {
    return execSync(cmd, { timeout: 2500 }).toString().trim();
  } catch {
    return "";
  }
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return value >= 100 || index === 0 ? `${Math.round(value)} ${units[index]}` : `${value.toFixed(1)} ${units[index]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const host = os.hostname();
const osName = sh("uname -o") || os.platform();
const kernel = os.release();
const arch = os.arch();
const uptime = formatUptime(os.uptime());
const load = os.loadavg();
const cpuCount = String(os.cpus().length);
const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const memPct = Math.round((usedMem / totalMem) * 100);
const memSummary = `${formatBytes(usedMem)} / ${formatBytes(totalMem)}`;

const diskLine = sh("df -h / --output=size,used,pcent,target | tail -n 1");
const diskParts = diskLine.split(/\s+/).filter(Boolean);
const diskValue = diskParts[2] || "N/A";
const diskHelper = diskParts.length >= 2 ? `${diskParts[1]} / ${diskParts[0]}` : "Root filesystem";
const diskColor = parseInt(diskValue, 10) >= 85 ? "orange" : "accent";

const defaultIface = sh("ip route | awk '/default/ {print $5; exit}'");
const ip = defaultIface ? sh(`ip -4 addr show dev ${defaultIface} | awk '/inet / {print $2; exit}' | cut -d/ -f1`) : "";
const networkValue = ip || "offline";
const networkHelper = defaultIface || "no default route";

const contentChildren = [
  <Stack direction="row" gap="md" align="stretch">
    <Stat label="Memory" value={String(memPct)} unit="%" helper={memSummary} color="green" />
    <Stat label="Disk" value={diskValue} helper={diskHelper} color={diskColor} />
    <Stat label="Load" value={load[0].toFixed(2)} color="cyan" />
  </Stack>,
  <Card>
    <Stack direction="column" gap="xs">
      <KeyValue label="Kernel" value={kernel} secondary={`${osName} · ${arch}`} />
      <KeyValue label="CPU" value={cpuCount} secondary="logical cores" />
      <KeyValue label="Network" value={networkValue} secondary={networkHelper} />
      <KeyValue label="Uptime" value={uptime} />
    </Stack>
  </Card>,
];

emit(
  <Canvas>
    <Header icon={"\uf108"} title={host} subtitle={`${osName} · ${arch}`} />
    <Content gap="md">{contentChildren}</Content>
    <Timestamp />
  </Canvas>,
);
