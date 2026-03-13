#!/usr/bin/env bun
/**
 * Full-screen countdown/progress gauge.
 *
 * Usage: timer.tsx --label "Deploy" --value 75 --max 100 [--unit "%"]
 *        timer.tsx --label "Pomodoro" --minutes 25     (counts down from 25:00)
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Stack, Gauge, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let label = "Timer", value = 0, max = 100, unit = "%";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--label" && argv[i + 1]) label = argv[++i];
  else if (argv[i] === "--value" && argv[i + 1]) value = parseFloat(argv[++i]);
  else if (argv[i] === "--max" && argv[i + 1]) max = parseFloat(argv[++i]);
  else if (argv[i] === "--unit" && argv[i + 1]) unit = argv[++i];
  else if (argv[i] === "--minutes" && argv[i + 1]) {
    const totalMin = parseInt(argv[++i]);
    max = totalMin * 60;
    // Elapsed = 0 at start; caller updates value each tick
    unit = "s";
    label = label === "Timer" ? `${totalMin}:00` : label;
  }
}

emit(
  <Canvas>
    <Stack direction="column" gap="none" align="center" justify="center">
      <Gauge label={label} value={value} max={max} unit={unit} size={600} />
    </Stack>
    <Timestamp />
  </Canvas>,
);
