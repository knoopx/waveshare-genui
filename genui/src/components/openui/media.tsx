import React from "react";
void React;
import { z } from "zod";
import { defineComponent } from "@openuidev/react-lang";
import { UI, QRCODE_SIZE_NAMES } from "../../tokens";
import { colorEnum } from "../helpers";
import * as R from "../react/media";

export const OUIQRCode = defineComponent({
  name: "QRCode",
  props: z.object({
    data: z.string().describe("Data to encode in the QR code."),
    size: z.enum(QRCODE_SIZE_NAMES).default("md").describe(`QR code size: sm (${UI.qrcode.size.sm}px), md (${UI.qrcode.size.md}px), lg (${UI.qrcode.size.lg}px). Defaults to md.`),
    color: colorEnum.default("default").describe("Foreground color. Defaults to default (foreground)."),
  }),
  description: "QR code from a data string.",
  component: ({ props }) => <R.QRCode data={props.data as string} size={(props.size as R.QRCodeProps["size"]) ?? "md"} color={(props.color as R.QRCodeProps["color"]) ?? "default"} />,
});

export const OUIImage = defineComponent({
  name: "Image",
  props: z.object({
    src: z.string().describe("File path or data URI. File paths are base64-embedded automatically."),
    width: z.number().default(UI.image.defaultWidth).describe(`Image width in pixels. Defaults to ${UI.image.defaultWidth}.`),
    height: z.number().default(UI.image.defaultHeight).describe(`Image height in pixels. Defaults to ${UI.image.defaultHeight}.`),
    fit: z.enum(["contain", "cover", "fill"]).default("contain").describe("Object-fit mode. Defaults to contain."),
    borderRadius: z.number().default(0).describe("Corner radius in pixels. Defaults to 0."),
  }),
  description: "Displays an image from a file path or data URI.",
  component: ({ props }) => <R.Image src={props.src as string} width={(props.width as number) ?? UI.image.defaultWidth} height={(props.height as number) ?? UI.image.defaultHeight} fit={(props.fit as "contain" | "cover" | "fill") ?? "contain"} borderRadius={(props.borderRadius as number) ?? 0} />,
});
