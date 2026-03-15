/**
 * Window source — niri event-stream + YAML rule engine.
 *
 * Rules have `title` regex with capture groups. $1, $2, $name in screen
 * args are substituted from the match. If `title` has no captures, it's
 * just a filter. If it has captures, they become screen params.
 */
import { spawn, execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import yaml from "js-yaml";
import type { EventSource, ScreenEntry } from "../types";

interface NiriWindow {
  id: number;
  app_id?: string;
  title?: string;
  pid?: number;
  is_focused?: boolean;
}

interface ParsedRule {
  app?: string;
  title?: RegExp;
  screenTemplates: { name: string; argTemplate: string[] }[];
}

interface Config {
  cycle: number;
  rules: ParsedRule[];
  fallback: ScreenEntry[];
}

function parseScreenEntry(raw: any): { name: string; argTemplate: string[] } | null {
  if (typeof raw !== "string") return null;
  const parts = String(raw).trim().split(/\s+/);
  const name = parts[0];
  if (!name) return null;
  return { name, argTemplate: parts.slice(1) };
}

function parseRegex(s: string): RegExp {
  const m = s.match(/^\/(.+)\/([gimsuy]*)$/);
  return m ? new RegExp(m[1], m[2]) : new RegExp(s);
}

function loadConfig(): Config {
  const configPath = resolve(dirname(new URL(import.meta.url).pathname), "../config.yaml");
  const raw = yaml.load(readFileSync(configPath, "utf8")) as any;

  const rules: ParsedRule[] = [];
  for (const r of raw.rules ?? []) {
    const screenTemplates: { name: string; argTemplate: string[] }[] = [];
    for (const s of r.screens ?? []) {
      const entry = parseScreenEntry(s);
      if (entry) screenTemplates.push(entry);
    }
    if (screenTemplates.length === 0) continue;

    const rule: ParsedRule = { screenTemplates };
    if (r.app) rule.app = r.app;
    if (r.title) rule.title = parseRegex(String(r.title));
    rules.push(rule);
  }

  const windowCfg = raw.sources?.window ?? {};
  const fallbackRaw = windowCfg.fallback ?? ["clock", "weather"];
  const fallback: ScreenEntry[] = fallbackRaw.map((s: any) => ({ name: String(s), params: {} }));

  return { cycle: (windowCfg.cycle ?? 15) * 1000, fallback, rules };
}

function matchRule(config: Config, win: NiriWindow): ScreenEntry[] {
  const appId = win.app_id ?? "";
  const title = win.title ?? "";

  for (const rule of config.rules) {
    if (rule.app && rule.app !== appId) continue;

    const groups: Record<string, string> = {};
    let positional: string[] = [];

    if (rule.title) {
      const m = rule.title.exec(title);
      if (!m) continue;
      positional = m.slice(1);
      if (m.groups) {
        for (const [k, v] of Object.entries(m.groups)) {
          if (v != null) groups[k] = v;
        }
      }
    }

    function substitute(s: string): string {
      let result = s;
      for (const [k, v] of Object.entries(groups)) result = result.replaceAll(`$${k}`, v);
      for (let i = 0; i < positional.length; i++) result = result.replaceAll(`$${i + 1}`, positional[i]);
      result = result.replace(/^~/, process.env.HOME ?? "");
      return result;
    }

    return rule.screenTemplates.map((t) => {
      const args = t.argTemplate.map(substitute);
      const params: Record<string, string> = {};
      args.forEach((a, i) => { params[`arg${i}`] = a; });
      return { name: t.name, params };
    });
  }

  return config.fallback;
}

export const windowSource: EventSource = ({ show }) => {
  const config = loadConfig();
  console.log(`[window] loaded ${config.rules.length} rules, cycle ${config.cycle / 1000}s`);

  const windowCache = new Map<number, NiriWindow>();
  const windowState = new Map<number, { screens: ScreenEntry[]; idx: number }>();
  let currentWinId = -1;
  let cycleTimer: ReturnType<typeof setInterval> | null = null;
  let buffer = "";

  function stopCycle() {
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
  }

  function startCycle(state: { screens: ScreenEntry[]; idx: number }) {
    stopCycle();
    if (state.screens.length <= 1) return;
    cycleTimer = setInterval(() => {
      state.idx = (state.idx + 1) % state.screens.length;
      const entry = state.screens[state.idx];
      console.log(`[window] cycle → ${entry.name} (${state.idx + 1}/${state.screens.length})`);
      show(entry);
    }, config.cycle);
  }

  function onFocus(win: NiriWindow) {
    if (win.id === currentWinId) return;
    currentWinId = win.id;

    let state = windowState.get(win.id);
    if (!state) {
      const screens = matchRule(config, win);
      state = { screens, idx: 0 };
      windowState.set(win.id, state);
    } else {
      state.idx = (state.idx + 1) % state.screens.length;
    }

    const entry = state.screens[state.idx];
    if (!entry) return;
    const names = state.screens.map((s) => s.name);
    const label = `${win.app_id ?? "?"}${win.title ? ` "${win.title.slice(0, 60)}"` : ""}`;
    console.log(`[window] ${label} → [${names.join(", ")}]`);
    show(entry);
    startCycle(state);
  }

  const proc = spawn("niri", ["msg", "--json", "event-stream"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      try {
        const ev = JSON.parse(line);

        if (ev.WindowsChanged?.windows) {
          for (const w of ev.WindowsChanged.windows as NiriWindow[]) {
            windowCache.set(w.id, w);
            if (w.is_focused) onFocus(w);
          }
        }

        if (ev.WindowOpenedOrChanged?.window) {
          const w: NiriWindow = ev.WindowOpenedOrChanged.window;
          windowCache.set(w.id, w);
          if (w.is_focused) onFocus(w);
        }

        if (ev.WindowClosed?.id != null) {
          windowCache.delete(ev.WindowClosed.id);
          windowState.delete(ev.WindowClosed.id);
        }

        if (ev.WindowFocusChanged?.id != null) {
          const id: number = ev.WindowFocusChanged.id;
          const cached = windowCache.get(id);
          if (cached) {
            onFocus(cached);
          } else {
            try {
              const raw = execSync("niri msg --json focused-window 2>/dev/null", { timeout: 1000 }).toString();
              const win: NiriWindow = JSON.parse(raw);
              windowCache.set(win.id, win);
              onFocus(win);
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }
  });

  proc.on("error", () => {});
  proc.on("exit", () => {});

  try {
    const raw = execSync("niri msg --json focused-window 2>/dev/null", { timeout: 1000 }).toString();
    const win: NiriWindow = JSON.parse(raw);
    windowCache.set(win.id, win);
    onFocus(win);
  } catch { /* ignore */ }

  return () => {
    stopCycle();
    proc.kill();
  };
};
