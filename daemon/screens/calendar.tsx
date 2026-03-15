import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, List, ListItem, EmptyState, Timestamp } from "../ui";
import { activeAccount } from "../config";

export async function calendarScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function empty(): Screen {
    return {
      name: "calendar",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="calendar" title={dateStr} />
          <EmptyState title="No events today" icon="calendar" />
          <Timestamp />
        </Canvas>
      ),
    };
  }

  try {
    const account = params.arg0 || activeAccount("calendar");
    const accountFlag = account ? `-a ${account}` : "";
    const raw = execSync(
      `gog calendar events --today --max 8 ${accountFlag} -j --results-only --no-input`,
      { timeout: 15_000 },
    ).toString();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return empty();

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

    return {
      name: "calendar",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="calendar" title={dateStr} />
          <Col>
            <List>
              {events.map((e) => (
                <ListItem text={e.summary} secondary={e.time} icon="clock" />
              ))}
            </List>
          </Col>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch {
    return empty();
  }
}
