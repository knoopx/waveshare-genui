/**
 * Calendar source — checks for upcoming meetings per account.
 * Shows meeting screen N minutes before an event starts.
 */
import { execSync } from "child_process";
import type { EventSource } from "../types";
import { sourceConfig, inSchedule, type AccountConfig } from "../config";

export const calendarSource: EventSource = ({ show }) => {
  const cfg = sourceConfig("calendar");
  const accounts: AccountConfig[] = cfg.accounts ?? [{ email: "" }];
  const pollMs = (cfg.poll ?? 60) * 1000;
  const alertMin = cfg.alert ?? 5;
  let lastAlerted = "";

  function poll() {
    for (const acc of accounts) {
      if (!inSchedule(acc)) continue;
      try {
        const email = acc.email ?? "";
        const accountFlag = email ? `-a ${email}` : "";
        const raw = execSync(
          `gog calendar events --today --max 5 ${accountFlag} -j --results-only --no-input`,
          { timeout: 15_000 },
        ).toString();
        const events = JSON.parse(raw);
        if (!Array.isArray(events)) continue;

        const now = Date.now();
        for (const e of events) {
          const startStr = e.start?.dateTime;
          if (!startStr) continue;
          const minutesUntil = (new Date(startStr).getTime() - now) / 60_000;
          if (minutesUntil > 0 && minutesUntil <= alertMin) {
            const id = `${email}-${e.id ?? e.summary}-${startStr}`;
            if (id !== lastAlerted) {
              lastAlerted = id;
              show({ name: "meeting", params: { arg0: email } });
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  const timer = setInterval(poll, pollMs);
  poll();
  return () => clearInterval(timer);
};
