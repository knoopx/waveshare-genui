#!/usr/bin/env bun
/**
 * Clock — current time and date.
 *
 * Usage: clock.tsx [--12h]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Stack, Text, Icon } from "../src/components";
const use12h = process.argv.includes("--12h");
const now = new Date();

const time = use12h
  ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  : `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

const date = now.toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

emit(
  <Canvas>
    <Stack direction="column" gap="lg" align="center" justify="center">
      <Text content={time} size="3xl" weight="bold" />
      <Stack direction="row" gap="sm" align="center">
        <Icon glyph={"\uf073"} color="accent" size={36} />
        <Text content={date} size="lg" color="muted" />
      </Stack>
    </Stack>
  </Canvas>,
);
