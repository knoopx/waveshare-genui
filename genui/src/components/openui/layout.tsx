import React from "react";
void React;
import { z } from "zod";
import { defineComponent } from "@openuidev/react-lang";
import { UI } from "../../tokens";
import { Children, gapEnum, iconProp, renderIcon } from "../helpers";
import * as R from "../react/layout";
import type { SpaceToken, AlignToken, JustifyToken } from "../react/layout";

export const OUICanvas = defineComponent({
  name: "Canvas",
  props: z.object({ children: Children.describe("Child components.") }),
  description: "720×720 root canvas. MUST be the root component. Sets background, font, and display dimensions.",
  component: ({ props, renderNode }) => <R.Canvas>{renderNode(props.children)}</R.Canvas>,
});

export const OUIHeader = defineComponent({
  name: "Header",
  props: z.object({
    icon: iconProp.describe("Named icon or Icon element."),
    title: Children.describe("Title text or child elements."),
    subtitle: Children.optional().describe("Optional subtitle text or child elements."),
  }),
  description: "Page header with accent bar, icon, title, and optional subtitle. Place as first child of Canvas.",
  component: ({ props, renderNode }) => (
    <R.Header
      icon={renderIcon(props.icon, UI.header.iconSize, UI.color.accent, renderNode)}
      title={Array.isArray(props.title) ? renderNode(props.title) : props.title as React.ReactNode}
      subtitle={props.subtitle ? (Array.isArray(props.subtitle) ? renderNode(props.subtitle) : props.subtitle as React.ReactNode) : undefined}
    />
  ),
});

export const OUIRow = defineComponent({
  name: "Row",
  props: z.object({
    children: Children.describe("Child components."),
    gap: gapEnum.default("md").describe("Spacing between children. Defaults to md."),
    align: z.enum(["start", "center", "end", "stretch", "baseline"]).default("stretch").describe("Cross-axis alignment. Defaults to stretch."),
    justify: z.enum(["start", "center", "end", "between", "around", "evenly"]).default("start").describe("Main-axis justification. Defaults to start."),
    wrap: z.boolean().default(false).describe("Wrap children to next line. Defaults to false."),
    grow: z.boolean().default(false).describe("Grow to fill available space. Defaults to false."),
    padding: gapEnum.optional().describe("Inner padding. Uses same scale as gap."),
  }),
  description: "Horizontal flex container.",
  component: ({ props, renderNode }) => (
    <R.Row gap={(props.gap as SpaceToken) ?? "md"} align={(props.align as AlignToken) ?? "stretch"} justify={(props.justify as JustifyToken) ?? "start"} wrap={props.wrap as boolean} grow={props.grow as boolean} padding={props.padding as SpaceToken | undefined}>
      {renderNode(props.children)}
    </R.Row>
  ),
});

export const OUICol = defineComponent({
  name: "Col",
  props: z.object({
    children: Children.describe("Child components."),
    gap: gapEnum.default("md").describe("Spacing between children. Defaults to md."),
    align: z.enum(["start", "center", "end", "stretch", "baseline"]).default("stretch").describe("Cross-axis alignment. Defaults to stretch."),
    justify: z.enum(["start", "center", "end", "between", "around", "evenly"]).default("start").describe("Main-axis justification. Defaults to start."),
    grow: z.boolean().default(false).describe("Grow to fill available space. Defaults to false."),
    padding: gapEnum.optional().describe("Inner padding. Uses same scale as gap."),
  }),
  description: "Vertical flex container.",
  component: ({ props, renderNode }) => (
    <R.Col gap={(props.gap as SpaceToken) ?? "md"} align={(props.align as AlignToken) ?? "stretch"} justify={(props.justify as JustifyToken) ?? "start"} grow={props.grow as boolean} padding={props.padding as SpaceToken | undefined}>
      {renderNode(props.children)}
    </R.Col>
  ),
});

export const OUICard = defineComponent({
  name: "Card",
  props: z.object({
    children: Children.describe("Child components."),
    variant: z.enum(["card", "sunk", "clear"]).default("card").describe("Visual style: card (elevated), sunk (recessed), clear (transparent). Defaults to card."),
  }),
  description: "Container with visual style.",
  component: ({ props, renderNode }) => <R.Card variant={(props.variant as "card" | "sunk" | "clear") ?? "card"}>{renderNode(props.children)}</R.Card>,
});

export const OUISeparator = defineComponent({
  name: "Separator",
  props: z.object({}),
  description: "Horizontal divider line.",
  component: () => <R.Separator />,
});

export const OUISpacer = defineComponent({
  name: "Spacer",
  props: z.object({}),
  description: "Flexible spacer that expands to fill available space.",
  component: () => <R.Spacer />,
});
