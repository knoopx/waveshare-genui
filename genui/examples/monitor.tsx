#!/usr/bin/env bun
/**
 * Site uptime monitor — live HTTP checks.
 *
 * Usage: monitor.tsx -s "Name=https://url" [-s "Name2=https://url2" ...] [--timeout 5]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, Stack, Text, StatusDot, Separator, Spacer, Timestamp } from "../src/components";
const argv = process.argv.slice(2);
const siteSpecs: string[] = [];
let timeout = 5;

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "-s" && argv[i + 1]) siteSpecs.push(argv[++i]);
  else if (argv[i] === "--timeout" && argv[i + 1]) timeout = parseInt(argv[++i]);
}
if (siteSpecs.length === 0) throw new Error('Usage: monitor.tsx -s "Name=https://url" [-s ...]');

const sites = siteSpecs.map((spec) => {
  const eq = spec.indexOf("=");
  if (eq === -1) return { name: spec, url: spec.startsWith("http") ? spec : `https://${spec}` };
  return { name: spec.slice(0, eq), url: spec.slice(eq + 1) };
});

type Result = { name: string; url: string; up: boolean; ms: number };

async function check(site: { name: string; url: string }): Promise<Result> {
  const t0 = performance.now();
  try {
    const res = await fetch(site.url, {
      signal: AbortSignal.timeout(timeout * 1000),
      redirect: "follow",
    });
    const ms = Math.round(performance.now() - t0);
    return { ...site, up: res.ok, ms };
  } catch {
    return { ...site, up: false, ms: 0 };
  }
}

const results = await Promise.all(sites.map(check));
const upCount = results.filter((r) => r.up).length;

function msColor(r: Result): "green" | "yellow" | "red" {
  if (!r.up) return "red";
  if (r.ms > 500) return "yellow";
  return "green";
}

const rows: React.ReactElement[] = [];
results.forEach((r, i) => {
  rows.push(
    <Stack direction="row" gap="md" align="center">
      <StatusDot up={r.up} />
      <Stack gap="none">
        <Text content={r.name} size="md" weight="bold" />
        <Text content={new URL(r.url).hostname} size="sm" color="muted" />
      </Stack>
      <Spacer />
      <Text content={r.up ? `${r.ms}ms` : "DOWN"} size="md" weight="bold" color={msColor(r)} />
    </Stack>,
  );
  if (i < results.length - 1) rows.push(<Separator />);
});

emit(
  <Canvas>
    <Header icon={"\uf21b"} title="Monitor" subtitle={`${upCount}/${results.length} up`} />
    <Content>{rows}</Content>
    <Timestamp />
  </Canvas>,
);
