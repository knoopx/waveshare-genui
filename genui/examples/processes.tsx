#!/usr/bin/env bun
/**
 * Top running processes — live process list by CPU or memory.
 *
 * Usage: processes.tsx [--sort cpu|mem] [--count 8] [--title "Top Processes"]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let sort = "cpu";
let count = 8;
let title = "";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--sort" && argv[i + 1]) sort = argv[++i];
  else if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]);
  else if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
}

const sortKey = sort === "mem" ? "-%mem" : "-%cpu";
const metricLabel = sort === "mem" ? "MEM" : "CPU";
const icon = sort === "mem" ? "\uf538" : "\uf2db";

type Proc = {
  pid: string;
  user: string;
  cpu: string;
  mem: string;
  command: string;
};

const raw = execSync(`ps -eo pid,user,%cpu,%mem,comm --sort=${sortKey} | head -n ${count + 1} | tail -n ${count}`, {
  timeout: 3000,
})
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);

const processes: Proc[] = raw.map((line) => {
  const parts = line.trim().split(/\s+/, 5);
  const [pid, user, cpu, mem, command] = parts;
  return {
    pid: pid ?? "?",
    user: user ?? "?",
    cpu: cpu ?? "0.0",
    mem: mem ?? "0.0",
    command: command ?? "?",
  };
});

emit(
  <Canvas>
    <Header icon={icon} title={title || `Top Processes by ${metricLabel}`} />
    <Content>
      <List>
        {processes.map((p) => (
          <ListItem
            text={p.command}
            secondary={`pid ${p.pid} · ${p.user} · CPU ${p.cpu}% · MEM ${p.mem}%`}
            icon={icon}
            value={`${sort === "mem" ? p.mem : p.cpu}%`}
          />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
