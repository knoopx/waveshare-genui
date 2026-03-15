/**
 * Idle source — shows weather when system is idle.
 */
import { execSync } from "child_process";
import type { EventSource } from "../types";

export const idleSource: EventSource = ({ show }) => {
  let wasIdle = false;

  function poll() {
    try {
      const hint = execSync("loginctl show-session auto -p IdleHint --value 2>/dev/null", { timeout: 1000 }).toString().trim();
      const idle = hint === "yes";
      if (idle && !wasIdle) show({ name: "weather", params: {} });
      wasIdle = idle;
    } catch { /* ignore */ }
  }

  const timer = setInterval(poll, 30_000);
  return () => clearInterval(timer);
};
