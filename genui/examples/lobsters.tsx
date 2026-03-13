#!/usr/bin/env bun
/**
 * Lobsters — hottest stories from lobste.rs.
 *
 * Usage: lobsters.tsx [--count 8]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let count = 7;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]);
}

type Story = { title: string; score: number; comments: number; tags: string; age: string };

function wrapTwoLines(text: string, line = 34): string {
  if (text.length <= line) return text;
  const words = text.split(/\s+/);
  let first = "";
  let second = "";

  for (const w of words) {
    if ((first ? `${first} ${w}` : w).length <= line) first = first ? `${first} ${w}` : w;
    else second = second ? `${second} ${w}` : w;
  }

  if (!second) return first;
  return `${first}\n${second}`;
}

const res = await fetch("https://lobste.rs/hottest.json", {
  headers: { "User-Agent": "waveshare-genui" },
  signal: AbortSignal.timeout(10000),
});
if (!res.ok) throw new Error(`Lobsters ${res.status}`);
const data: any[] = await res.json();

const now = Date.now();
const stories: Story[] = data.slice(0, count).map((s) => {
  const created = new Date(s.created_at).getTime();
  const ageSec = (now - created) / 1000;
  let age: string;
  if (ageSec < 3600) age = `${Math.floor(ageSec / 60)}m`;
  else if (ageSec < 86400) age = `${Math.floor(ageSec / 3600)}h`;
  else age = `${Math.floor(ageSec / 86400)}d`;
  const tags = (s.tags ?? []).join(", ");
  return { title: s.title ?? "", score: s.score ?? 0, comments: s.comment_count ?? 0, tags, age };
});

emit(
  <Canvas>
    <Header icon={"\uf03a"} title="Lobsters" />
    <Content>
      <List>
        {stories.map((s) => (
          <ListItem
            text={wrapTwoLines(s.title)}
            secondary={`↑${s.score} · ${s.comments} comments\n${s.tags} · ${s.age}`}
          />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
