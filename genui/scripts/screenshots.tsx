#!/usr/bin/env bun
/**
 * Generate deterministic screenshots from mock JSX data.
 *
 * These are NOT the live examples — they use hardcoded sample data
 * so screenshots are reproducible without network access.
 */

import React from "react";
import { resolve } from "path";
import { mkdirSync, writeFileSync } from "fs";
import sharp from "sharp";
import { rasterize } from "../src/rasterizer";
import { library } from "../src/library";
import { toOpenUILang } from "../src/openui-emitter";
import { parseOpenUILang } from "../src/openui";
import {
  Canvas,
  Header,
  Content,
  Stack,
  Text,
  Icon,
  Badge,
  Card,
  Separator,
  Spacer,
  Table,
  Col,
  List,
  ListItem,
  Gauge,
  ProgressBar,
  Sparkline,
  StatusDot,
  Timestamp,
} from "../src/components";

const OUT = resolve(import.meta.dir, "../../screenshots");
mkdirSync(OUT, { recursive: true });

/** Convert JSX mock to a rendered element via the openui-lang round-trip. */
function render(jsx: React.ReactElement): React.ReactElement {
  const text = toOpenUILang(jsx);
  return parseOpenUILang(text, library).element;
}

// ─── Mock screens ───────────────────────────────────────────────────────

