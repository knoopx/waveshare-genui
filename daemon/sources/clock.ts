/**
 * Clock source — flashes the clock screen every 15 minutes.
 * Pomodoro-like time awareness nudge.
 */
import type { EventSource } from "../types";

const INTERVAL_MS = 15 * 60_000;

export const clockSource: EventSource = ({ show }) => {
  function tick() {
    show({ name: "clock", params: {} });
  }

  // Align to the next 15-minute mark
  const now = new Date();
  const minPast = now.getMinutes() % 15;
  const secPast = now.getSeconds();
  const msToNext = ((15 - minPast) * 60 - secPast) * 1000;

  const initial = setTimeout(() => {
    tick();
    // Then every 15 minutes
    const interval = setInterval(tick, INTERVAL_MS);
    (cleanup as any)._interval = interval;
  }, msToNext);

  function cleanup() {
    clearTimeout(initial);
    if ((cleanup as any)._interval) clearInterval((cleanup as any)._interval);
  }

  return cleanup;
};
