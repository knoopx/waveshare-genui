/**
 * Screen lock source — monitors login1 session Lock/Unlock signals.
 * Lock → display off. Unlock → display on + mail then calendar.
 */
import { execSync, spawn } from "child_process";
import type { EventSource } from "../types";

function sessionPath(): string {
  const raw = execSync(
    "dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.login1.Manager.ListSessions 2>/dev/null",
    { timeout: 3000 },
  ).toString();
  const m = raw.match(/object path "([^"]+)"/);
  return m?.[1] ?? "";
}

export const screenlockSource: EventSource = ({ show, displayOn, displayOff }) => {
  let path: string;
  try {
    path = sessionPath();
  } catch {
    return () => {};
  }
  if (!path) return () => {};

  const proc = spawn("dbus-monitor", [
    "--system",
    `type='signal',path='${path}',interface='org.freedesktop.login1.Session'`,
  ], { stdio: ["ignore", "pipe", "ignore"] });

  let buffer = "";

  proc.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);

      if (line.includes("member=Lock")) {
        console.log("[lock] session locked → display off");
        displayOff();
      } else if (line.includes("member=Unlock")) {
        console.log("[lock] session unlocked → display on");
        displayOn();
        show({ name: "mail", params: {} });
        setTimeout(() => show({ name: "calendar", params: {} }), 15_000);
      }
    }
  });

  proc.on("error", () => {});
  proc.on("exit", () => {});

  return () => proc.kill();
};
