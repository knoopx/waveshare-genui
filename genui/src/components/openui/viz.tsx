import React from "react";
void React;
import { z } from "zod";
import { defineComponent } from "@openuidev/react-lang";
import { UI, GAUGE_SIZE_NAMES } from "../../tokens";
import { colorEnum } from "../helpers";
import * as R from "../react/viz";

export const OUIGauge = defineComponent({
  name: "Gauge",
  props: z.object({
    label: z.string().describe("Gauge label text."),
    value: z.number().describe("Current value."),
    max: z.number().default(100).describe("Maximum value. Defaults to 100."),
    unit: z.string().default("%").describe("Unit suffix. Defaults to %."),
    size: z.enum(GAUGE_SIZE_NAMES).default("md").describe(`Gauge size: sm (${UI.gauge.size.sm}px), md (${UI.gauge.size.md}px), lg (${UI.gauge.size.lg}px), xl (${UI.gauge.size.xl}px). Defaults to md.`),
    color: colorEnum.default("accent").describe("Arc fill color. Defaults to accent."),
  }),
  description: "Arc gauge showing value/max.",
  component: ({ props }) => <R.Gauge label={props.label as string} value={props.value as number} max={(props.max as number) ?? 100} unit={(props.unit as string) ?? "%"} size={(props.size as R.GaugeProps["size"]) ?? "md"} color={(props.color as R.GaugeProps["color"]) ?? "accent"} />,
});

export const OUIProgressBar = defineComponent({
  name: "ProgressBar",
  props: z.object({
    label: z.string().describe("Bar label text."),
    value: z.number().describe("Current value."),
    max: z.number().default(100).describe("Maximum value. Defaults to 100."),
    display: z.string().optional().describe("Custom display text (e.g. '42/50'). Defaults to percentage."),
    color: colorEnum.default("accent").describe("Bar fill color. Defaults to accent."),
  }),
  description: "Horizontal progress bar with label and value display.",
  component: ({ props }) => <R.ProgressBar label={props.label as string} value={props.value as number} max={(props.max as number) ?? 100} display={props.display as string | undefined} color={(props.color as R.ProgressBarProps["color"]) ?? "accent"} />,
});

export const OUISparkline = defineComponent({
  name: "Sparkline",
  props: z.object({
    values: z.array(z.number()).describe("Data points for the line chart."),
    color: colorEnum.default("accent").describe("Line color. Defaults to accent."),
    height: z.number().default(UI.sparkline.height).describe(`Chart height in pixels. Defaults to ${UI.sparkline.height}.`),
  }),
  description: "Mini line chart. Full width.",
  component: ({ props }) => <R.Sparkline values={props.values as number[]} color={(props.color as R.SparklineProps["color"]) ?? "accent"} height={(props.height as number) ?? UI.sparkline.height} />,
});

export const OUIStatusDot = defineComponent({
  name: "StatusDot",
  props: z.object({ up: z.boolean().describe("true = green (up), false = red (down).") }),
  description: "Green/red status indicator dot.",
  component: ({ props }) => <R.StatusDot up={props.up as boolean} />,
});
