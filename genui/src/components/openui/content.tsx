import React from "react";
void React;
import { z } from "zod";
import { defineComponent } from "@openuidev/react-lang";
import { UI, ICON_NAMES, ICON_SIZE_NAMES, semanticColor } from "../../tokens";
import { colorEnum, iconProp, renderIcon } from "../helpers";
import * as R from "../react/content";

export const OUIText = defineComponent({
  name: "Text",
  props: z.object({
    children: z.string().describe("Text to display."),
    size: z.enum(["xs", "sm", "md", "lg", "xl", "2xl", "3xl"]).default("md").describe("Font size. Defaults to md."),
    weight: z.enum(["normal", "bold"]).default("normal").describe("Font weight. Defaults to normal."),
    color: colorEnum.default("default").describe("Text color. Defaults to default (foreground)."),
    align: z.enum(["left", "center", "right"]).default("left").describe("Text alignment. Defaults to left."),
  }),
  description: "Text block with configurable size, weight, color, and alignment.",
  component: ({ props }) => (
    <R.Text size={(props.size as R.TextProps["size"]) ?? "md"} weight={(props.weight as R.TextProps["weight"]) ?? "normal"} color={(props.color as R.TextProps["color"]) ?? "default"} align={(props.align as R.TextProps["align"]) ?? undefined}>
      {props.children as string}
    </R.Text>
  ),
});

export const OUIIcon = defineComponent({
  name: "Icon",
  props: z.object({
    name: z.enum(ICON_NAMES as unknown as [string, ...string[]]).describe("Icon name from the built-in set."),
    color: colorEnum.default("accent").describe("Icon color. Defaults to accent."),
    size: z.enum(ICON_SIZE_NAMES).default("sm").describe(`Icon size: sm (${UI.icon.size.sm}px), md (${UI.icon.size.md}px), lg (${UI.icon.size.lg}px), xl (${UI.icon.size.xl}px), 2xl (${UI.icon.size["2xl"]}px). Defaults to sm.`),
  }),
  description: "Named icon from the built-in set. Use for custom color/size when passing to icon props.",
  component: ({ props }) => <R.Icon name={props.name as string} color={(props.color as R.IconProps["color"]) ?? "accent"} size={(props.size as R.IconProps["size"]) ?? "sm"} />,
});

export const OUIBadge = defineComponent({
  name: "Badge",
  props: z.object({
    label: z.string().describe("Badge text."),
    color: colorEnum.default("accent").describe("Background color. Defaults to accent."),
  }),
  description: "Colored pill badge with label text.",
  component: ({ props }) => <R.Badge label={props.label as string} color={(props.color as R.BadgeProps["color"]) ?? "accent"} />,
});

export const OUIAlert = defineComponent({
  name: "Alert",
  props: z.object({
    title: z.string().describe("Alert heading."),
    message: z.string().optional().describe("Supporting message text."),
    icon: iconProp.optional().describe("Named icon or Icon element. Inherits alert color."),
    color: colorEnum.default("accent").describe("Border and icon color. Defaults to accent."),
  }),
  description: "Emphasized alert/callout box with optional icon, title, and message.",
  component: ({ props, renderNode }) => {
    const color = (props.color as R.AlertProps["color"]) ?? "accent";
    const icon = props.icon ? renderIcon(props.icon, UI.alert.iconSize, semanticColor(color), renderNode) : undefined;
    return <R.Alert title={props.title as string} message={props.message as string | undefined} icon={icon} color={color} />;
  },
});

export const OUIEmptyState = defineComponent({
  name: "EmptyState",
  props: z.object({
    title: z.string().describe("Heading text."),
    message: z.string().optional().describe("Supporting message text."),
    icon: iconProp.optional().describe("Named icon or Icon element. Inherits component color."),
    color: colorEnum.default("muted").describe("Icon color. Defaults to muted."),
  }),
  description: "Centered empty state with optional icon, title, and supporting message.",
  component: ({ props, renderNode }) => {
    const color = (props.color as R.EmptyStateProps["color"]) ?? "muted";
    const icon = props.icon ? renderIcon(props.icon, UI.emptyState.iconSize, semanticColor(color), renderNode) : undefined;
    return <R.EmptyState title={props.title as string} message={props.message as string | undefined} icon={icon} color={color} />;
  },
});

export const OUITimestamp = defineComponent({
  name: "Timestamp",
  props: z.object({}),
  description: "Shows current time in bottom-right corner. Place as last child of Canvas.",
  component: () => <R.Timestamp />,
});

export const OUICodeBlock = defineComponent({
  name: "CodeBlock",
  props: z.object({
    language: z.string().describe("Language label (e.g. typescript, bash)."),
    codeString: z.string().describe("Code content to display."),
  }),
  description: "Code block with language label and monospace font.",
  component: ({ props }) => <R.CodeBlock language={props.language as string} codeString={props.codeString as string} />,
});
