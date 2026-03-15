import React from "react";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Card, Row, Col, Text, Badge, Spacer, Sparkline, Timestamp,
} from "../ui";

type Ticker = {
  symbol: string;
  price: string;
  changePct: number;
  sparkline: number[];
};

function symbolsFromParams(params: ScreenParams): string[] {
  const orderedArgs = Object.entries(params)
    .filter(([key]) => /^arg\d+$/.test(key))
    .sort(([a], [b]) => Number(a.slice(3)) - Number(b.slice(3)))
    .map(([, value]) => value);

  if (orderedArgs.length === 0) return [];
  if (orderedArgs.length === 1) {
    return orderedArgs[0]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return orderedArgs.map((value) => value.trim()).filter(Boolean);
}

async function fetchTicker(symbol: string): Promise<Ticker> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`;
  const res = await fetch(url, {
    headers: { "User-Agent": "waveshare-genui" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${symbol}`);

  const raw = await res.json();
  const result = raw.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${symbol}`);

  const price = result.meta?.regularMarketPrice;
  if (typeof price !== "number") throw new Error(`No price for ${symbol}`);

  const prevClose = result.meta?.chartPreviousClose ?? price;
  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
  const closes: Array<number | null> = result.indicators?.quote?.[0]?.close ?? [];
  const sparkline = closes.filter((value): value is number => value != null);
  const formattedPrice = price >= 1000 ? `$${Math.round(price).toLocaleString()}` : `$${price.toFixed(2)}`;

  return {
    symbol: symbol.toUpperCase(),
    price: formattedPrice,
    changePct,
    sparkline,
  };
}

export async function stocksScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  const symbols = symbolsFromParams(params);
  if (symbols.length === 0) return null;

  try {
    const tickers = await Promise.all(symbols.map(fetchTicker));
    if (tickers.length === 0) return null;

    return {
      name: "stocks",
      priority: "low",
      element: (
        <Canvas>
          <Header icon="chart" title="Market" />
          <Col gap="sm">
            {tickers.map((ticker) => {
              const color = ticker.changePct >= 0 ? "green" : "red";
              const sign = ticker.changePct >= 0 ? "+" : "";
              return (
                <Card>
                  <Row gap="sm" align="center">
                    <Text size="md" weight="bold" color="muted">{ticker.symbol}</Text>
                    <Badge label={`${sign}${ticker.changePct.toFixed(2)}%`} color={color} />
                    <Spacer />
                    <Text size="lg" weight="bold">{ticker.price}</Text>
                  </Row>
                  <Sparkline values={ticker.sparkline} color={color} />
                </Card>
              );
            })}
          </Col>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch {
    return null;
  }
}
