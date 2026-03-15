import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, List, ListItem, Timestamp } from "../ui";
import { activeAccount } from "../config";

export async function mailScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  try {
    const account = params.arg0 || activeAccount("mail");
    const accountFlag = account ? `-a ${account}` : "";
    const raw = execSync(
      `gog gmail list 'in:inbox' --max 7 ${accountFlag} -j --results-only --no-input`,
      { timeout: 15_000 },
    ).toString();
    const threads = JSON.parse(raw);
    if (!Array.isArray(threads) || threads.length === 0) return null;

    const unread = threads.filter((t: any) => t.labels?.includes("UNREAD")).length;
    const subtitle = unread > 0 ? `${unread} unread` : `${threads.length} threads`;

    return {
      name: "mail",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="mail" title="Inbox" subtitle={subtitle} />
          <Col>
            <List>
              {threads.slice(0, 6).map((t: any) => {
                const from = t.from?.match(/^(.+?)\s*</)?.[1] ?? t.from?.replace(/@.*/, "") ?? "?";
                const time = t.date?.split(" ")[1] ?? "";
                const isUnread = t.labels?.includes("UNREAD");
                return (
                  <ListItem
                    text={from}
                    secondary={t.subject ?? ""}
                    value={time}
                    icon={isUnread ? "mail" : "file"}
                    color={isUnread ? "accent" : "muted"}
                  />
                );
              })}
            </List>
          </Col>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch {
    return null;
  }
}
