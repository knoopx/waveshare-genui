/**
 * Build watcher — detects build/test processes finishing.
 * When a known build tool exits, shows a notification with pass/fail.
 */
import { execSync } from "child_process";
import type { EventSource } from "../types";
import { setNotification } from "./notifications";

const BUILD_PATTERNS = [
  { re: /\bcargo\s+(build|test|check|clippy)\b/, name: "Cargo" },
  { re: /\bbun\s+(test|build|run\s+build)\b/, name: "Bun" },
  { re: /\bnpm\s+(test|run\s+build)\b/, name: "npm" },
  { re: /\bvitest\b/, name: "Vitest" },
  { re: /\bjest\b/, name: "Jest" },
  { re: /\btsc\b/, name: "TypeScript" },
  { re: /\bnix\s+build\b/, name: "Nix" },
  { re: /\bnixos-rebuild\b/, name: "NixOS" },
  { re: /\bnh\s+(os|home)\s+switch\b/, name: "nh" },
  { re: /\bmake\b/, name: "Make" },
  { re: /\bgo\s+(build|test)\b/, name: "Go" },
  { re: /\bpytest\b/, name: "pytest" },
  { re: /\bruff\b/, name: "Ruff" },
  { re: /\beslint\b/, name: "ESLint" },
];

interface TrackedProcess {
  pid: string;
  name: string;
}

export const buildSource: EventSource = ({ show }) => {
  const tracked = new Map<string, TrackedProcess>();

  function poll() {
    let psOutput: string;
    try {
      psOutput = execSync("ps -eo pid,args --no-headers", { timeout: 3000 }).toString();
    } catch { return; }

    const currentPids = new Set<string>();

    for (const line of psOutput.split("\n")) {
      const m = line.trim().match(/^(\d+)\s+(.+)$/);
      if (!m) continue;
      const [, pid, cmdline] = m;

      for (const pattern of BUILD_PATTERNS) {
        if (pattern.re.test(cmdline)) {
          currentPids.add(pid);
          if (!tracked.has(pid)) {
            tracked.set(pid, { pid, name: pattern.name });
            console.log(`[build] tracking ${pattern.name} (pid ${pid})`);
          }
          break;
        }
      }
    }

    // Check for processes that disappeared (finished)
    for (const [pid, proc] of tracked) {
      if (!currentPids.has(pid)) {
        tracked.delete(pid);

        // Check exit code via /proc (already gone, so we infer from absence)
        // We can't get the exit code after the fact, but we can show it finished
        setNotification({
          app: proc.name,
          summary: `${proc.name} finished`,
          body: `Process ${pid} completed`,
          icon: "check",
        });
        console.log(`[build] ${proc.name} (pid ${pid}) finished`);
        show({ name: "notify", params: {} });
      }
    }
  }

  const timer = setInterval(poll, 3_000);

  return () => clearInterval(timer);
};
