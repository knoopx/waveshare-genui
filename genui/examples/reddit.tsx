#!/usr/bin/env bun
/**
 * Reddit — top posts from a subreddit.
 *
 * Usage: reddit.tsx <subreddit> [--count 8] [--sort hot|new|top|rising]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let subreddit = "";
let count = 7;
let sort = "hot";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]);
  else if (argv[i] === "--sort" && argv[i + 1]) sort = argv[++i];
  else if (!argv[i].startsWith("-")) subreddit = argv[i];
}
if (!subreddit) throw new Error("Usage: reddit.tsx <subreddit> [--count 8] [--sort hot]");

type Post = { title: string; score: number; comments: number; age: string };

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

const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${count}&raw_json=1`;
const res = await fetch(url, {
  headers: { "User-Agent": "waveshare-genui/1.0" },
  signal: AbortSignal.timeout(10000),
});
if (!res.ok) throw new Error(`Reddit ${res.status}`);
const data = await res.json();

const now = Date.now() / 1000;
const posts: Post[] = (data.data?.children ?? []).map((c: any) => {
  const d = c.data;
  const ageSec = now - (d.created_utc ?? now);
  let age: string;
  if (ageSec < 3600) age = `${Math.floor(ageSec / 60)}m`;
  else if (ageSec < 86400) age = `${Math.floor(ageSec / 3600)}h`;
  else age = `${Math.floor(ageSec / 86400)}d`;
  return { title: d.title ?? "", score: d.score ?? 0, comments: d.num_comments ?? 0, age };
});

emit(
  <Canvas>
    <Header icon={"\uf03a"} title={`r/${subreddit}`} subtitle={sort} />
    <Content>
      <List>
        {posts.map((p) => (
          <ListItem
            text={wrapTwoLines(p.title)}
            secondary={`↑${p.score} · ${p.comments} comments\n${p.age}`}
          />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
