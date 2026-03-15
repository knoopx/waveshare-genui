import React from "react";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, List, ListItem, Timestamp } from "../ui";

export async function hackernewsScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  try {
    const ids = await (await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(10_000) })).json();
    const items = await Promise.all(
      (ids as number[]).slice(0, 6).map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(10_000) }).then((r) => r.json()),
      ),
    );

    const now = Date.now() / 1000;
    const stories = items.filter((i: any) => i?.type === "story").map((i: any) => {
      const age = now - (i.time ?? now);
      const ageStr = age < 3600 ? `${Math.floor(age / 60)}m` : age < 86400 ? `${Math.floor(age / 3600)}h` : `${Math.floor(age / 86400)}d`;
      return { title: i.title ?? "", score: i.score ?? 0, comments: i.descendants ?? 0, age: ageStr };
    });

    return {
      name: "hackernews",
      priority: "low",
      element: (
        <Canvas>
          <Header icon="rss" title="Hacker News" />
          <Col>
            <List>
              {stories.map((s) => (
                <ListItem
                  text={s.title}
                  secondary={`${s.score} pts · ${s.comments} comments · ${s.age}`}
                  color={s.score > 200 ? "orange" : s.score > 50 ? "yellow" : "accent"}
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
