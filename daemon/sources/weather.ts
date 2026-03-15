/**
 * Weather alerts source — checks Open-Meteo for severe weather.
 * Shows high-priority notification on alerts.
 */
import type { EventSource } from "../types";
import { setNotification } from "./notifications";

export const weatherAlertSource: EventSource = ({ show }) => {
  let lastAlert = "";

  async function poll() {
    try {
      // Read location from config would be ideal, but we use the daemon's context
      // For now hardcoded from config.yaml defaults — this should be passed via config
      const url = "https://api.open-meteo.com/v1/forecast?latitude=41.39&longitude=2.17&current=weather_code,temperature_2m,wind_speed_10m&timezone=auto";
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return;
      const data = await res.json();
      const code = data.current?.weather_code ?? 0;
      const wind = data.current?.wind_speed_10m ?? 0;

      // WMO codes 95+ = thunderstorm/hail, 65+ = heavy rain/snow
      let alert = "";
      if (code >= 95) alert = "Thunderstorm warning";
      else if (code >= 75) alert = "Heavy snow";
      else if (code >= 65) alert = "Heavy rain";
      else if (wind > 80) alert = `High wind: ${Math.round(wind)} km/h`;

      if (alert && alert !== lastAlert) {
        lastAlert = alert;
        setNotification({ app: "Weather", summary: alert, body: `${Math.round(data.current.temperature_2m)}°C`, icon: "warning" });
        console.log(`[weather] alert: ${alert}`);
        show({ name: "notify", params: {} });
      } else if (!alert) {
        lastAlert = "";
      }
    } catch { /* ignore */ }
  }

  poll();
  const timer = setInterval(poll, 600_000); // every 10 min
  return () => clearInterval(timer);
};
