#!/usr/bin/env bun
/**
 * System monitor — CPU/RAM/Disk gauges + stats list.
 *
 * Usage: sysmon.tsx
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { hostname } from "os";
import {
  Canvas, Header, Content, Stack, Gauge, Separator, List, ListItem, Timestamp,
} from "../src/components";

function sh(cmd: string): string {
  return execSync(cmd, { timeout: 3000 }).toString().trim();
}

// CPU
const cpuIdle = parseFloat(sh("top -bn2 -d0.5 | grep 'Cpu(s)' | tail -1 | awk '{print $8}'"));
const cpu = Math.round(100 - cpuIdle);

// Memory
const memInfo = sh("free -m | awk '/Mem:/{print $2,$3}'").split(" ");
const ramTotal = parseFloat(memInfo[0]);
const ramUsed = parseFloat(memInfo[1]);
const ramPct = Math.round((ramUsed / ramTotal) * 100);

// Disk
const diskInfo = sh("df -BG / | awk 'NR==2{print $2,$3}'").split(" ");
const diskTotal = parseInt(diskInfo[0]) || 1;
const diskUsed = parseInt(diskInfo[1]) || 0;
const diskPct = Math.round((diskUsed / diskTotal) * 100);

// CPU freq
let cpuFreq = "N/A";
try {
  const mhz = Math.round(parseFloat(sh("lscpu | awk '/MHz.*:/{print $NF; exit}'")));
  cpuFreq = `${mhz} MHz`;
} catch { /* no lscpu */ }

// Temps
const temps: { label: string; value: number }[] = [];
try {
  const zones = sh("paste <(cat /sys/class/thermal/thermal_zone*/type) <(cat /sys/class/thermal/thermal_zone*/temp)");
  for (const line of zones.split("\n")) {
    const [type, raw] = line.split("\t");
    if (type && raw) temps.push({ label: type, value: Math.round(parseInt(raw) / 1000) });
  }
} catch { /* no thermal */ }

// Network
let netStats = "N/A";
try {
  const rx = Math.round(parseInt(readFileSync("/sys/class/net/$(ip route | awk '/default/{print $5; exit}')/statistics/rx_bytes", "utf8")) / 1048576);
  const tx = Math.round(parseInt(readFileSync("/sys/class/net/$(ip route | awk '/default/{print $5; exit}')/statistics/tx_bytes", "utf8")) / 1048576);
  netStats = `↑ ${tx} MB  ↓ ${rx} MB`;
} catch {
  try {
    netStats = sh("awk '/eth0|wlan0|enp|wlp/{print $1, $2, $10}' /proc/net/dev | head -1").replace(/:/g, "");
  } catch { /* no net stats */ }
}

// Load
const load = sh("cat /proc/loadavg | awk '{print $1, \"/\", $2, \"/\", $3}'");

// Uptime
const uptimeSec = parseFloat(sh("awk '{print $1}' /proc/uptime"));
const days = Math.floor(uptimeSec / 86400);
const hours = Math.floor((uptimeSec % 86400) / 3600);
const upStr = days > 0 ? `up ${days}d ${hours}h` : `up ${hours}h`;

const diskColor = diskPct > 85 ? "orange" : undefined;

const stats: { icon: string; text: string }[] = [
  { icon: "\uf2db", text: `CPU Freq: ${cpuFreq}` },
  ...temps.map((t) => ({ icon: "\uf2c9", text: `${t.label}: ${t.value}°C` })),
  { icon: "\uf0ac", text: `Net ${netStats}` },
  { icon: "\uf085", text: `Load: ${load}` },
];

emit(
  <Canvas>
    <Header icon={"\uf108"} title="System Monitor" subtitle={`${hostname()} · ${upStr}`} />
    <Content>
      <Stack direction="row" gap="xl" align="center" justify="center">
        <Gauge label="CPU" value={cpu} max={100} unit="%" size={160} />
        <Gauge label="Memory" value={ramPct} max={100} unit="%" size={160} />
        <Gauge label="Disk" value={diskPct} max={100} unit="%" size={160} color={diskColor} />
      </Stack>
      <Separator />
      <List>
        {stats.map((s) => (
          <ListItem text={s.text} icon={s.icon} />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
