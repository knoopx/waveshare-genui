#!/usr/bin/env bun
/**
 * GitHub Trending — daily trending repositories.
 *
 * Usage: trending.tsx [--count 8] [--language typescript] [--since daily|weekly|monthly]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let count = 7;
let language = "";
let since = "daily";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]);
  else if (argv[i] === "--language" && argv[i + 1]) language = argv[++i];
  else if (argv[i] === "--since" && argv[i + 1]) since = argv[++i];
}

type Repo = { name: string; description: string; language: string; stars: string; added: string };

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

const url = `https://githubtrending.lessx.xyz/trending?since=${since}${language ? `&language=${language}` : ""}`;
const res = await fetch(url, {
  headers: { "User-Agent": "waveshare-genui" },
  signal: AbortSignal.timeout(10000),
});
if (!res.ok) throw new Error(`GitHub Trending ${res.status}`);
const data: any[] = await res.json();

const repos: Repo[] = data.slice(0, count).map((r) => ({
  name: r.name ?? "",
  description: (r.description ?? "").slice(0, 80),
  language: r.language ?? "",
  stars: r.stars ?? "0",
  added: r.increased ?? "",
}));

const subtitle = language ? `${language} · ${since}` : since;

emit(
  <Canvas>
    <Header icon={"\uf09b"} title="Trending" subtitle={subtitle} />
    <Content>
      <List>
        {repos.map((r) => (
          <ListItem
            text={r.name}
            secondary={`${wrapTwoLines(r.description)}${r.language ? `\n${r.language}` : ""} · ★${r.stars} · ${r.added}`}
          />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
