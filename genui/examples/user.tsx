#!/usr/bin/env bun
/**
 * Logged-in user info — current account, session, and environment details.
 *
 * Usage: user.tsx
 */
import React from "react";
import os from "os";
import { execSync } from "child_process";
import { emit } from "../src/openui-emitter";
import {
  Canvas,
  Header,
  Content,
  Stack,
  Stat,
  Card,
  KeyValue,
  Timestamp,
} from "../src/components";

function sh(cmd: string): string {
  try {
    return execSync(cmd, { timeout: 2000 }).toString().trim();
  } catch {
    return "";
  }
}

function fullName(username: string): string {
  const gecos = sh(`getent passwd ${JSON.stringify(username)} | cut -d: -f5 | cut -d, -f1`);
  return gecos || username;
}

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function loginAge(): string {
  const booted = sh("who -b | awk '{print $3, $4}'");
  return booted || "session active";
}

const info = os.userInfo();
const username = info.username;
const name = fullName(username);
const host = os.hostname();
const shell = process.env.SHELL ? basename(process.env.SHELL) : "unknown";
const sessionType = process.env.XDG_SESSION_TYPE || process.env.DESKTOP_SESSION || "local";
const desktop = process.env.XDG_CURRENT_DESKTOP || process.env.DESKTOP_SESSION || "unknown";
const home = info.homedir;
const terminal = process.env.TERM || "unknown";
const uptime = formatUptime(os.uptime());
const booted = loginAge();

const contentChildren = [
  <Stack direction="row" gap="md" align="stretch">
    <Stat label="Uptime" value={uptime} color="green" />
    <Stat label="Shell" value={shell} color="accent" />
    <Stat label="Terminal" value={terminal} color="cyan" />
  </Stack>,
  <Card>
    <Stack direction="column" gap="xs">
      <KeyValue label="Home" value={home} />
      <KeyValue label="Desktop" value={desktop} secondary={sessionType} />
      <KeyValue label="Host" value={host} secondary={booted} />
    </Stack>
  </Card>,
];

emit(
  <Canvas>
    <Header icon={"\uf007"} title={name} subtitle={username} />
    <Content gap="md">{contentChildren}</Content>
    <Timestamp />
  </Canvas>,
);
