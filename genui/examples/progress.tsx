#!/usr/bin/env bun
/**
 * Progress bars — from disk usage or custom values.
 *
 * Usage: progress.tsx                                              (auto: disk usage)
 *        progress.tsx -i "Build:75:100" -i "Tests:42:50:green"    (custom with optional color)
 *        progress.tsx --title "CI Pipeline" -i "Deploy:30:100:orange"
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { Canvas, Header, Content, Stack, ProgressBar, Timestamp } from "../src/components";
type Bar = { label: string; value: number; max: number; display: string; color?: string };

const argv = process.argv.slice(2);
const specs: string[] = [];
let title = "";
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "-i" && argv[i + 1]) specs.push(argv[++i]);
  else if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
}

let bars: Bar[];

if (specs.length > 0) {
  bars = specs.map((s) => {
    const [label, val, max, color] = s.split(":");
    const v = parseFloat(val);
    const m = parseFloat(max ?? "100");
    return { label, value: v, max: m, display: `${v}/${m}`, color: color || undefined };
  });
} else {
  title = title || "Disk Usage";
  const lines = execSync("df -h --output=target,size,used,pcent -x tmpfs -x devtmpfs -x efivarfs 2>/dev/null", { timeout: 3000 })
    .toString().trim().split("\n").slice(1).slice(0, 5);
  bars = lines.map((line) => {
    const parts = line.trim().split(/\s+/);
    return { label: parts[0], value: parseInt(parts[3]) || 0, max: 100, display: `${parts[2]} / ${parts[1]}` };
  });
}

emit(
  <Canvas>
    <Header icon={"\uf0a0"} title={title || "Progress"} />
    <Content>
      <Stack direction="column" gap="lg">
        {bars.map((b) => (
          <ProgressBar label={b.label} value={b.value} max={b.max} display={b.display} color={b.color} />
        ))}
      </Stack>
    </Content>
    <Timestamp />
  </Canvas>,
);
