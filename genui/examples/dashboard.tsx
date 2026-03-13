#!/usr/bin/env bun
/**
 * Dashboard — clock, weather, now playing, next departure, stocks, calendar.
 *
 * Usage: dashboard.tsx [--lat 41.39] [--lon 2.17] [--city Barcelona]
 *                      [--station "Passeig de Gràcia"]
 *                      [--symbols AAPL,MSFT,BTC-USD]
 */
import React from "react";
import { execSync } from "child_process";
import { emit } from "../src/openui-emitter";
import {
  Canvas, Header, Content, Stack, Text, Icon, Separator, Badge, List, ListItem, Spacer, Timestamp,
} from "../src/components";
import { ICON_SIZE } from "../src/tokens";

const argv = process.argv.slice(2);
let lat = 41.39, lon = 2.17;
let symbols = ["AAPL", "MSFT", "BTC-USD"];

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--lat" && argv[i + 1]) lat = parseFloat(argv[++i]);
  else if (argv[i] === "--lon" && argv[i + 1]) lon = parseFloat(argv[++i]);

  else if (argv[i] === "--symbols" && argv[i + 1]) symbols = argv[++i].split(",");
}

// Clock
const now = new Date();
const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

// Weather
let temp = "?", feelsLike = "", humidity = "";
try {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (res.ok) {
    const data = await res.json();
    const cur = data.current;
    temp = `${Math.round(cur.temperature_2m)}°C`;
    feelsLike = `Feels ${Math.round(cur.apparent_temperature)}°C`;
    humidity = `${cur.relative_humidity_2m}%`;
  }
} catch { /* offline */ }

// Now playing
let trackLine = "";
try {
  const title = execSync("playerctl metadata xesam:title 2>/dev/null", { timeout: 2000 }).toString().trim();
  const artist = execSync("playerctl metadata xesam:artist 2>/dev/null", { timeout: 2000 }).toString().trim();
  if (title) trackLine = artist ? `${artist} — ${title}` : title;
} catch { /* no player */ }

// Stocks (quick fetch)
type Tick = { sym: string; pct: number };
const ticks: Tick[] = [];
for (const sym of symbols) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=1d&interval=1d`;
    const res = await fetch(url, { headers: { "User-Agent": "waveshare-genui" }, signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const raw = await res.json();
      const meta = raw.chart.result[0].meta;
      const prev = meta.chartPreviousClose ?? meta.regularMarketPrice;
      const pct = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
      ticks.push({ sym: sym.toUpperCase(), pct });
    }
  } catch { /* skip */ }
}

// Calendar (via gog)
type Event = { summary: string; start: string };
let events: Event[] = [];
try {
  const raw = execSync("gog calendar today --max 5 -j --results-only", { timeout: 10000 }).toString();
  events = JSON.parse(raw).map((e: any) => ({
    summary: e.summary ?? "No title",
    start: e.start?.split(" ")[1]?.slice(0, 5) ?? "",
  }));
} catch { /* no gog or no events */ }

emit(
  <Canvas>
    <Header
      icon={<Icon glyph={"\uf017"} color="accent" size={ICON_SIZE.md} />}
      title={[<Text content={time} size="lg" weight="bold" />, <Text content={dateStr} size="md" color="muted" />]}
      subtitle={[<Icon glyph={"\ue302"} color="accent" />, <Text content={temp} size="md" weight="bold" />, ...(feelsLike ? [<Text content={feelsLike} size="sm" color="muted" />] : [])]}
    />
    <Content gap="sm">
      {trackLine ? (
        <Stack direction="row" gap="md" align="center">
          <Icon glyph={"\uf001"} color="muted" />
          <Text content={trackLine} size="md" color="muted" />
        </Stack>
      ) : null}
      {ticks.length > 0 ? (
        <Stack direction="row" gap="md" align="center">
          <Icon glyph={"\uf201"} color="muted" />
          <Stack direction="row" gap="sm">
            {ticks.map((t) => (
              <Badge
                label={`${t.sym} ${t.pct >= 0 ? "+" : ""}${t.pct.toFixed(1)}%`}
                color={t.pct >= 0 ? "green" : "red"}
              />
            ))}
          </Stack>
        </Stack>
      ) : null}
      {events.length > 0 ? (
        <>
          <Separator />
          <List>
            {events.map((e) => (
              <ListItem text={e.summary} secondary={e.start} icon={"\uf073"} />
            ))}
          </List>
        </>
      ) : null}
    </Content>
    <Timestamp />
  </Canvas>,
);
