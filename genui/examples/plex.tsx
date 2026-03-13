#!/usr/bin/env bun
/**
 * Plex — recently added media and active sessions.
 *
 * Usage: plex.tsx [--url http://localhost:32400] [--token PLEX_TOKEN]
 *
 * Reads PLEX_URL and PLEX_TOKEN from env if not provided.
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import {
  Canvas, Header, Content, Stack, Text, List, ListItem, Badge, Separator, Timestamp,
} from "../src/components";

const argv = process.argv.slice(2);
let url = process.env.PLEX_URL ?? "http://localhost:32400";
let token = process.env.PLEX_TOKEN ?? "";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--url" && argv[i + 1]) url = argv[++i];
  else if (argv[i] === "--token" && argv[i + 1]) token = argv[++i];
}
if (!token) throw new Error("Set PLEX_TOKEN env or pass --token");

type Media = { title: string; type: string; year?: string; added: string };
type Session = { title: string; user: string; state: string; progress: string };

const headers = { "X-Plex-Token": token, Accept: "application/json" };

// Recently added
const recentRes = await fetch(`${url}/library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=6`, {
  headers,
  signal: AbortSignal.timeout(10000),
});
if (!recentRes.ok) throw new Error(`Plex ${recentRes.status}`);
const recentData = await recentRes.json();

const now = Date.now() / 1000;
const recent: Media[] = (recentData.MediaContainer?.Metadata ?? []).map((m: any) => {
  const ageSec = now - (m.addedAt ?? now);
  let added: string;
  if (ageSec < 3600) added = `${Math.floor(ageSec / 60)}m ago`;
  else if (ageSec < 86400) added = `${Math.floor(ageSec / 3600)}h ago`;
  else added = `${Math.floor(ageSec / 86400)}d ago`;

  const title = m.grandparentTitle
    ? `${m.grandparentTitle} — ${m.title}`
    : m.title ?? "";
  return { title, type: m.type ?? "", year: m.year ? String(m.year) : undefined, added };
});

// Active sessions
let sessions: Session[] = [];
try {
  const sessRes = await fetch(`${url}/status/sessions`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (sessRes.ok) {
    const sessData = await sessRes.json();
    sessions = (sessData.MediaContainer?.Metadata ?? []).map((s: any) => {
      const progress = s.duration ? `${Math.round(((s.viewOffset ?? 0) / s.duration) * 100)}%` : "";
      const title = s.grandparentTitle
        ? `${s.grandparentTitle} — ${s.title}`
        : s.title ?? "";
      return {
        title,
        user: s.User?.title ?? "unknown",
        state: s.Player?.state ?? "playing",
        progress,
      };
    });
  }
} catch { /* sessions endpoint optional */ }

const ICONS: Record<string, string> = {
  movie: "\uf008",
  episode: "\uf008",
  track: "\uf001",
  show: "\uf008",
};

emit(
  <Canvas>
    <Header icon={"\uf04b"} title="Plex" subtitle={sessions.length > 0 ? [<Badge label={`${sessions.length} streaming`} color="green" />] : undefined} />
    <Content gap="md">
      {sessions.length > 0 && (
        <Stack direction="column" gap="sm">
          <Text content="Now Playing" size="md" weight="bold" color="accent" />
          <List>
            {sessions.map((s) => (
              <ListItem
                text={s.title}
                secondary={`${s.user} · ${s.state}`}
                icon={"\uf04b"}
                value={s.progress}
              />
            ))}
          </List>
        </Stack>
      )}
      {sessions.length > 0 && <Separator />}
      <Stack direction="column" gap="sm">
        <Text content="Recently Added" size="md" weight="bold" color="accent" />
        <List>
          {recent.map((m) => (
            <ListItem
              text={m.title}
              secondary={m.year ? `${m.type} · ${m.year}` : m.type}
              icon={ICONS[m.type] ?? "\uf15b"}
              value={m.added}
            />
          ))}
        </List>
      </Stack>
    </Content>
    <Timestamp />
  </Canvas>,
);
