/**
 * Volume source — detects volume/mute changes by polling wpctl.
 * Shows audio screen only when the value actually changes.
 */
import { execSync } from "child_process";
import type { EventSource } from "../types";

function getVolume(): string {
  try {
    return execSync("wpctl get-volume @DEFAULT_AUDIO_SINK@ 2>/dev/null", { timeout: 1000 }).toString().trim();
  } catch { return ""; }
}

export const volumeSource: EventSource = ({ show }) => {
  let last = getVolume();

  const timer = setInterval(() => {
    const current = getVolume();
    if (current && current !== last) {
      last = current;
      console.log(`[volume] ${current}`);
      show({ name: "audio", params: {} });
    }
  }, 1_000);

  return () => clearInterval(timer);
};
