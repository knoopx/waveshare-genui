import React from "react";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Row, Col, Text, Icon, List, ListItem, Separator, Timestamp,
} from "../ui";

const WMO: Record<number, [string, string]> = {
  0: ["sun", "Clear"], 1: ["sun", "Mostly Clear"], 2: ["cloud", "Partly Cloudy"],
  3: ["cloud", "Overcast"], 45: ["cloud", "Fog"], 48: ["cloud", "Rime Fog"],
  51: ["cloud", "Light Drizzle"], 53: ["cloud", "Drizzle"], 55: ["cloud", "Dense Drizzle"],
  61: ["cloud", "Light Rain"], 63: ["cloud", "Rain"], 65: ["cloud", "Heavy Rain"],
  71: ["cloud", "Light Snow"], 73: ["cloud", "Snow"], 75: ["cloud", "Heavy Snow"],
  80: ["cloud", "Showers"], 81: ["cloud", "Heavy Showers"], 82: ["cloud", "Violent Showers"],
  95: ["bolt", "Thunderstorm"], 96: ["bolt", "Hail Storm"], 99: ["bolt", "Severe Hail"],
};

function wmo(code: number): [string, string] {
  return WMO[code] ?? ["cloud", `WMO ${code}`];
}

export async function weatherScreen(ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${ctx.lat}&longitude=${ctx.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();

    const cur = data.current;
    const daily = data.daily;
    const [icon, desc] = wmo(cur.weather_code);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    function dayLabel(iso: string, i: number): string {
      if (i === 0) return "Today";
      return dayNames[new Date(iso).getDay()];
    }

    return {
      name: "weather",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="location" title={ctx.city} />
          <Col align="center">
            <Row gap="lg" align="center" justify="center">
              <Icon name={icon} size="xl" color="accent" />
              <Text size="3xl" weight="bold">{`${Math.round(cur.temperature_2m)}°C`}</Text>
            </Row>
            <Text size="xl" weight="bold" align="center">{desc}</Text>
            <Text size="md" color="muted" align="center">
              {`Feels like ${Math.round(cur.apparent_temperature)}°C`}
            </Text>
          </Col>
          <Separator />
          <List>
            <ListItem icon="cloud" text={`Humidity: ${cur.relative_humidity_2m}%`} />
            <ListItem icon="cloud" text={`Wind: ${Math.round(cur.wind_speed_10m)} km/h`} />
            <ListItem icon="cloud" text={`Precip: ${cur.precipitation} mm`} />
          </List>
          <Separator />
          <Row gap="lg" justify="center" align="center">
            {daily.time.map((day: string, i: number) => (
              <Col gap="xs" align="center" justify="center">
                <Text size="sm" color="muted">{dayLabel(day, i)}</Text>
                <Icon name={wmo(daily.weather_code[i])[0]} color="accent" />
                <Text size="sm" color="accent">
                  {`${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°`}
                </Text>
              </Col>
            ))}
          </Row>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch {
    return null;
  }
}
