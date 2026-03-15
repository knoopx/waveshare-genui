/**
 * Updates source — checks fwupd for firmware updates periodically.
 * Shows a notification when updates are available.
 */
import { execSync } from "child_process";
import type { EventSource } from "../types";
import { setNotification } from "./notifications";

export const updatesSource: EventSource = ({ show }) => {
  let lastCount = 0;

  function poll() {
    try {
      const raw = execSync("fwupdmgr get-updates --json 2>/dev/null", { timeout: 30_000 }).toString();
      const parsed = JSON.parse(raw);
      const devices = parsed.Devices ?? [];
      const count = devices.length;

      if (count > 0 && count !== lastCount) {
        const names = devices.map((d: any) => d.Name ?? "device").slice(0, 3).join(", ");
        setNotification({
          app: "fwupd",
          summary: "Firmware Updates",
          body: `${count} update${count > 1 ? "s" : ""}: ${names}`,
          icon: "download",
        });
        console.log(`[updates] ${count} firmware updates available`);
        show({ name: "notify", params: {} });
      }
      lastCount = count;
    } catch { /* ignore */ }
  }

  // Check once on start, then every 6 hours
  setTimeout(poll, 30_000);
  const timer = setInterval(poll, 6 * 3600_000);

  return () => clearInterval(timer);
};
