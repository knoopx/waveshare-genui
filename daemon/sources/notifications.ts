/**
 * Notification source — captures desktop notifications via dbus-monitor.
 */
import { spawn } from "child_process";
import type { EventSource } from "../types";

export interface Notification {
  app: string;
  summary: string;
  body: string;
  icon: string;
}

export let lastNotification: Notification | null = null;

export function setNotification(n: Notification) {
  lastNotification = n;
}

export const notificationSource: EventSource = ({ show }) => {
  const proc = spawn("dbus-monitor", [
    "--session",
    "interface='org.freedesktop.Notifications',member='Notify'",
  ], { stdio: ["ignore", "pipe", "ignore"] });

  let buffer = "";
  let inNotify = false;
  let strings: string[] = [];

  function flush() {
    if (strings.length >= 4) {
      // dbus Notify string args in order: app_name, icon, summary, body
      lastNotification = {
        app: strings[0] || "Notification",
        icon: strings[1] || "",
        summary: strings[2] || "",
        body: strings[3] || "",
      };
      console.log(`[notify] ${lastNotification.app}: ${lastNotification.summary}`);
      show({ name: "notify", params: {} });
    }
    inNotify = false;
    strings = [];
  }

  proc.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);

      // New Notify call
      if (line.includes("member=Notify")) {
        // Flush any previous in-progress parse
        if (inNotify) flush();
        inNotify = true;
        strings = [];
        continue;
      }

      if (!inNotify) continue;

      // Collect string args
      const strMatch = line.match(/^\s+string "(.*)"/);
      if (strMatch) {
        strings.push(strMatch[1]);
      }

      // int32 is the last arg in Notify (expire_timeout) — flush
      if (line.match(/^\s+int32\s/)) {
        flush();
      }
    }
  });

  proc.on("error", () => {});
  proc.on("exit", () => {});

  return () => proc.kill();
};
