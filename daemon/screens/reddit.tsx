import React from "react";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, List, ListItem, Timestamp } from "../ui";

/** arg0 = subreddit name (without r/) */
export async function redditScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  const sub = params.arg0;
  if (!sub) return null;

  try {
    const url = `https://www.reddit.com/r/${sub}/hot.json?limit=6&raw_json=1`;
    const data = await (await fetch(url, { headers: { "User-Agent": "waveshare-genui/1.0" }, signal: AbortSignal.timeout(10_000) })).json();
    const now = Date.now() / 1000;

    const posts = (data.data?.children ?? []).map((c: any) => {
      const d = c.data;
      const age = now - (d.created_utc ?? now);
      const ageStr = age < 3600 ? `${Math.floor(age / 60)}m` : age < 86400 ? `${Math.floor(age / 3600)}h` : `${Math.floor(age / 86400)}d`;
      return { title: d.title ?? "", score: d.score ?? 0, comments: d.num_comments ?? 0, age: ageStr };
    });

    if (posts.length === 0) return null;

    return {
      name: "reddit",
      priority: "low",
      element: (
        <Canvas>
          <Header icon="rss" title={`r/${sub}`} />
          <Col>
            <List>
              {posts.map((p: any) => (
                <ListItem
                  text={p.title}
                  secondary={`↑${p.score} · ${p.comments} comments · ${p.age}`}
                  color={p.score > 100 ? "orange" : p.score > 30 ? "yellow" : "accent"}
                />
              ))}
            </List>
          </Col>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch { return null; }
}
