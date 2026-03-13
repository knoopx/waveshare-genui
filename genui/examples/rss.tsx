#!/usr/bin/env bun
/**
 * RSS feed reader — displays recent items from an RSS/Atom feed.
 *
 * Usage: rss.tsx <url> [--title "Feed Name"] [--count 8]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let feedUrl = "";
let title = "";
let count = 7;

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
  else if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]);
  else if (!argv[i].startsWith("-")) feedUrl = argv[i];
}
if (!feedUrl) throw new Error("Usage: rss.tsx <url> [--title NAME] [--count 8]");

type Item = { title: string; published: string; source?: string };

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

const res = await fetch(feedUrl, {
  headers: { "User-Agent": "waveshare-genui" },
  signal: AbortSignal.timeout(10000),
});
if (!res.ok) throw new Error(`Feed ${res.status}`);
const xml = await res.text();

// Minimal XML extraction — works for RSS <item> and Atom <entry>
function extractAll(tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) matches.push(m[1]);
  return matches;
}

function extractFirst(text: string, tag: string): string {
  const m = text.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return (m?.[1] ?? m?.[2] ?? "").trim();
}

// Try RSS <item> then Atom <entry>
let entries = extractAll("item");
if (entries.length === 0) entries = extractAll("entry");

// Feed title fallback
if (!title) {
  const channelTitle = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] ?? "RSS";
  title = channelTitle.trim();
}

const now = Date.now();
const items: Item[] = entries.slice(0, count).map((entry) => {
  const itemTitle = extractFirst(entry, "title");
  const pubDate = extractFirst(entry, "pubDate") || extractFirst(entry, "published") || extractFirst(entry, "updated");
  let age = "";
  if (pubDate) {
    const ageSec = (now - new Date(pubDate).getTime()) / 1000;
    if (ageSec < 3600) age = `${Math.floor(ageSec / 60)}m`;
    else if (ageSec < 86400) age = `${Math.floor(ageSec / 3600)}h`;
    else if (ageSec < 604800) age = `${Math.floor(ageSec / 86400)}d`;
    else age = new Date(pubDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  return { title: itemTitle, published: age };
});

emit(
  <Canvas>
    <Header icon={"\uf09e"} title={title} />
    <Content>
      <List>
        {items.map((item) => (
          <ListItem text={wrapTwoLines(item.title)} value={item.published} />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
