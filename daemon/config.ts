/**
 * Shared config loader — reads daemon/config.yaml once, caches the result.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import yaml from "js-yaml";

export interface AccountConfig {
  email?: string;
  query?: string;
  time?: string;
  days?: string | number[];
}

let cached: any = null;

export function loadRawConfig(): any {
  if (cached) return cached;
  const configPath = resolve(dirname(new URL(import.meta.url).pathname), "config.yaml");
  cached = yaml.load(readFileSync(configPath, "utf8"));
  return cached;
}

export function sourceConfig(name: string): any {
  return loadRawConfig().sources?.[name] ?? {};
}

/** Check if an account config entry is active right now (time + days). */
export function inSchedule(acc: { time?: string; days?: string | number[] }): boolean {
  const now = new Date();
  if (acc.days) {
    const day = now.getDay();
    let allowed: number[];
    if (acc.days === "weekdays") allowed = [1, 2, 3, 4, 5];
    else if (acc.days === "weekends") allowed = [0, 6];
    else if (Array.isArray(acc.days)) allowed = acc.days.map(Number);
    else allowed = [0, 1, 2, 3, 4, 5, 6];
    if (!allowed.includes(day)) return false;
  }
  if (acc.time) {
    const m = String(acc.time).match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (m) {
      const cur = now.getHours() * 60 + now.getMinutes();
      const start = +m[1] * 60 + +m[2];
      const end = +m[3] * 60 + +m[4];
      const inRange = start <= end ? cur >= start && cur < end : cur >= start || cur < end;
      if (!inRange) return false;
    }
  }
  return true;
}

/** Get the currently active email for a source with account configs. */
export function activeAccount(sourceName: string): string {
  const cfg = sourceConfig(sourceName);
  const accounts = cfg.accounts ?? [];
  for (const acc of accounts) {
    if (inSchedule(acc)) return acc.email ?? "";
  }
  return "";
}
