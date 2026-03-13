#!/usr/bin/env bun
/**
 * Arc gauges — from system stats or custom values.
 *
 * Usage: gauge.tsx                                        (auto: CPU, RAM, Disk, Temp)
 *        gauge.tsx -g "CPU:73:100:%" -g "RAM:4.2:8:GB"   (custom values)
 *        gauge.tsx -g "Disk:92:100:%:orange"              (with color)
 *        gauge.tsx --title "CI Pipeline" -g "Build:75:100:%:accent"
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { Canvas, Header, Stack, Gauge, Timestamp } from "../src/components";
type GaugeData = { label: string; value: number; max: number; unit: string; color?: string };

const argv = process.argv.slice(2);
const specs: string[] = [];
let title = "";
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "-g" && argv[i + 1]) specs.push(argv[++i]);
  else if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
}

let gauges: GaugeData[];

if (specs.length > 0) {
  gauges = specs.map((s) => {
    const [label, val, max, unit, color] = s.split(":");
    return { label, value: parseFloat(val), max: parseFloat(max), unit: unit ?? "%", color: color || undefined };
  });
} else {
  function sh(cmd: string): string {
    return execSync(cmd, { timeout: 3000 }).toString().trim();
  }

  const cpuIdle = parseFloat(sh("top -bn2 -d0.5 | grep 'Cpu(s)' | tail -1 | awk '{print $8}'"));
  const cpu = Math.round(100 - cpuIdle);

  const memInfo = sh("free -m | awk '/Mem:/{print $2,$3}'").split(" ");
  const ramTotal = parseFloat(memInfo[0]) / 1024;
  const ramUsed = parseFloat(memInfo[1]) / 1024;

  const diskInfo = sh("df -BG / | awk 'NR==2{print $2,$3}'").split(" ");
  const diskTotal = parseInt(diskInfo[0]) || 0;
  const diskUsed = parseInt(diskInfo[1]) || 0;

  let temp = 0;
  try { temp = Math.round(parseInt(readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8")) / 1000); } catch { /* no sensor */ }

  gauges = [
    { label: "CPU", value: cpu, max: 100, unit: "%" },
    { label: "RAM", value: Math.round(ramUsed * 10) / 10, max: Math.round(ramTotal * 10) / 10, unit: "GB" },
    { label: "Disk", value: diskUsed, max: diskTotal, unit: "GB" },
    { label: "Temp", value: temp, max: 100, unit: "°C" },
  ];
}

const grid = (
  <Stack direction="row" gap="xl" align="center" justify="center" wrap>
    {gauges.map((g) => (
      <Gauge label={g.label} value={g.value} max={g.max} unit={g.unit} color={g.color} />
    ))}
  </Stack>
);

emit(
  <Canvas>
    {title ? <Header icon={"\uf080"} title={title} /> : null}
    {title ? <Content>{grid}</Content> : grid}
    <Timestamp />
  </Canvas>,
);
