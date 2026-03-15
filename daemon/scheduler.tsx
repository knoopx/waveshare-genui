/**
 * Reactive scheduler. Sources call show({ name, params }) → render.
 * Notifications are transient and revert after timeout.
 */

import { toOpenUILang } from "../genui/src/openui-emitter";
import { parseOpenUILang } from "../genui/src/openui-parser";
import { library } from "../genui/src/library";
import { rasterize } from "../genui/src/rasterizer";
import {
  connect, sendFrame, sendCommand, disconnect,
  PRIO_LOW, PRIO_NORMAL, PRIO_HIGH,
} from "./serial";
import type { SerialConn } from "./serial";
import { screens } from "./screens";
import { sources } from "./sources";
import type { Context, DisplayControl, Priority, ScreenEntry, ScreenParams } from "./types";

export interface Config {
  port: string;
  rotate: number;
  lat: number;
  lon: number;
  city: string;
}

const PRIORITY_MAP: Record<Priority, number> = {
  low: PRIO_LOW,
  normal: PRIO_NORMAL,
  high: PRIO_HIGH,
};

const NOTIFY_REVERT_MS = 5_000;

/** Stable key for dedup: name + sorted params */
function entryKey(e: ScreenEntry): string {
  const paramStr = Object.keys(e.params).length > 0
    ? ":" + Object.entries(e.params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(",")
    : "";
  return e.name + paramStr;
}

export async function scheduleLoop(config: Config): Promise<void> {
  const ctx: Context = { lat: config.lat, lon: config.lon, city: config.city };

  let serial: SerialConn | null = null;
  let currentKey = "";
  let contextEntry: ScreenEntry | null = null;
  let revertTimer: ReturnType<typeof setTimeout> | null = null;

  function ensureSerial(): SerialConn | null {
    if (serial) return serial;
    try {
      serial = connect(config.port);
      console.log(`[daemon] serial: ${config.port}`);
      return serial;
    } catch (err: any) {
      console.error(`[daemon] serial failed: ${err.message}`);
      return null;
    }
  }

  async function renderScreen(entry: ScreenEntry): Promise<boolean> {
    const builder = screens[entry.name];
    if (!builder) return false;

    const screen = await builder(ctx, entry.params);
    if (!screen) return false;

    const ouiLang = toOpenUILang(screen.element);
    const { element } = parseOpenUILang(ouiLang, library);
    const webp = await rasterize(element, { rotate: config.rotate });

    const conn = ensureSerial();
    if (!conn) return false;

    const ok = sendFrame(conn, webp, PRIORITY_MAP[screen.priority]);
    if (ok) {
      currentKey = entryKey(entry);
      const paramStr = Object.keys(entry.params).length > 0
        ? ` ${JSON.stringify(entry.params)}`
        : "";
      console.log(`[daemon] ${entry.name}${paramStr} (${Math.floor(webp.length / 1024)}KB)`);
      return true;
    } else {
      disconnect(conn);
      serial = null;
      return false;
    }
  }

  const queue: ScreenEntry[] = [];
  let processing = false;

  async function processQueue() {
    if (processing) return;
    processing = true;
    while (queue.length > 0) {
      // Always take the latest entry, skip stale ones
      const entry = queue.pop()!;
      queue.length = 0;

      const isTransient = entry.name === "notify";
      const key = entryKey(entry);
      if (!isTransient && key === currentKey) continue;

      try {
        const ok = await renderScreen(entry);
        if (ok && isTransient) {
          if (revertTimer) clearTimeout(revertTimer);
          revertTimer = setTimeout(() => {
            revertTimer = null;
            if (contextEntry && currentKey === entryKey(entry)) {
              show(contextEntry);
            }
          }, NOTIFY_REVERT_MS);
        } else if (ok && !isTransient) {
          contextEntry = entry;
          if (revertTimer) { clearTimeout(revertTimer); revertTimer = null; }
        }
      } catch (err: any) {
        console.error(`[daemon] ${entry.name}: ${err.message}`);
      }
    }
    processing = false;
  }

  function show(entry: ScreenEntry) {
    queue.push(entry);
    processQueue();
  }

  function displayOn() {
    const conn = ensureSerial();
    if (conn) {
      sendCommand(conn, 0x01); // CMD_ON
      console.log("[daemon] display on");
    }
  }

  function displayOff() {
    const conn = ensureSerial();
    if (conn) {
      sendCommand(conn, 0x00); // CMD_OFF
      console.log("[daemon] display off");
    }
  }

  const ctl: DisplayControl = { show, displayOn, displayOff };
  const cleanups = sources.map((s) => s(ctl));
  process.on("SIGINT", () => { cleanups.forEach((c) => c()); if (serial) disconnect(serial); process.exit(0); });
  process.on("SIGTERM", () => { cleanups.forEach((c) => c()); if (serial) disconnect(serial); process.exit(0); });

  console.log(`[daemon] ready (${Object.keys(screens).length} screens, ${sources.length} sources)`);
  await new Promise(() => {});
}
