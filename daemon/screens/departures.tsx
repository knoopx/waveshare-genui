import React from "react";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, List, ListItem, Badge, Timestamp } from "../ui";

/** arg0 = station ID */
export async function departuresScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  const stationId = params.arg0;
  if (!stationId) return null;
  const stationName = params.arg1 ?? "Departures";

  try {
    const url = `https://serveisgrs.rodalies.gencat.cat/api/departures?stationId=${stationId}&minute=120&fullResponse=true&lang=en`;
    const raw = await (await fetch(url, { headers: { "User-Agent": "waveshare-genui" }, signal: AbortSignal.timeout(10_000) })).json();

    const departures = (raw.trains ?? []).slice(0, 7).map((t: any) => {
      let time = t.departureDateHourSelectedStation ?? "";
      try { time = new Date(time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch { /* ignore invalid departure time */ }
      const dest = typeof t.destinationStation === "object" ? t.destinationStation?.name ?? "" : String(t.destinationStation ?? "");
      const line = typeof t.line === "object" ? t.line?.name ?? "" : String(t.line ?? "");
      const delay = t.delay ?? 0;
      return { dest, line, time, delay };
    });

    if (departures.length === 0) return null;

    return {
      name: "departures",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="train" title={stationName} />
          <Col>
            <List>
              {departures.map((d: any) => (
                <ListItem
                  text={d.dest}
                  secondary={`${d.time}${d.delay > 0 ? ` · +${d.delay} min` : ""}`}
                  icon={<Badge label={d.line} color="accent" />}
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
