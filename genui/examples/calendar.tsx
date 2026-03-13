#!/usr/bin/env bun
/**
 * Calendar — live events from Google Calendar via gog CLI.
 *
 * Usage: calendar.tsx [--max 8] [--today | --week | --days N]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";
const argv = process.argv.slice(2);
let max = 8;
const gogArgs = ["calendar", "events"];

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--max" && argv[i + 1]) max = parseInt(argv[++i]);
  else if (argv[i] === "--today") gogArgs.push("--today");
  else if (argv[i] === "--week") gogArgs.push("--week");
  else if (argv[i] === "--days" && argv[i + 1]) gogArgs.push("--days", argv[++i]);
}

gogArgs.push("--max", String(max), "-j", "--results-only", "--no-input");

const now = new Date();
const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const raw = execSync(`gog ${gogArgs.join(" ")}`, { timeout: 15000 }).toString();
const parsed = JSON.parse(raw);

type Event = { summary: string; time: string };
const events: Event[] = [];

for (const e of parsed) {
  const start = e.start ?? {};
  const end = e.end ?? {};
  let timeStr = "";
  if (start.dateTime) {
    const s = new Date(start.dateTime);
    timeStr = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
    if (end.dateTime) {
      const en = new Date(end.dateTime);
      timeStr += ` – ${String(en.getHours()).padStart(2, "0")}:${String(en.getMinutes()).padStart(2, "0")}`;
    }
  } else if (start.date) {
    timeStr = "All day";
  }
  const loc = e.location ? ` · ${e.location}` : "";
  events.push({ summary: e.summary ?? "(No title)", time: `${timeStr}${loc}` });
}

emit(
  <Canvas>
    <Header icon={"\uf073"} title={dateStr} />
    <Content>
      <List>
        {events.map((e) => (
          <ListItem text={e.summary} secondary={e.time} icon={"\uf017"} />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
