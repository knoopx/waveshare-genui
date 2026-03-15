/**
 * Birthday source — checks Google Contacts for birthdays today.
 * Shows a notification when someone has a birthday.
 */
import { execSync } from "child_process";
import type { EventSource } from "../types";
import { setNotification } from "./notifications";

export const birthdaySource: EventSource = ({ show }) => {
  let lastCheckedDate = "";

  function poll() {
    const today = new Date().toISOString().slice(0, 10);
    if (today === lastCheckedDate) return;
    lastCheckedDate = today;

    try {
      // gog contacts with birthday search
      const raw = execSync(
        "gog contacts list --max 100 -j --results-only --no-input 2>/dev/null",
        { timeout: 15_000 },
      ).toString();
      const contacts = JSON.parse(raw);
      if (!Array.isArray(contacts)) return;

      const todayMD = today.slice(5); // MM-DD
      for (const c of contacts) {
        const bday = c.birthday ?? c.birthdays?.[0]?.date;
        if (!bday) continue;
        // birthday format varies: YYYY-MM-DD or --MM-DD or MM/DD
        const bdayStr = String(bday);
        const m = bdayStr.match(/(\d{2})-(\d{2})$/);
        if (m && `${m[1]}-${m[2]}` === todayMD) {
          const name = c.name ?? c.displayName ?? c.names?.[0]?.displayName ?? "Someone";
          setNotification({
            app: "Contacts",
            summary: `🎂 Happy Birthday!`,
            body: `${name} has a birthday today`,
            icon: "heart",
          });
          console.log(`[birthday] ${name}`);
          show({ name: "notify", params: {} });
        }
      }
    } catch { /* ignore */ }
  }

  poll();
  // Check once per hour
  const timer = setInterval(poll, 3600_000);
  return () => clearInterval(timer);
};
