/**
 * Sleep/wake source — monitors systemd-logind PrepareForSleep signal.
 * Turns display off on sleep, turns on + shows mail/calendar on wake.
 */
import { spawn } from "child_process";
import type { EventSource } from "../types";

export const sleepSource: EventSource = ({ show, displayOn, displayOff }) => {
  // Monitor PrepareForSleep(bool) — true = going to sleep, false = waking up
  const proc = spawn("dbus-monitor", [
    "--system",
    "type='signal',interface='org.freedesktop.login1.Manager',member='PrepareForSleep'",
  ], { stdio: ["ignore", "pipe", "ignore"] });

  let buffer = "";

  proc.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);

      // "boolean true" = going to sleep, "boolean false" = waking up
      if (line.includes("boolean true")) {
        console.log("[sleep] system sleeping → display off");
        displayOff();
      } else if (line.includes("boolean false")) {
        console.log("[sleep] system waking → display on, showing mail");
        displayOn();
        // Show mail first, then calendar
        show({ name: "mail", params: {} });
        setTimeout(() => {
          show({ name: "calendar", params: {} });
        }, 15_000);
      }
    }
  });

  proc.on("error", () => {});
  proc.on("exit", () => {});

  return () => proc.kill();
};
