#!/usr/bin/env bun
/**
 * Container status — running Podman/Docker containers.
 *
 * Usage: containers.tsx [--runtime podman|docker]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import {
  Canvas, Header, Content, List, ListItem, Stack, Text, StatusDot, Timestamp,
} from "../src/components";

const argv = process.argv.slice(2);
let runtime = "podman";
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--runtime" && argv[i + 1]) runtime = argv[++i];
}

type Container = { name: string; image: string; status: string; up: boolean; ports: string };

function sh(cmd: string): string {
  return execSync(cmd, { timeout: 5000 }).toString().trim();
}

const format = '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.State}}\t{{.Ports}}';
const raw = sh(`${runtime} ps -a --format '${format}'`);

const containers: Container[] = raw
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [name, image, status, state, ports] = line.split("\t");
    const shortImage = image.split("/").pop()?.split(":")[0] ?? image;
    const shortPorts = (ports ?? "")
      .split(",")
      .map((p) => p.match(/:(\d+)->/)?.[1])
      .filter(Boolean)
      .join(", ");
    return {
      name: name ?? "",
      image: shortImage,
      status: status ?? "",
      up: state === "running",
      ports: shortPorts ? `:${shortPorts}` : "",
    };
  })
  .sort((a, b) => (a.up === b.up ? 0 : a.up ? -1 : 1));

const running = containers.filter((c) => c.up).length;

emit(
  <Canvas>
    <Header icon={"\uf108"} title="Containers" subtitle={`${running}/${containers.length} running`} />
    <Content>
      <List>
        {containers.slice(0, 8).map((c) => (
          <ListItem
            text={c.name}
            secondary={`${c.image}${c.ports}`}
            icon={c.up ? "\uf058" : "\uf06a"}
            value={c.up ? "up" : "down"}
          />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
