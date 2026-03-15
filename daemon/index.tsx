#!/usr/bin/env bun
/**
 * Smart display daemon — fully reactive, event-driven.
 *
 * Usage:
 *   daemon/index.tsx [--port /dev/ttyACM0] [--rotate 180]
 *                    [--lat 41.39] [--lon 2.17] [--city Barcelona]
 */

import { scheduleLoop } from "./scheduler";

const argv = process.argv.slice(2);
const config: Record<string, string> = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--") && argv[i + 1]) config[argv[i].slice(2)] = argv[++i];
}

await scheduleLoop({
  port: config.port ?? "/dev/ttyACM0",
  rotate: parseInt(config.rotate ?? "180"),
  lat: parseFloat(config.lat ?? "41.39"),
  lon: parseFloat(config.lon ?? "2.17"),
  city: config.city ?? "Barcelona",
});
