/**
 * Summary source — triggers end-of-day summary at configured hour.
 */
import type { EventSource } from "../types";

const EOD_HOUR = 18;

export const summarySource: EventSource = ({ show }) => {
  let lastTriggered = "";

  function poll() {
    const now = new Date();
    const key = now.toISOString().slice(0, 10);
    if (key === lastTriggered) return;
    if (now.getHours() === EOD_HOUR && now.getMinutes() === 0) {
      lastTriggered = key;
      console.log("[summary] end of day");
      show({ name: "summary", params: {} });
    }
  }

  const timer = setInterval(poll, 30_000);
  return () => clearInterval(timer);
};
