#!/usr/bin/env bun
/**
 * Notification with icon, title, and body.
 *
 * Usage: notify.tsx <title> [body] [--icon \uf058]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, Text, Timestamp } from "../src/components";
const argv = process.argv.slice(2);
let icon = "\uf0e0";
const positionals: string[] = [];

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--icon" && argv[i + 1]) icon = argv[++i];
  else positionals.push(argv[i]);
}

const title = positionals[0];
const body = positionals.slice(1).join(" ");
if (!title) throw new Error("Usage: notify.tsx <title> [body] [--icon \\uf058]");

emit(
  <Canvas>
    <Header icon={icon} title={title} />
    <Content>
      <Text content={body} size="xl" color="muted" />
    </Content>
    <Timestamp />
  </Canvas>,
);
