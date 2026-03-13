#!/usr/bin/env bun
/**
 * LLM server status — llama.cpp model slots and health.
 *
 * Usage: llama-cpp.tsx [--url http://localhost:11434]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import {
  Canvas, Header, Content, Stack, Text, Card, Badge, List, ListItem, Separator, Spacer, Timestamp,
} from "../src/components";

const argv = process.argv.slice(2);
let url = "http://localhost:11434";
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--url" && argv[i + 1]) url = argv[++i];
}

type SlotInfo = { model: string; state: string; ctxUsed: number; ctxMax: number };
type ServerInfo = { status: string; slots: SlotInfo[] };

async function fetchHealth(): Promise<ServerInfo> {
  const res = await fetch(`${url}/health`, {
    headers: { "User-Agent": "waveshare-genui" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`llama.cpp health ${res.status}`);
  const data = await res.json();
  const slots: SlotInfo[] = (data.slots ?? []).map((s: any) => ({
    model: (s.model ?? "unknown").split("/").pop()?.replace(/-GGUF$/, "") ?? "unknown",
    state: s.state === 0 ? "idle" : "processing",
    ctxUsed: s.n_ctx_used ?? s.n_past ?? 0,
    ctxMax: s.n_ctx ?? 0,
  }));
  return { status: data.status ?? "unknown", slots };
}

async function fetchModels(): Promise<string[]> {
  try {
    const res = await fetch(`${url}/v1/models`, {
      headers: { "User-Agent": "waveshare-genui" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []).map((m: any) => m.id ?? "");
  } catch {
    return [];
  }
}

const [info, models] = await Promise.all([fetchHealth(), fetchModels()]);
const statusColor = info.status === "ok" ? "green" : info.status === "no slot available" ? "orange" : "red";

emit(
  <Canvas>
    <Header icon={"\uf108"} title="llama.cpp" subtitle={[<Badge label={info.status} color={statusColor} />]} />
    <Content gap="md">
      {info.slots.length > 0 ? (
        <Stack direction="column" gap="md">
          {info.slots.map((slot) => {
            const ctxPct = slot.ctxMax > 0 ? Math.round((slot.ctxUsed / slot.ctxMax) * 100) : 0;
            return (
              <Card>
                <Stack direction="row" gap="sm" align="center">
                  <Text content={slot.model} size="md" weight="bold" />
                  <Spacer />
                  <Badge label={slot.state} color={slot.state === "idle" ? "muted" : "accent"} />
                </Stack>
                <Stack direction="row" gap="sm" align="center">
                  <Text content={`ctx: ${slot.ctxUsed.toLocaleString()} / ${slot.ctxMax.toLocaleString()}`} size="sm" color="muted" />
                  <Spacer />
                  <Text content={`${ctxPct}%`} size="sm" color="muted" />
                </Stack>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <Stack direction="column" gap="md">
          <Text content="No active slots" size="lg" color="muted" align="center" />
        </Stack>
      )}
      {models.length > 0 && (
        <Stack direction="column" gap="sm">
          <Separator />
          <Text content="Available Models" size="md" weight="bold" color="accent" />
          <List>
            {models.slice(0, 6).map((m) => {
              const short = m.split("/").pop()?.replace(/-GGUF$/, "") ?? m;
              return <ListItem text={short} icon={"\uf15b"} />;
            })}
          </List>
        </Stack>
      )}
    </Content>
    <Timestamp />
  </Canvas>,
);
