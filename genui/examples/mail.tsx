#!/usr/bin/env bun
/**
 * Mail inbox — live from Gmail via gog CLI.
 *
 * Usage: mail.tsx [--query "in:inbox"] [--max 8]
 */
import React from "react";
import { execSync } from "child_process";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let query = "in:inbox";
let max = 8;

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--query" && argv[i + 1]) query = argv[++i];
  else if (argv[i] === "--max" && argv[i + 1]) max = parseInt(argv[++i]);
}

type Thread = { from: string; subject: string; date: string; labels: string[] };

const raw = execSync(`gog gmail list '${query}' --max ${max} -j --results-only`, {
  timeout: 15000,
}).toString();
const threads: Thread[] = JSON.parse(raw);

function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1] : from.replace(/@.*/, "");
}

function extractTime(date: string): string {
  // "2026-03-13 17:11" → "17:11"
  const parts = date.split(" ");
  return parts[1] ?? date;
}

const count = threads.length;
const unread = threads.filter((t) => t.labels?.includes("UNREAD")).length;
const subtitle = unread > 0 ? `${unread} unread` : `${count} threads`;

emit(
  <Canvas>
    <Header icon={"\uf0e0"} title="Inbox" subtitle={subtitle} />
    <Content>
      <List>
        {threads.map((t) => (
          <ListItem
            text={extractName(t.from)}
            secondary={t.subject}
            value={extractTime(t.date)}
          />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
