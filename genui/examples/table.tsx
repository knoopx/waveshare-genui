#!/usr/bin/env bun
/**
 * Data table — from JSON, stdin, or live process list.
 *
 * Usage: table.tsx                                              (auto: top processes)
 *        table.tsx --json '[{"Name":"Alice","Score":"95"}]' [--title "Scores"]
 *        echo '[...]' | table.tsx --stdin [--title "Data"]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { Canvas, Header, Content, Table, Col, Timestamp } from "../src/components";
const argv = process.argv.slice(2);
let jsonStr = "";
let useStdin = false;
let title = "";
const headers: string[] = [];

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--json" && argv[i + 1]) jsonStr = argv[++i];
  else if (argv[i] === "--stdin") useStdin = true;
  else if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
  else if (argv[i] === "--header" && argv[i + 1]) headers.push(argv[++i]);
}

let columns: string[];
let rows: string[][];

if (jsonStr || useStdin) {
  const data = JSON.parse(useStdin ? readFileSync("/dev/stdin", "utf8") : jsonStr);
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && !Array.isArray(data[0])) {
    columns = headers.length > 0 ? headers : Object.keys(data[0]);
    rows = data.map((r: Record<string, unknown>) => columns.map((h) => String(r[h] ?? "")));
  } else {
    columns = headers.length > 0 ? headers : data[0]?.map((_: unknown, i: number) => `Col ${i + 1}`) ?? [];
    rows = data.map((r: unknown) => (Array.isArray(r) ? r.map(String) : [String(r)]));
  }
} else {
  title = title || "Top Processes";
  columns = ["Command", "User", "CPU", "MEM"];
  const raw = execSync("ps aux --sort=-%mem | head -9 | tail -8", { timeout: 3000 })
    .toString().trim().split("\n");
  rows = raw.map((line) => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts.slice(10).join(" ").slice(0, 30) || parts[10] || "?";
    return [cmd, parts[0], `${parts[2]}%`, `${parts[3]}%`];
  });
}

emit(
  <Canvas>
    <Header icon={"\uf0ce"} title={title || "Table"} />
    <Content>
      <Table
        columns={columns.map((c) => <Col label={c} />)}
        rows={rows}
      />
    </Content>
    <Timestamp />
  </Canvas>,
);
