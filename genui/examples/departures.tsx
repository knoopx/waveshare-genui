#!/usr/bin/env bun
/**
 * Train departures — live from Rodalies de Catalunya API.
 *
 * Usage: departures.tsx --station-id 78805 [--station "Passeig de Gràcia"] [--minutes 120]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";
const argv = process.argv.slice(2);
let stationId = "";
let stationName = "Departures";
let minutes = 120;

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--station-id" && argv[i + 1]) stationId = argv[++i];
  else if (argv[i] === "--station" && argv[i + 1]) stationName = argv[++i];
  else if (argv[i] === "--minutes" && argv[i + 1]) minutes = parseInt(argv[++i]);
}
if (!stationId) throw new Error("Usage: departures.tsx --station-id 78805 [--station NAME]");

type Departure = { destination: string; line: string; time: string; delay: number };

const url = `https://serveisgrs.rodalies.gencat.cat/api/departures?stationId=${stationId}&minute=${minutes}&fullResponse=true&lang=en`;
const res = await fetch(url, {
  headers: { "User-Agent": "waveshare-genui" },
  signal: AbortSignal.timeout(10000),
});
if (!res.ok) throw new Error(`Rodalies API ${res.status}: ${res.statusText}`);
const raw = await res.json();

const departures: Departure[] = (raw.trains ?? []).slice(0, 8).map((t: any) => {
  let depTime = t.departureDateHourSelectedStation ?? "";
  try {
    depTime = new Date(depTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { /* keep raw */ }
  const dest = typeof t.destinationStation === "object" ? t.destinationStation?.name ?? "" : String(t.destinationStation ?? "");
  const line = typeof t.line === "object" ? t.line?.name ?? "" : String(t.line ?? "");
  return { destination: dest, line, time: depTime, delay: t.delay ?? 0 };
});

emit(
  <Canvas>
    <Header icon={"\uf238"} title={stationName} />
    <Content>
      <List>
        {departures.map((d) => {
          const delayStr = d.delay > 0 ? ` · +${d.delay} min` : "";
          return (
            <ListItem text={d.destination} secondary={`${d.line} · ${d.time}${delayStr}`} icon={"\uf238"} />
          );
        })}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
