/**
 * Network source — monitors NetworkManager StateChanged via dbus.
 * Shows network screen on connectivity transitions.
 *
 * NM states: 0=unknown 10=asleep 20=disconnected 30=disconnecting
 *            40=connecting 50=connected-local 60=connected-site 70=connected-global
 */
import { spawn } from "child_process";
import type { EventSource } from "../types";
import { setNotification } from "./notifications";

export const networkSource: EventSource = ({ show }) => {
  const proc = spawn("dbus-monitor", [
    "--system",
    "type='signal',interface='org.freedesktop.NetworkManager',member='StateChanged'",
  ], { stdio: ["ignore", "pipe", "ignore"] });

  let buffer = "";
  let lastState = 70; // assume connected

  proc.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);

      const m = line.match(/uint32\s+(\d+)/);
      if (!m) continue;
      const state = parseInt(m[1]);
      if (state === lastState) continue;

      const wasConnected = lastState >= 60;
      const isConnected = state >= 60;
      lastState = state;

      if (!isConnected && wasConnected) {
        setNotification({ app: "NetworkManager", summary: "Disconnected", body: "Network connectivity lost", icon: "wifi" });
        show({ name: "notify", params: {} });
      } else if (isConnected && !wasConnected) {
        setNotification({ app: "NetworkManager", summary: "Connected", body: "Network connectivity restored", icon: "wifi" });
        show({ name: "notify", params: {} });
      } else if (state === 40) {
        // Connecting — show network screen
        show({ name: "network", params: {} });
      }
    }
  });

  proc.on("error", () => {});
  proc.on("exit", () => {});

  return () => proc.kill();
};
