import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, List, ListItem, Separator, Timestamp } from "../ui";

/** Shows upcoming meeting details: time, attendees, location/link. */
export async function meetingScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  try {
    const raw = execSync(
      "gog calendar events --today --max 3 -j --results-only --no-input",
      { timeout: 15_000 },
    ).toString();
    const events = JSON.parse(raw);
    if (!Array.isArray(events) || events.length === 0) return null;

    const now = Date.now();
    // Find the next upcoming event
    const upcoming = events.find((e: any) => {
      const start = e.start?.dateTime;
      if (!start) return false;
      const diff = (new Date(start).getTime() - now) / 60_000;
      return diff > 0 && diff <= 30;
    });

    if (!upcoming) return null;

    const start = new Date(upcoming.start.dateTime);
    const end = upcoming.end?.dateTime ? new Date(upcoming.end.dateTime) : null;
    const timeStr = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}` +
      (end ? ` – ${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}` : "");

    const minutesUntil = Math.round((start.getTime() - now) / 60_000);
    const attendees = (upcoming.attendees ?? [])
      .filter((a: any) => !a.self)
      .map((a: any) => a.email?.split("@")[0] ?? "")
      .filter(Boolean)
      .slice(0, 6);

    const location = upcoming.location ?? "";
    const meetLink = upcoming.hangoutLink ?? upcoming.conferenceData?.entryPoints?.[0]?.uri ?? "";

    return {
      name: "meeting",
      priority: "high",
      element: (
        <Canvas>
          <Header icon="calendar" title={upcoming.summary ?? "Meeting"} subtitle={`in ${minutesUntil} min`} />
          <Col gap="sm">
            <ListItem text={timeStr} icon="clock" />
            {location ? <ListItem text={location} icon="location" /> : null}
            {meetLink ? <ListItem text={meetLink.replace(/^https?:\/\//, "").slice(0, 40)} icon="link" /> : null}
            {attendees.length > 0 ? <Separator /> : null}
            {attendees.length > 0 ? (
              <List>
                {attendees.map((a: string) => (
                  <ListItem text={a} icon="user" />
                ))}
              </List>
            ) : null}
          </Col>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch { return null; }
}
