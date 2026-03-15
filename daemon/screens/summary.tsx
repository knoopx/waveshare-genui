import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, Row, Stat, Separator, List, ListItem, Timestamp } from "../ui";

function sh(cmd: string): string {
  return execSync(cmd, { timeout: 10_000 }).toString().trim();
}

/** End-of-day summary: today's commits, mail stats. */
export async function summaryScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  let commits = 0;
  let lastMsg = "";
  try {
    const today = now.toISOString().slice(0, 10);
    const count = sh(`find ~/Projects -maxdepth 3 -name .jj -type d -exec sh -c 'cd "$(dirname "{}")" && jj log --no-graph -r "author_date(after:${today}) & mine()" -T "change_id.short(1)" 2>/dev/null' \\; | wc -c`);
    commits = parseInt(count) || 0;
    if (commits > 0) {
      lastMsg = sh(`find ~/Projects -maxdepth 3 -name .jj -type d -exec sh -c 'cd "$(dirname "{}")" && jj log --no-graph -r "author_date(after:${today}) & mine()" -T "description.first_line() ++ "\\n"" --limit 1 2>/dev/null' \\; | head -1`);
    }
  } catch {
    /* ignore unavailable commit history */
  }

  let unread = 0;
  try {
    const raw = sh("gog gmail list 'is:unread in:inbox' --max 50 -j --results-only --no-input 2>/dev/null");
    unread = JSON.parse(raw).length;
  } catch {
    /* ignore unavailable gmail state */
  }

  let eventsToday = 0;
  try {
    const raw = sh("gog calendar events --today --max 20 -j --results-only --no-input 2>/dev/null");
    eventsToday = JSON.parse(raw).length;
  } catch {
    /* ignore unavailable calendar state */
  }

  return {
    name: "summary",
    priority: "low",
    element: (
      <Canvas>
        <Header icon="chart" title="Summary" subtitle={dateStr} />
        <Col gap="sm">
          <Row gap="md" align="stretch" justify="start" wrap={true}>
            <Stat label="Commits" value={String(commits)} color={commits > 0 ? "green" : "muted"} />
            <Stat label="Unread" value={String(unread)} color={unread > 0 ? "accent" : "muted"} />
            <Stat label="Events" value={String(eventsToday)} color={eventsToday > 0 ? "cyan" : "muted"} />
          </Row>
          {lastMsg ? <Separator /> : null}
          {lastMsg ? (
            <List>
              <ListItem text={lastMsg} secondary="latest commit" icon="git" color="muted" />
            </List>
          ) : null}
        </Col>
        <Timestamp />
      </Canvas>
    ),
  };
}
