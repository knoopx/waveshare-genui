#!/usr/bin/env bun
/**
 * Hacker News — live top stories from HN API.
 *
 * Usage: hackernews.tsx [--count 8]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";
const argv = process.argv.slice(2);
let count = 6;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]);
}

type Story = { title: string; score: number; comments: number; age: string };

const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
  headers: { "User-Agent": "waveshare-genui" },
  signal: AbortSignal.timeout(10000),
});
if (!res.ok) throw new Error(`HN API ${res.status}`);
const ids: number[] = await res.json();

const items = await Promise.all(
  ids.slice(0, count).map(async (id) => {
    const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
      headers: { "User-Agent": "waveshare-genui" },
      signal: AbortSignal.timeout(10000),
    });
    return r.json();
  }),
);

const now = Date.now() / 1000;
const stories: Story[] = items
  .filter((i) => i?.type === "story")
  .map((i) => {
    const ageSec = now - (i.time ?? now);
    let age: string;
    if (ageSec < 3600) age = `${Math.floor(ageSec / 60)}m`;
    else if (ageSec < 86400) age = `${Math.floor(ageSec / 3600)}h`;
    else age = `${Math.floor(ageSec / 86400)}d`;
    return { title: i.title ?? "", score: i.score ?? 0, comments: i.descendants ?? 0, age };
  });

emit(
  <Canvas>
    <Header icon={"\uf1d4"} title="Hacker News" />
    <Content>
      <List>
        {stories.map((s) => (
          <ListItem text={s.title} secondary={`${s.score} pts · ${s.comments} comments · ${s.age}`} />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
