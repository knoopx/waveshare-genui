/**
 * System source — shows sysmon when CPU/memory spikes above 85%.
 */
import { readFileSync } from "fs";
import type { EventSource } from "../types";

export const systemSource: EventSource = ({ show }) => {
  let prevIdle = 0;
  let prevTotal = 0;
  let wasStressed = false;

  function poll() {
    const lines = readFileSync("/proc/stat", "utf8").split("\n");
    const parts = lines[0].split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + (parts[4] ?? 0);
    const total = parts.reduce((a, b) => a + b, 0);
    const dIdle = idle - prevIdle;
    const dTotal = total - prevTotal;
    const cpuPct = dTotal > 0 ? Math.round(100 * (1 - dIdle / dTotal)) : 0;
    prevIdle = idle;
    prevTotal = total;

    const info = readFileSync("/proc/meminfo", "utf8");
    const memTotal = parseInt(info.match(/MemTotal:\s+(\d+)/)?.[1] ?? "1");
    const memAvail = parseInt(info.match(/MemAvailable:\s+(\d+)/)?.[1] ?? "0");
    const memPct = Math.round(((memTotal - memAvail) / memTotal) * 100);

    const stressed = Math.max(cpuPct, memPct) > 85;
    if (stressed && !wasStressed) show({ name: "sysmon", params: {} });
    wasStressed = stressed;
  }

  // Baseline
  const lines = readFileSync("/proc/stat", "utf8").split("\n");
  const parts = lines[0].split(/\s+/).slice(1).map(Number);
  prevIdle = parts[3] + (parts[4] ?? 0);
  prevTotal = parts.reduce((a, b) => a + b, 0);

  const timer = setInterval(poll, 5_000);
  return () => clearInterval(timer);
};
