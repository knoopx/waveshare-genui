import React from "react";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, List, ListItem, Timestamp } from "../ui";

export async function lobstersScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  try {
    const data = await (await fetch("https://lobste.rs/hottest.json", { signal: AbortSignal.timeout(10_000) })).json();
    const now = Date.now();

    const stories = (data as any[]).slice(0, 6).map((s) => {
      const age = (now - new Date(s.created_at).getTime()) / 1000;
      const ageStr = age < 3600 ? `${Math.floor(age / 60)}m` : age < 86400 ? `${Math.floor(age / 3600)}h` : `${Math.floor(age / 86400)}d`;
      return {
        title: s.title ?? "",
        score: s.score ?? 0,
        comments: s.comment_count ?? 0,
        tags: (s.tags ?? []).join(", "),
        age: ageStr,
      };
    });

    return {
      name: "lobsters",
      priority: "low",
      element: (
        <Canvas>
          <Header icon="rss" title="Lobsters" />
          <Col>
            <List>
              {stories.map((s) => (
                <ListItem
                  text={s.title}
                  secondary={`↑${s.score} · ${s.comments} comments · ${s.tags} · ${s.age}`}
                  color={s.score > 50 ? "orange" : s.score > 20 ? "yellow" : "accent"}
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
