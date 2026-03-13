#!/usr/bin/env bun
/**
 * Stock ticker — live from Yahoo Finance.
 *
 * Usage: stocks.tsx AAPL MSFT BTC-USD
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, Card, Stack, Text, Badge, Spacer, Sparkline, Timestamp } from "../src/components";
const symbols = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (symbols.length === 0) throw new Error("Usage: stocks.tsx AAPL MSFT BTC-USD");

type Ticker = { symbol: string; price: string; changePct: number; sparkline: number[] };

async function fetchTicker(symbol: string): Promise<Ticker> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`;
  const res = await fetch(url, {
    headers: { "User-Agent": "waveshare-genui" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${symbol}`);
  const raw = await res.json();
  const result = raw.chart.result[0];
  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose ?? price;
  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const sparkline = closes.filter((c): c is number => c != null);
  const fmt = price >= 1000 ? `$${Math.round(price).toLocaleString()}` : `$${price.toFixed(2)}`;
  return { symbol: symbol.toUpperCase(), price: fmt, changePct, sparkline };
}

const tickers = await Promise.all(symbols.map(fetchTicker));

emit(
  <Canvas>
    <Header icon={"\uf201"} title="Market" />
    <Content gap="sm">
      {tickers.map((t) => {
        const color = t.changePct >= 0 ? "green" : "red";
        const sign = t.changePct >= 0 ? "+" : "";
        return (
          <Card>
            <Stack direction="row" gap="sm" align="center">
              <Text content={t.symbol} size="md" weight="bold" color="muted" />
              <Badge label={`${sign}${t.changePct.toFixed(2)}%`} color={color} />
              <Spacer />
              <Text content={t.price} size="lg" weight="bold" />
            </Stack>
            <Sparkline values={t.sparkline} color={color} />
          </Card>
        );
      })}
    </Content>
    <Timestamp />
  </Canvas>,
);
