#!/usr/bin/env bun
/**
 * GitHub repo stats — live from GitHub API.
 *
 * Usage: github.tsx owner/repo [owner/repo ...]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, Card, Stack, Text, Icon, Timestamp } from "../src/components";
const repos = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (repos.length === 0) throw new Error("Usage: github.tsx owner/repo [owner/repo ...]");

type Repo = { name: string; stars: string; forks: string; issues: string; watchers: string };

async function fetchRepo(fullName: string): Promise<Repo> {
  const res = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: { "User-Agent": "waveshare-genui", Accept: "application/vnd.github.v3+json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${fullName}`);
  const d = await res.json();
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  return {
    name: d.full_name,
    stars: fmt(d.stargazers_count),
    forks: fmt(d.forks_count),
    issues: fmt(d.open_issues_count),
    watchers: fmt(d.subscribers_count ?? d.watchers_count),
  };
}

const data = await Promise.all(repos.slice(0, 4).map(fetchRepo));

emit(
  <Canvas>
    <Header icon={"\uf09b"} title="GitHub Stats" />
    <Content gap={14}>
      {data.map((r) => {
        const stats = [
          { icon: "\uf005", value: r.stars },
          { icon: "\uf126", value: r.forks },
          { icon: "\uf06a", value: r.issues },
          { icon: "\uf06e", value: r.watchers },
        ];
        return (
          <Card>
            <Text content={r.name} size="md" color="muted" />
            <Stack direction="row" gap="m" align="center" justify="around">
              {stats.map((s) => (
                <Stack direction="row" gap="s" align="center">
                  <Icon glyph={s.icon} />
                  <Text content={s.value} size="md" />
                </Stack>
              ))}
            </Stack>
          </Card>
        );
      })}
    </Content>
    <Timestamp />
  </Canvas>,
);
