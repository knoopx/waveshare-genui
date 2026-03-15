/**
 * Media source — monitors MPRIS PropertiesChanged via dbus.
 * Shows nowplaying on track change or playback start. No spawned processes.
 */
import { spawn } from "child_process";
import type { EventSource } from "../types";

export const mediaSource: EventSource = ({ show }) => {
  const proc = spawn("dbus-monitor", [
    "--session",
    "interface='org.freedesktop.DBus.Properties',member='PropertiesChanged',path='/org/mpris/MediaPlayer2'",
  ], { stdio: ["ignore", "pipe", "ignore"] });

  let buffer = "";

  proc.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);

      // Detect PlaybackStatus or title change
      if (line.includes('"PlaybackStatus"')) {
        // Next string value will be Playing/Paused/Stopped
        // We trigger on any status change — the screen builder checks if playing
        show({ name: "nowplaying", params: {} });
      }

      // Detect title in metadata
      const titleMatch = line.match(/string "xesam:title"/);
      if (titleMatch) {
        // Title key found — the value follows on next lines
        // We can't easily parse nested dbus variants, so just trigger
        show({ name: "nowplaying", params: {} });
      }
    }
  });

  proc.on("error", () => {});
  proc.on("exit", () => {});

  return () => proc.kill();
};
