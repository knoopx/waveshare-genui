#!/usr/bin/env bun
/**
 * Generate deterministic screenshots from mock JSX data.
 *
 * These are NOT the live examples — they use hardcoded sample data
 * so screenshots are reproducible without network access.
 */

import React from "react";
import { resolve } from "path";
import { mkdirSync, writeFileSync, statSync } from "fs";
import { execFileSync } from "child_process";
import { toOpenUILang } from "../src/openui-emitter";
import * as _C from "../src/components";
import { RADIUS, ICON_SIZE } from "../src/tokens";

// DefinedComponent objects work as JSX element types at runtime — the emitter
// traverses the tree structurally without calling them. Cast the import so
// TypeScript accepts them in JSX position.
const C = _C as unknown as Record<string, React.FC<any>>;
const {
  Canvas, Header, Content, Stack, Text, Icon, Badge, Card,
  Separator, Spacer, Table, Col, List, ListItem, Gauge,
  ProgressBar, Sparkline, StatusDot, Timestamp, QRCode, Image,
  KeyValue, Stat,
} = C;

const PROJECT_ROOT = process.cwd();
const OUT = resolve(PROJECT_ROOT, "screenshots");
const OUI_OUT = resolve(PROJECT_ROOT, ".tmp/screenshots-oui");
mkdirSync(OUT, { recursive: true });
mkdirSync(OUI_OUT, { recursive: true });

/** Resolve flake output binary once, then reuse it for all screenshots. */
function resolveGenuiBin(): string {
  const buildArgs = ["build", ".#waveshare-genui", "--no-link", "--print-out-paths"];
  const buildArgsFallback = ["build", "path:.#waveshare-genui", "--no-link", "--print-out-paths"];

  try {
    const out = execFileSync("nix", buildArgs, { cwd: PROJECT_ROOT, encoding: "utf8", stdio: "pipe" }).trim();
    if (!out) throw new Error("empty nix build output");
    return resolve(out, "bin/waveshare-genui");
  } catch {
    const out = execFileSync("nix", buildArgsFallback, { cwd: PROJECT_ROOT, encoding: "utf8", stdio: "pipe" }).trim();
    if (!out) throw new Error("empty nix build output (fallback)");
    return resolve(out, "bin/waveshare-genui");
  }
}

const GENUI_BIN = resolveGenuiBin();