const MOCKS: Record<string, React.ReactElement> = {
  calendar: (
    <Canvas>
      <Header icon={"\uf073"} title="Friday, March 13" />
      <Content>
        <List>
          <ListItem text="Team Standup" secondary="09:00 – 09:15 · Google Meet" icon={"\uf017"} />
          <ListItem text="Sprint Planning" secondary="10:00 – 11:00" icon={"\uf017"} />
          <ListItem text="Lunch with Alex" secondary="13:00 – 14:00 · Bar Central" icon={"\uf017"} />
          <ListItem text="Code Review: Auth refactor" secondary="15:00 – 15:30" icon={"\uf017"} />
          <ListItem text="1:1 with Manager" secondary="16:00 – 16:30 · Google Meet" icon={"\uf017"} />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  clock: (
    <Canvas>
      <Stack direction="column" gap="l" align="center" justify="center">
        <Text content="17:58" size="3xl" weight="bold" />
        <Stack direction="row" gap="s" align="center">
          <Icon glyph={"\uf073"} color="accent" size={36} />
          <Text content="Friday, March 13" size="lg" color="muted" />
        </Stack>
      </Stack>
    </Canvas>
  ),

  departures: (
    <Canvas>
      <Header icon={"\uf238"} title="Passeig de Gràcia" />
      <Content>
        <List>
          <ListItem text="Maçanet-Massanes" secondary="R1 · 14:32 · +3 min" icon={"\uf238"} />
          <ListItem text="Molins de Rei" secondary="R4 · 14:45" icon={"\uf238"} />
          <ListItem text="L'Hospitalet" secondary="R2S · 15:02" icon={"\uf238"} />
          <ListItem text="Aeroport" secondary="R2N · 15:18 · +5 min" icon={"\uf238"} />
          <ListItem text="Sant Celoni" secondary="R1 · 15:33" icon={"\uf238"} />
          <ListItem text="Terrassa" secondary="R4 · 15:50" icon={"\uf238"} />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  gauge: (
    <Canvas>
      <Stack direction="row" gap="m" align="center" justify="center" wrap={true}>
        <Gauge label="CPU" value={73} max={100} unit="%" />
        <Gauge label="RAM" value={4.2} max={8} unit="GB" />
        <Gauge label="Disk" value={120} max={500} unit="GB" />
        <Gauge label="Temp" value={62} max={100} unit="°C" />
      </Stack>
      <Timestamp />
    </Canvas>
  ),

  github: (() => {
    const repos = [
      { name: "torvalds/linux", stars: "191k", forks: "55.4k", issues: "348", watchers: "8.1k" },
      { name: "facebook/react", stars: "234k", forks: "47.8k", issues: "912", watchers: "6.5k" },
    ];
    const statIcons = [
      { icon: "\uf005", key: "stars" as const },
      { icon: "\uf126", key: "forks" as const },
      { icon: "\uf06a", key: "issues" as const },
      { icon: "\uf06e", key: "watchers" as const },
    ];
    return (
      <Canvas>
        <Header icon={"\uf09b"} title="GitHub Stats" />
        <Content gap={14}>
          {repos.map((r) => (
            <Card>
              <Text content={r.name} size="md" color="muted" />
              <Stack direction="row" gap="m" align="center" justify="around">
                {statIcons.map((s) => (
                  <Stack direction="row" gap="s" align="center">
                    <Icon glyph={s.icon} />
                    <Text content={r[s.key]} size="md" />
                  </Stack>
                ))}
              </Stack>
            </Card>
          ))}
        </Content>
        <Timestamp />
      </Canvas>
    );
  })(),

  hackernews: (
    <Canvas>
      <Header icon={"\uf1d4"} title="Hacker News" />
      <Content>
        <List>
          <ListItem text="Show HN: A minimal text editor in 500 lines of C" secondary="482 pts · 187 comments · 3h" />
          <ListItem text="Why SQLite is so great for the edge" secondary="341 pts · 142 comments · 5h" />
          <ListItem text="The death of the Unix philosophy" secondary="289 pts · 231 comments · 7h" />
          <ListItem text="Rust in the Linux kernel: progress report 2026" secondary="256 pts · 98 comments · 4h" />
          <ListItem text="How we reduced our AWS bill by 90%" secondary="198 pts · 67 comments · 2h" />
          <ListItem text="A visual guide to QUIC and HTTP/3" secondary="167 pts · 43 comments · 6h" />
          <ListItem text="The surprising math behind parking lots" secondary="145 pts · 56 comments · 8h" />
          <ListItem text="Building a CPU from scratch with Nand gates" secondary="134 pts · 89 comments · 1d" />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  list: (
    <Canvas>
      <Header icon={"\uf03a"} title="To Do" />
      <Content>
        <List>
          <ListItem text="Buy groceries" secondary="Milk, bread, eggs" icon={"\uf07a"} />
          <ListItem text="Review PR #284" secondary="Auth refactor" icon={"\uf126"} value="3" />
          <ListItem text="Deploy staging" secondary="v1.2.3 release candidate" icon={"\uf0e7"} />
          <ListItem text="Team standup" secondary="09:00 – Google Meet" icon={"\uf073"} />
          <ListItem text="Write docs" secondary="API reference update" icon={"\uf15c"} />
          <ListItem text="Fix CI pipeline" secondary="Flaky test in auth module" icon={"\uf085"} value="!" />
          <ListItem text="Book flights" secondary="Conference in Berlin" icon={"\uf072"} />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  message: (
    <Canvas>
      <Stack direction="column" gap="none" align="center" justify="center">
        <Text content="Hello, World!" size="3xl" weight="bold" align="center" />
      </Stack>
      <Timestamp />
    </Canvas>
  ),

  monitor: (() => {
    const services = [
      { name: "Home Assistant", host: "ha.example.com", up: true, ms: "142ms", color: "green" as const },
      { name: "Immich", host: "photos.example.com", up: true, ms: "89ms", color: "green" as const },
      { name: "Jellyfin", host: "media.example.com", up: true, ms: "231ms", color: "green" as const },
      { name: "Gitea", host: "git.example.com", up: false, ms: "DOWN", color: "red" as const },
      { name: "Grafana", host: "grafana.example.com", up: true, ms: "567ms", color: "yellow" as const },
      { name: "Nextcloud", host: "cloud.example.com", up: true, ms: "1230ms", color: "red" as const },
    ];
    return (
      <Canvas>
        <Header icon={"\uf21b"} title="Monitor" subtitle="5/6 up" />
        <Content>
          <Stack>
            {services.flatMap((s, i) => {
              const row = (
                <Stack direction="row" gap="m" align="center">
                  <StatusDot up={s.up} />
                  <Stack>
                    <Text content={s.name} size="md" weight="bold" />
                    <Text content={s.host} size="sm" color="muted" />
                  </Stack>
                  <Text content={s.ms} size="md" weight="bold" color={s.color} />
                </Stack>
              );
              return i < services.length - 1 ? [row, <Separator />] : [row];
            })}
          </Stack>
        </Content>
        <Timestamp />
      </Canvas>
    );
  })(),

  notify: (
    <Canvas>
      <Header icon={"\uf058"} title="Build Complete" />
      <Content>
        <Text content={"All 42 tests passed\nDeployed to staging v1.2.3"} size="xl" color="muted" />
      </Content>
      <Timestamp />
    </Canvas>
  ),

  progress: (
    <Canvas>
      <Header icon={"\uf080"} title="CI Pipeline" />
      <Content>
        <Stack direction="column" gap="l">
          <ProgressBar label="Build" value={75} max={100} display="75/100" />
          <ProgressBar label="Tests" value={42} max={50} display="42/50" />
          <ProgressBar label="Deploy" value={30} max={100} display="30/100" />
        </Stack>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  stocks: (() => {
    const tickers = [
      { sym: "AAPL", change: "+1.34%", color: "green" as const, price: "$178.52", data: [170, 172, 175, 173, 176, 174, 178] },
      { sym: "MSFT", change: "-0.67%", color: "red" as const, price: "$415.80", data: [420, 418, 419, 415, 416, 414, 415] },
      { sym: "BTC-USD", change: "+2.85%", color: "green" as const, price: "$67,432", data: [65000, 66200, 65800, 67000, 66500, 67400, 67432] },
    ];
    return (
      <Canvas>
        <Header icon={"\uf201"} title="Market" />
        <Content gap={14}>
          {tickers.map((t) => (
            <Card>
              <Stack direction="row" gap="s" align="center">
                <Text content={t.sym} size="md" weight="bold" color="muted" />
                <Badge label={t.change} color={t.color} />
                <Spacer />
                <Text content={t.price} size="lg" weight="bold" />
              </Stack>
              <Sparkline values={t.data} color={t.color} />
            </Card>
          ))}
        </Content>
        <Timestamp />
      </Canvas>
    );
  })(),

  table: (
    <Canvas>
      <Header icon={"\uf0ce"} title="Team Roster" />
      <Content>
        <Table
          columns={[<Col label="Name" />, <Col label="Role" />, <Col label="Status" />]}
          rows={[
            ["Alice", "Backend", "Active"],
            ["Bob", "Frontend", "Active"],
            ["Carol", "DevOps", "On Leave"],
            ["Dave", "QA", "Active"],
            ["Eve", "Design", "Active"],
            ["Frank", "Backend", "Inactive"],
          ]}
        />
      </Content>
      <Timestamp />
    </Canvas>
  ),

  tasks: (
    <Canvas>
      <Header icon={"\uf0ae"} title="My Tasks" />
      <Content>
        <List>
          <ListItem text="Review PR #284" secondary="Auth refactor — check token rotation · 1d overdue" icon={"\uf111"} />
          <ListItem text="Update API docs" secondary="New endpoints for batch processing · Today" icon={"\uf111"} />
          <ListItem text="Fix flaky CI test" secondary="3d overdue" icon={"\uf111"} />
          <ListItem text="Deploy staging v1.2.3" secondary="Tomorrow" icon={"\uf111"} />
          <ListItem text="Write migration script" secondary="PostgreSQL 15 → 16" icon={"\uf111"} />
          <ListItem text="Set up monitoring alerts" secondary="Mar 15" icon={"\uf058"} />
          <ListItem text="Order new keyboard" secondary="Done" icon={"\uf058"} />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),
};

// ─── Render ─────────────────────────────────────────────────────────────

console.log("Generating screenshots from mock data...\n");

for (const [name, jsx] of Object.entries(MOCKS).sort(([a], [b]) => a.localeCompare(b))) {
  const element = render(jsx);
  const webp = await rasterize(element, { rotate: 0 });
  const png = await sharp(webp).png().toBuffer();
  writeFileSync(`${OUT}/${name}.png`, png);
  console.log(`  ${name}.png (${(png.length / 1024) | 0} KB)`);
}

console.log("\nDone.");
