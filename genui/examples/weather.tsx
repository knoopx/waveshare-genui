#!/usr/bin/env bun
/**
 * Weather display — live from Open-Meteo (no API key needed).
 *
 * Usage: weather.tsx [--lat 41.39] [--lon 2.17] [--city Barcelona]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, Stack, Text, Icon, Separator, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let lat = 41.39,
  lon = 2.17,
  city = "Barcelona";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--lat" && argv[i + 1]) lat = parseFloat(argv[++i]);
  else if (argv[i] === "--lon" && argv[i + 1]) lon = parseFloat(argv[++i]);
  else if (argv[i] === "--city" && argv[i + 1]) city = argv[++i];
}

const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`;
const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
const data = await res.json();

const cur = data.current;
const daily = data.daily;

// Nerd Font weather icons (0xe3xx range)
const WMO: Record<number, [string, string]> = {
  0: ["\ue30d", "Clear"],         // weather-day_sunny
  1: ["\ue30c", "Mostly Clear"],  // weather-day_sunny_overcast
  2: ["\ue302", "Partly Cloudy"], // weather-day_cloudy
  3: ["\ue312", "Overcast"],      // weather-cloudy
  45: ["\ue313", "Fog"],          // weather-fog
  48: ["\ue313", "Rime Fog"],     // weather-fog
  51: ["\ue31b", "Light Drizzle"],// weather-sprinkle
  53: ["\ue31b", "Drizzle"],      // weather-sprinkle
  55: ["\ue31b", "Dense Drizzle"],// weather-sprinkle
  61: ["\ue318", "Light Rain"],   // weather-rain
  63: ["\ue318", "Rain"],         // weather-rain
  65: ["\ue318", "Heavy Rain"],   // weather-rain
  71: ["\ue31a", "Light Snow"],   // weather-snow
  73: ["\ue31a", "Snow"],         // weather-snow
  75: ["\ue31a", "Heavy Snow"],   // weather-snow
  80: ["\ue319", "Showers"],      // weather-showers
  81: ["\ue319", "Heavy Showers"],// weather-showers
  82: ["\ue319", "Violent Showers"],// weather-showers
  95: ["\ue31d", "Thunderstorm"], // weather-thunderstorm
  96: ["\ue314", "Hail Storm"],   // weather-hail
  99: ["\ue314", "Severe Hail"],  // weather-hail
};

function wmo(code: number): [string, string] {
  return WMO[code] ?? ["\uf0c2", `WMO ${code}`];
}

const [icon, desc] = wmo(cur.weather_code);
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(iso: string, i: number): string {
  if (i === 0) return "Today";
  return dayNames[new Date(iso).getDay()];
}

emit(
  <Canvas>
    <Header icon={"\uf124"} title={city} />
    <Content gap="lg">
      <Stack direction="column" gap="sm" align="center" justify="center">
        <Stack direction="row" gap="lg" align="center" justify="center">
          <Icon glyph={icon} size={80} color="accent" />
          <Text content={`${Math.round(cur.temperature_2m)}°C`} size="3xl" weight="bold" align="center" />
        </Stack>
        <Text content={desc} size="xl" weight="bold" align="center" />
        <Text content={`Feels like ${Math.round(cur.apparent_temperature)}°C`} size="md" color="muted" align="center" />
      </Stack>

      <Stack direction="column" gap="sm" align="center" justify="center">
        <Stack direction="row" gap="lg" align="center" justify="center">
          <Icon glyph={"\ue275"} color="accent" />
          <Text content={`Humidity: ${cur.relative_humidity_2m}%`} size="md" align="center" />
        </Stack>
        <Separator />
        <Stack direction="row" gap="lg" align="center" justify="center">
          <Icon glyph={"\ue34b"} color="accent" />
          <Text content={`Wind: ${Math.round(cur.wind_speed_10m)} km/h`} size="md" align="center" />
        </Stack>
        <Separator />
        <Stack direction="row" gap="lg" align="center" justify="center">
          <Icon glyph={"\ue220"} color="accent" />
          <Text content={`Precip: ${cur.precipitation} mm`} size="md" align="center" />
        </Stack>
      </Stack>

      <Stack direction="row" gap="lg" justify="center" align="center">
        {daily.time.map((day: string, i: number) => (
          <Stack direction="column" gap="xs" align="center">
            <Text content={dayLabel(day, i)} size="sm" color="muted" />
            <Icon glyph={wmo(daily.weather_code[i])[0]} color="accent" />
            <Text content={`${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°`} size="sm" color="accent" />
          </Stack>
        ))}
      </Stack>
    </Content>
    <Timestamp />
  </Canvas>,
);
