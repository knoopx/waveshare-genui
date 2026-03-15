import type { EventSource } from "../types";
import { sourceConfig } from "../config";

function stockSymbols(): string[] {
  const cfg = sourceConfig("stocks");
  const symbols = cfg.symbols;
  if (!Array.isArray(symbols)) return [];
  return symbols.map(String).map((value) => value.trim()).filter(Boolean);
}

export const stocksSource: EventSource = ({ show }) => {
  const cfg = sourceConfig("stocks");
  const pollSeconds = Number(cfg.poll ?? 1800);
  const initialDelaySeconds = Number(cfg.initial_delay ?? 30);
  const symbols = stockSymbols();
  if (symbols.length === 0) return () => {};

  const params = { arg0: symbols.join(",") };
  const tick = () => show({ name: "stocks", params });

  const initial = setTimeout(() => {
    tick();
    const interval = setInterval(tick, pollSeconds * 1000);
    (cleanup as { interval?: ReturnType<typeof setInterval> }).interval = interval;
  }, initialDelaySeconds * 1000);

  function cleanup() {
    clearTimeout(initial);
    const state = cleanup as { interval?: ReturnType<typeof setInterval> };
    if (state.interval) clearInterval(state.interval);
  }

  return cleanup;
};
