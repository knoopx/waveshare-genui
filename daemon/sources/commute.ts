/**
 * Commute source — checks calendar for events with a location.
 * 30 minutes before, triggers the departures screen.
 * Station ID configurable per source config.
 */
import { execSync } from "child_process";
import type { EventSource } from "../types";

export const commuteSource: EventSource = ({ show }) => {
  let lastAlerted = "";

  function poll() {
    try {
      const raw = execSync(
        "gog calendar events --today --max 5 -j --results-only --no-input",
        { timeout: 15_000 },
      ).toString();
      const events = JSON.parse(raw);
      if (!Array.isArray(events)) return;

      const now = Date.now();
      for (const e of events) {
        if (!e.location && !e.hangoutLink) continue;
        const start = e.start?.dateTime;
        if (!start) continue;

        const minutesUntil = (new Date(start).getTime() - now) / 60_000;
        if (minutesUntil > 0 && minutesUntil <= 30) {
          const id = `${e.id ?? e.summary}-${start}`;
          if (id !== lastAlerted) {
            lastAlerted = id;
            console.log(`[commute] event "${e.summary}" in ${Math.round(minutesUntil)}min, showing departures`);
            show({ name: "departures", params: { arg0: "78805", arg1: "Passeig de Gràcia" } });
          }
        }
      }
    } catch { /* ignore */ }
  }

  const timer = setInterval(poll, 60_000);
  poll();
  return () => clearInterval(timer);
};
