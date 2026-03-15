import React from "react";
void React;
import { z } from "zod";
import { defineComponent } from "@openuidev/react-lang";
import { UI, semanticColor } from "../../tokens";
import { colorEnum, asArray, renderIcon } from "../helpers";
import * as R from "../react/data";

export const OUIKeyValue = defineComponent({
  name: "KeyValue",
  props: z.object({
    label: z.string().describe("Label text (left side)."),
    value: z.string().describe("Value text (right side)."),
    secondary: z.string().optional().describe("Secondary text below the label."),
    color: colorEnum.default("default").describe("Value text color. Defaults to default."),
  }),
  description: "Label-value row for compact summaries, metadata, and settings screens.",
  component: ({ props }) => <R.KeyValue label={props.label as string} value={props.value as string} secondary={props.secondary as string | undefined} color={(props.color as R.KeyValueProps["color"]) ?? "default"} />,
});

export const OUIStat = defineComponent({
  name: "Stat",
  props: z.object({
    label: z.string().describe("Metric label."),
    value: z.string().describe("Prominent metric value."),
    unit: z.string().optional().describe("Unit suffix (e.g. %, ms, GB)."),
    helper: z.string().optional().describe("Helper text below the value."),
    color: colorEnum.default("default").describe("Value text color. Defaults to default."),
  }),
  description: "Compact metric card with label, prominent value, optional unit, and helper text. Grows to fill available row space.",
  component: ({ props }) => <R.Stat label={props.label as string} value={props.value as string} unit={props.unit as string | undefined} helper={props.helper as string | undefined} color={(props.color as R.StatProps["color"]) ?? "default"} />,
});

// ─── List ───────────────────────────────────────────────────────────────────

export const OUIListItem = defineComponent({
  name: "ListItem",
  props: z.object({
    text: z.string().describe("Primary text."),
    secondary: z.string().optional().describe("Secondary text below primary."),
    icon: z.union([z.string(), z.object({ type: z.literal("element"), typeName: z.string(), props: z.object({}).passthrough() })]).optional().describe("Named icon or Icon element."),
    value: z.string().optional().describe("Right-side value text."),
    color: colorEnum.optional().describe("Left border / bullet color. Defaults to accent."),
  }),
  description: "List row with optional icon, secondary text, right-side value, and colored left border.",
  component: () => null,
});

export const OUIList = defineComponent({
  name: "List",
  props: z.object({ items: z.array(OUIListItem.ref).describe("ListItem children.") }),
  description: "Vertical list with optional icons, secondary text, and right-side values. Max ~8 items fit.",
  component: ({ props, renderNode }) => {
    const items = asArray(props.items).map((it: any) => {
      const p = it.props ?? {};
      return {
        ...p,
        icon: p.icon ? renderIcon(p.icon, UI.list.iconSize, p.color ? semanticColor(p.color) : UI.color.accent, renderNode) : undefined,
      } as R.ListItemData;
    });
    return <R.List items={items} />;
  },
});

// ─── Table ──────────────────────────────────────────────────────────────────

export const OUITableCol = defineComponent({
  name: "TableCol",
  props: z.object({
    label: z.string().describe("Column header text."),
    type: z.enum(["string", "number"]).default("string").describe("Data type. number auto-aligns right. Defaults to string."),
    align: z.enum(["left", "center", "right"]).optional().describe("Explicit alignment. Overrides type default."),
  }),
  description: "Column definition for Table.",
  component: () => null,
});

export const OUITable = defineComponent({
  name: "Table",
  props: z.object({
    columns: z.array(OUITableCol.ref).describe("Column definitions."),
    rows: z.array(z.array(z.union([z.string(), z.number()]))).describe("Row data as 2D array."),
  }),
  description: "Data table with headers and rows. Max ~12 rows fit on display.",
  component: ({ props }) => {
    const columns = asArray(props.columns).map((c: any) => (c.props ?? {}) as R.TableColData);
    const rows = asArray(props.rows) as unknown as (string | number)[][];
    return <R.Table columns={columns} rows={rows} />;
  },
});

// ─── Steps ──────────────────────────────────────────────────────────────────

export const OUIStepsItem = defineComponent({
  name: "StepsItem",
  props: z.object({
    title: z.string().describe("Step title."),
    details: z.string().optional().describe("Explanatory text for this step."),
  }),
  description: "A single step with title and optional details.",
  component: () => null,
});

export const OUISteps = defineComponent({
  name: "Steps",
  props: z.object({ items: z.array(OUIStepsItem.ref).describe("StepsItem children.") }),
  description: "Numbered sequential step list.",
  component: ({ props }) => {
    const items = asArray(props.items).map((it: any) => (it.props ?? {}) as R.StepData);
    return <R.Steps items={items} />;
  },
});

// ─── Tags ───────────────────────────────────────────────────────────────────

export const OUITag = defineComponent({
  name: "Tag",
  props: z.object({
    text: z.string().describe("Tag label text."),
    icon: z.string().optional().describe("Named icon."),
    color: colorEnum.default("muted").describe("Tag color. Defaults to muted."),
  }),
  description: "Labeled tag pill with optional named icon.",
  component: () => null,
});

export const OUITagBlock = defineComponent({
  name: "TagBlock",
  props: z.object({ tags: z.array(OUITag.ref).describe("Tag children.") }),
  description: "Flow-wrapped group of Tag components.",
  component: ({ props }) => {
    const tags = asArray(props.tags).map((t: any) => (t.props ?? {}) as R.TagData);
    return <R.TagBlock tags={tags} />;
  },
});
