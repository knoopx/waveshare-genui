#!/usr/bin/env bun
/**
 * Home Assistant — entity status dashboard.
 *
 * Usage: homeassistant.tsx [--url http://homeassistant.local:8123] [--token TOKEN]
 *        homeassistant.tsx --domain light,switch,climate
 *
 * Reads HA_URL and HA_TOKEN from env if not provided.
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import {
  Canvas, Header, Content, List, ListItem, Stack, Gauge, Separator, Timestamp,
} from "../src/components";

const argv = process.argv.slice(2);
let url = process.env.HA_URL ?? "http://homeassistant.local:8123";
let token = process.env.HA_TOKEN ?? "";
let domains = ["light", "switch", "climate", "sensor", "binary_sensor"];

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--url" && argv[i + 1]) url = argv[++i];
  else if (argv[i] === "--token" && argv[i + 1]) token = argv[++i];
  else if (argv[i] === "--domain" && argv[i + 1]) domains = argv[++i].split(",");
}

if (!token) throw new Error("Set HA_TOKEN env or pass --token");

type Entity = { id: string; name: string; state: string; domain: string; unit?: string };

const res = await fetch(`${url}/api/states`, {
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  signal: AbortSignal.timeout(10000),
});
if (!res.ok) throw new Error(`HA API ${res.status}`);
const states: any[] = await res.json();

const ICONS: Record<string, string> = {
  light: "\uf0eb",
  switch: "\uf205",
  climate: "\uf2c9",
  sensor: "\uf2c8",
  binary_sensor: "\uf192",
  lock: "\uf023",
  cover: "\uf07d",
  fan: "\uf085",
  media_player: "\uf04b",
};

const entities: Entity[] = states
  .filter((s) => {
    const domain = s.entity_id.split(".")[0];
    return domains.includes(domain) && s.state !== "unavailable";
  })
  .map((s) => ({
    id: s.entity_id,
    name: s.attributes?.friendly_name ?? s.entity_id,
    state: s.state,
    domain: s.entity_id.split(".")[0],
    unit: s.attributes?.unit_of_measurement,
  }))
  .slice(0, 10);

// Extract climate entities for gauges
const climates = entities.filter((e) => e.domain === "climate" || (e.domain === "sensor" && e.unit === "°C"));
const gaugeEntities = climates.slice(0, 3);
const listEntities = entities.filter((e) => !gaugeEntities.includes(e)).slice(0, 7);

emit(
  <Canvas>
    <Header icon={"\uf015"} title="Home Assistant" />
    <Content>
      {gaugeEntities.length > 0 && (
        <Stack direction="row" gap="xl" align="center" justify="center">
          {gaugeEntities.map((e) => (
            <Gauge
              label={e.name.replace(/ temperature$/i, "")}
              value={parseFloat(e.state) || 0}
              max={50}
              unit={e.unit ?? "°C"}
              size={160}
            />
          ))}
        </Stack>
      )}
      {gaugeEntities.length > 0 && listEntities.length > 0 && <Separator />}
      {listEntities.length > 0 && (
        <List>
          {listEntities.map((e) => {
            const icon = ICONS[e.domain] ?? "\uf111";
            const display = e.unit ? `${e.state} ${e.unit}` : e.state;
            return <ListItem text={e.name} icon={icon} value={display} />;
          })}
        </List>
      )}
    </Content>
    <Timestamp />
  </Canvas>,
);