/** Render via flake output so fonts/assets match packaged CLI behavior. */
function renderWithFlake(name: string, jsx: React.ReactElement): number {
  const ouiPath = resolve(OUI_OUT, `${name}.oui`);
  const pngPath = resolve(OUT, `${name}.png`);
  writeFileSync(ouiPath, `${toOpenUILang(jsx)}\n`);

  execFileSync(GENUI_BIN, [ouiPath, "-o", pngPath, "--rotate", "0"], {
    cwd: PROJECT_ROOT,
    stdio: "pipe",
  });

  return Math.floor(statSync(pngPath).size / 1024);
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
      <Stack direction="column" gap="lg" align="center" justify="center">
        <Text content="17:58" size="3xl" weight="bold" />
        <Stack direction="row" gap="sm" align="center">
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
      <Stack direction="row" gap="xl" align="center" justify="center" wrap={true}>
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
        <Content gap="sm">
          {repos.map((r) => (
            <Card>
              <Text content={r.name} size="md" color="muted" />
              <Stack direction="row" gap="md" align="center" justify="around">
                {statIcons.map((s) => (
                  <Stack direction="row" gap="md" align="center">
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
                <Stack direction="row" gap="md" align="center">
                  <StatusDot up={s.up} />
                  <Stack gap="none">
                    <Text content={s.name} size="md" weight="bold" />
                    <Text content={s.host} size="sm" color="muted" />
                  </Stack>
                  <Spacer />
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
      <Header icon={"\uf0a0"} title="Disk Usage" />
      <Content>
        <Stack direction="column" gap="lg">
          <ProgressBar label="/" value={82} max={100} display="412G / 500G" />
          <ProgressBar label="/home" value={61} max={100} display="610G / 1.0T" />
          <ProgressBar label="/mnt/storage" value={74} max={100} display="2.2T / 3.0T" />
          <ProgressBar label="/boot" value={38} max={100} display="380M / 1.0G" />
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
        <Content gap="sm">
          {tickers.map((t) => (
            <Card>
              <Stack direction="row" gap="sm" align="center">
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

  "progress-bar": (
    <Canvas>
      <Header icon={"\uf080"} title="CI Pipeline" />
      <Content>
        <Stack direction="column" gap="lg">
          <ProgressBar label="Build" value={75} max={100} display="75/100" color="accent" />
          <ProgressBar label="Tests" value={42} max={50} display="42/50" color="green" />
          <ProgressBar label="Deploy" value={30} max={100} display="30/100" color="orange" />
        </Stack>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  "progress-ring": (
    <Canvas>
      <Header icon={"\uf080"} title="CI Pipeline" />
      <Content>
        <Stack direction="row" gap="xl" align="center" justify="center" wrap={true}>
          <Gauge label="Build" value={75} max={100} unit="%" color="accent" />
          <Gauge label="Tests" value={42} max={50} unit="%" color="green" />
          <Gauge label="Deploy" value={30} max={100} unit="%" color="orange" />
        </Stack>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  monthcal: (() => {
    const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const weeks = [
      ["", "", "", "", "", "", "1"],
      ["2", "3", "4", "5", "6", "7", "8"],
      ["9", "10", "11", "12", "13", "14", "15"],
      ["16", "17", "18", "19", "20", "21", "22"],
      ["23", "24", "25", "26", "27", "28", "29"],
      ["30", "31", "", "", "", "", ""],
    ];
    return (
      <Canvas>
        <Header icon={"\uf073"} title="March 2026" />
        <Content>
          <Table
            columns={days.map((d) => <Col label={d} align="center" />)}
            rows={weeks}
          />
        </Content>
        <Timestamp />
      </Canvas>
    );
  })(),

  sysmon: (() => {
    const stats = [
      { icon: "\uf2db", text: "CPU Freq: 1283 MHz" },
      { icon: "\uf2c9", text: "Composite: 40°C" },
      { icon: "\uf2c9", text: "Tctl: 56°C" },
      { icon: "\uf0ac", text: "Net ↑ 13862 MB  ↓ 22106 MB" },
      { icon: "\uf085", text: "Load: 0.2 / 0.4 / 0.5" },
    ];
    return (
      <Canvas>
        <Header icon={"\uf108"} title="System Monitor" subtitle="desktop · up 1d 21h" />
        <Content>
          <Stack direction="row" gap="xl" align="center" justify="center">
            <Gauge label="CPU" value={0} max={100} unit="%" size={160} />
            <Gauge label="Memory" value={11} max={100} unit="%" size={160} />
            <Gauge label="Disk" value={92} max={100} unit="%" size={160} color="orange" />
          </Stack>
          <Separator />
          <List>
            {stats.map((s) => (
              <ListItem text={s.text} icon={s.icon} />
            ))}
          </List>
        </Content>
        <Timestamp />
      </Canvas>
    );
  })(),

  weather: (
    <Canvas>
      <Header icon={"\uf124"} title="Barcelona" />
      <Content gap="lg">
        <Stack direction="column" gap="sm" align="center" justify="center">
          <Stack direction="row" gap="lg" align="center" justify="center">
            <Icon glyph={"\ue302"} size={80} color="accent" />
            <Text content="18°C" size="3xl" weight="bold" align="center" />
          </Stack>
          <Text content="Partly Cloudy" size="xl" weight="bold" align="center" />
          <Text content="Feels like 16°C" size="md" color="muted" align="center" />
        </Stack>

        <Stack direction="column" gap="sm" align="center" justify="center">
          <Stack direction="row" gap="lg" align="center" justify="center">
            <Icon glyph={"\ue275"} color="accent" />
            <Text content="Humidity: 65%" size="md" align="center" />
          </Stack>
          <Separator />
          <Stack direction="row" gap="lg" align="center" justify="center">
            <Icon glyph={"\ue34b"} color="accent" />
            <Text content="Wind: 12 km/h NW" size="md" align="center" />
          </Stack>
          <Separator />
          <Stack direction="row" gap="lg" align="center" justify="center">
            <Icon glyph={"\ue220"} color="accent" />
            <Text content="Precip: 0.0 mm" size="md" align="center" />
          </Stack>
        </Stack>

        <Stack direction="row" gap="lg" justify="center" align="center">
          <Stack direction="column" gap="xs" align="center">
            <Text content="Today" size="sm" color="muted" />
            <Icon glyph={"\ue302"} color="accent" />
            <Text content="20° / 12°" size="sm" color="accent" />
          </Stack>
          <Stack direction="column" gap="xs" align="center">
            <Text content="Fri" size="sm" color="muted" />
            <Icon glyph={"\ue302"} color="accent" />
            <Text content="22° / 14°" size="sm" color="accent" />
          </Stack>
          <Stack direction="column" gap="xs" align="center">
            <Text content="Sat" size="sm" color="muted" />
            <Icon glyph={"\ue302"} color="accent" />
            <Text content="17° / 11°" size="sm" color="accent" />
          </Stack>
        </Stack>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  nowplaying: (() => {
    const artPath = resolve(import.meta.dir, "../fixtures/album-art.png");
    return (
      <Canvas>
        <Content>
          <Stack direction="column" gap="lg" align="center" justify="center">
            <Image src={artPath} width={340} height={340} borderRadius={RADIUS.md} />
            <Stack direction="column" gap="xs" align="center">
              <Text content="Bohemian Rhapsody" size="2xl" weight="bold" align="center" />
              <Text content="Queen" size="xl" color="muted" align="center" />
              <Text content="A Night at the Opera" size="md" color="muted" align="center" />
            </Stack>
            <ProgressBar label="" value={187} max={354} display="3:07 / 5:54" />
          </Stack>
        </Content>
        <Timestamp />
      </Canvas>
    );
  })(),

  timer: (
    <Canvas>
      <Stack direction="column" gap="none" align="center" justify="center">
        <Gauge label="Deploy" value={75} max={100} unit="%" size={600} />
      </Stack>
      <Timestamp />
    </Canvas>
  ),

  mail: (
    <Canvas>
      <Header icon={"\uf0e0"} title="Inbox" subtitle="5 messages" />
      <Content>
        <List>
          <ListItem text="GitHub" secondary="[react] Fix hydration mismatch in Suspense (#28431)" value="14:30" />
          <ListItem text="Linear" secondary="6 unread notifications on SLNG" value="12:20" />
          <ListItem text="AWS Notifications" secondary="AWS Notification Message" value="09:07" />
          <ListItem text="Notion Team" secondary="Ismael made updates in Project Board" value="08:27" />
          <ListItem text="Datadog" secondary="Your Daily Digest from Datadog" value="15:39" />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  qrcode: (
    <Canvas>
      <Header icon={"\uf029"} title="Project Repository" />
      <Content>
        <Stack direction="column" gap="lg" align="center" justify="center">
          <QRCode data="https://github.com/knoopx/waveshare-display" size={420} />
          <Text content="https://github.com/knoopx/waveshare-display" size="sm" color="muted" align="center" />
        </Stack>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  image: (() => {
    const imgPath = resolve(import.meta.dir, "../fixtures/sample.png");
    return (
      <Canvas>
        <Header icon={"\uf03e"} title="Image Display" />
        <Content>
          <Stack direction="column" gap="lg" align="center" justify="center">
            <Image src={imgPath} width={560} height={420} borderRadius={RADIUS.md} />
          </Stack>
        </Content>
        <Timestamp />
      </Canvas>
    );
  })(),

  reddit: (
    <Canvas>
      <Header icon={"\uf03a"} title="r/NixOS" subtitle="hot" />
      <Content>
        <List>
          <ListItem text="NixOS 26.05 announced" secondary="↑482 · 214 comments · 4h" />
          <ListItem text="Niri + Home Manager setup guide" secondary="↑231 · 67 comments · 6h" />
          <ListItem text="Show r/NixOS: self-hosted dashboard on a 720x720 display" secondary="↑189 · 42 comments · 8h" />
          <ListItem text="Flakes vs channels in 2026" secondary="↑142 · 98 comments · 11h" />
          <ListItem text="Reducing Nix store bloat on laptops" secondary="↑97 · 31 comments · 1d" />
          <ListItem text="How to package Bun tools in nixpkgs" secondary="↑83 · 19 comments · 1d" />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  lobsters: (
    <Canvas>
      <Header icon={"\uf03a"} title="Lobsters" />
      <Content>
        <List>
          <ListItem text="This Is Not The Computer For You" secondary="↑212 · 56 comments · hardware, mac · 1d" />
          <ListItem text="Computing in freedom with GNU Emacs" secondary="↑21 · 4 comments · editors, emacs, lisp · 9h" />
          <ListItem text="Reinventing Python's AsyncIO" secondary="↑9 · 2 comments · python · 7h" />
          <ListItem text="XML is a cheap DSL" secondary="↑10 · 2 comments · programming · 3h" />
          <ListItem text="How to use storytelling to fit inline assembly into Rust" secondary="↑21 · 1 comments · assembly, rust · 9h" />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  trending: (
    <Canvas>
      <Header icon={"\uf09b"} title="Trending" subtitle="daily" />
      <Content>
        <List>
          <ListItem text="astral-sh/uv" secondary="Python package manager · ★58,240 · +1,203 today" />
          <ListItem text="YaLTeR/niri" secondary="Wayland compositor · ★7,812 · +244 today" />
          <ListItem text="ollama/ollama" secondary="Run local LLMs · ★129,990 · +1,480 today" />
          <ListItem text="NixOS/nixpkgs" secondary="Nix packages · ★21,334 · +127 today" />
          <ListItem text="knoopx/waveshare-display" secondary="ESP32-P4 display UI · ★312 · +42 today" />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  rss: (
    <Canvas>
      <Header icon={"\uf09e"} title="Hugging Face Blog" />
      <Content>
        <List>
          <ListItem text="Smolagents 2.0 release" value="24m" />
          <ListItem text="Open-weight coding models roundup" value="2h" />
          <ListItem text="Efficient long-context inference" value="6h" />
          <ListItem text="GGUF quantization deep dive" value="1d" />
          <ListItem text="Distilled tool-calling models" value="2d" />
          <ListItem text="Serving MoE models on consumer GPUs" value="4d" />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  containers: (
    <Canvas>
      <Header icon={"\uf108"} title="Containers" subtitle="3/5 running" />
      <Content>
        <List>
          <ListItem text="llm" secondary="llama.cpp · :11434" icon={"\uf058"} value="up" />
          <ListItem text="photos" secondary="immich · :5050" icon={"\uf058"} value="up" />
          <ListItem text="photos-postgres" secondary="postgres" icon={"\uf058"} value="up" />
          <ListItem text="photos-redis" secondary="valkey" icon={"\uf06a"} value="down" />
          <ListItem text="watchtower" secondary="container updates" icon={"\uf06a"} value="down" />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  "llama-cpp": (
    <Canvas>
      <Header icon={"\uf108"} title="llama.cpp" subtitle={[<Badge label="ok" color="green" />]} />
      <Content gap="md">
        <Stack direction="column" gap="md">
          <Card>
            <Stack direction="row" gap="sm" align="center">
              <Text content="Qwen3-Coder-Next" size="md" weight="bold" />
              <Spacer />
              <Badge label="processing" color="accent" />
            </Stack>
            <Stack direction="row" gap="sm" align="center">
              <Text content="ctx: 19,842 / 131,072" size="sm" color="muted" />
              <Spacer />
              <Text content="15%" size="sm" color="muted" />
            </Stack>
          </Card>
          <Card>
            <Stack direction="row" gap="sm" align="center">
              <Text content="GLM-4.7-Flash" size="md" weight="bold" />
              <Spacer />
              <Badge label="idle" color="muted" />
            </Stack>
            <Stack direction="row" gap="sm" align="center">
              <Text content="ctx: 0 / 64,000" size="sm" color="muted" />
              <Spacer />
              <Text content="0%" size="sm" color="muted" />
            </Stack>
          </Card>
        </Stack>
        <Separator />
        <Stack direction="column" gap="sm">
          <Text content="Available Models" size="md" weight="bold" color="accent" />
          <List>
            <ListItem text="Qwen3-Coder-Next" icon={"\uf15b"} />
            <ListItem text="GLM-4.7-Flash" icon={"\uf15b"} />
            <ListItem text="Qwen3.5-35B-A3B" icon={"\uf15b"} />
            <ListItem text="Qwen3.5-27B" icon={"\uf15b"} />
          </List>
        </Stack>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  homeassistant: (
    <Canvas>
      <Header icon={"\uf015"} title="Home Assistant" />
      <Content>
        <Stack direction="row" gap="xl" align="center" justify="center">
          <Gauge label="Living Room" value={22.6} max={50} unit="°C" size={160} />
          <Gauge label="Bedroom" value={21.9} max={50} unit="°C" size={160} />
          <Gauge label="Office" value={23.4} max={50} unit="°C" size={160} />
        </Stack>
        <Separator />
        <List>
          <ListItem text="Kitchen Lights" icon={"\uf0eb"} value="on" />
          <ListItem text="Desk Lamp" icon={"\uf0eb"} value="off" />
          <ListItem text="Hall Switch" icon={"\uf205"} value="on" />
          <ListItem text="Front Door" icon={"\uf023"} value="locked" />
          <ListItem text="Air Purifier" icon={"\uf085"} value="on" />
        </List>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  plex: (
    <Canvas>
      <Header icon={"\uf04b"} title="Plex" subtitle={[<Badge label="2 streaming" color="green" />]} />
      <Content gap="md">
        <Stack direction="column" gap="sm">
          <Text content="Now Playing" size="md" weight="bold" color="accent" />
          <List>
            <ListItem text="The Expanse — S02E05" secondary="knoopx · playing" icon={"\uf04b"} value="62%" />
            <ListItem text="Interstellar" secondary="guest-tv · paused" icon={"\uf04b"} value="18%" />
          </List>
        </Stack>
        <Separator />
        <Stack direction="column" gap="sm">
          <Text content="Recently Added" size="md" weight="bold" color="accent" />
          <List>
            <ListItem text="Severance — S02E09" secondary="episode · 2026" icon={"\uf008"} value="4h ago" />
            <ListItem text="Dune: Part Two" secondary="movie · 2024" icon={"\uf008"} value="1d ago" />
            <ListItem text="Lo-fi Coding Mix" secondary="track · 2026" icon={"\uf001"} value="2d ago" />
          </List>
        </Stack>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  dashboard: (() => {
    return (
      <Canvas>
        <Header
          icon={<Icon glyph={"\uf017"} color="accent" size={ICON_SIZE.md} />}
          title={[<Text content="17:58" size="lg" weight="bold" />, <Text content="Fri, Mar 13" size="md" color="muted" />]}
          subtitle={[<Icon glyph={"\ue302"} color="accent" />, <Text content="18°C" size="md" weight="bold" />, <Text content="Partly Cloudy" size="sm" color="muted" />]}
        />
        <Content gap="sm">
          <Stack direction="row" gap="md" align="center">
            <Icon glyph={"\uf001"} color="muted" />
            <Text content="Queen — Bohemian Rhapsody" size="md" color="muted" />
          </Stack>
          <Stack direction="row" gap="md" align="center">
            <Icon glyph={"\uf201"} color="muted" />
            <Stack direction="row" gap="sm">
              <Badge label="AAPL +1.2%" color="green" />
              <Badge label="BTC +2.5%" color="green" />
              <Badge label="MSFT -0.7%" color="red" />
            </Stack>
          </Stack>
          <Separator />
          <List>
            <ListItem text="Team Standup" secondary="09:00 – 09:15 · Google Meet" icon={"\uf073"} />
            <ListItem text="Sprint Planning" secondary="10:00 – 11:00" icon={"\uf073"} />
            <ListItem text="Lunch with Alex" secondary="13:00 – 14:00 · Bar Central" icon={"\uf073"} />
            <ListItem text="Code Review" secondary="15:00 – 15:30" icon={"\uf073"} />
          </List>
        </Content>
        <Timestamp />
      </Canvas>
    );
  })(),

  user: (
    <Canvas>
      <Header icon={"\uf007"} title="Victor Martinez" subtitle="knoopx" />
      <Content gap="md">
        <Stack direction="row" gap="md" align="stretch">
          <Stat label="Uptime" value="2d 4h" color="green" />
          <Stat label="Shell" value="fish" color="accent" />
          <Stat label="Terminal" value="kitty" color="cyan" />
        </Stack>
        <Card>
          <Stack direction="column" gap="xs">
            <KeyValue label="Home" value="/home/knoopx" />
            <KeyValue label="Desktop" value="niri" secondary="wayland" />
            <KeyValue label="Host" value="desktop" secondary="2026-03-11 20:37" />
          </Stack>
        </Card>
      </Content>
      <Timestamp />
    </Canvas>
  ),

  system: (
    <Canvas>
      <Header icon={"\uf108"} title="desktop" subtitle="GNU/Linux · x64" />
      <Content gap="md">
        <Stack direction="row" gap="md" align="stretch">
          <Stat label="Memory" value="96" unit="%" helper="59.9 GB / 62.4 GB" color="green" />
          <Stat label="Disk" value="93%" helper="2.6T / 2.8T" color="orange" />
          <Stat label="Load" value="0.24" color="cyan" />
        </Stack>
        <Card>
          <Stack direction="column" gap="xs">
            <KeyValue label="Kernel" value="6.13.7" secondary="GNU/Linux · x64" />
            <KeyValue label="CPU" value="24" secondary="logical cores" />
            <KeyValue label="Network" value="192.168.1.42" secondary="enp5s0" />
            <KeyValue label="Uptime" value="2d 4h" />
          </Stack>
        </Card>
      </Content>
      <Timestamp />
    </Canvas>
  ),
};

// ─── Render ─────────────────────────────────────────────────────────────

console.log("Generating screenshots from mock data...\n");

for (const [name, jsx] of Object.entries(MOCKS).sort(([a], [b]) => a.localeCompare(b))) {
  const kb = renderWithFlake(name, jsx);
  console.log(`  ${name}.png (${kb} KB)`);
}

console.log("\nDone.");
