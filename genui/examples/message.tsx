#!/usr/bin/env bun
/**
 * Full-screen text message.
 *
 * Usage: message.tsx <text>
 *        echo "text" | message.tsx --stdin
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { readFileSync } from "fs";
import { Canvas, Stack, Text, Timestamp } from "../src/components";
let text: string;
if (process.argv.includes("--stdin")) {
  text = readFileSync("/dev/stdin", "utf8").trim();
} else {
  text = process.argv.slice(2).filter((a) => !a.startsWith("-")).join(" ");
}
if (!text) throw new Error("Usage: message.tsx <text> | message.tsx --stdin");

emit(
  <Canvas>
    <Stack direction="column" gap="none" align="center" justify="center">
      <Text content={text} size="3xl" weight="bold" align="center" />
    </Stack>
    <Timestamp />
  </Canvas>,
);
