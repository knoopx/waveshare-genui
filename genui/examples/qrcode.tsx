#!/usr/bin/env bun
/**
 * QR code display — encodes a URL or text string.
 *
 * Usage: qrcode.tsx "https://github.com/knoopx/waveshare-display"
 *        qrcode.tsx --title "Wi-Fi" "WIFI:T:WPA;S:MyNetwork;P:secret;;"
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, Stack, Text, QRCode, Timestamp } from "../src/components";

const argv = process.argv.slice(2);
let title = "";
let data = "";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
  else if (!argv[i].startsWith("-")) data = argv[i];
}

if (!data) throw new Error("Usage: qrcode.tsx [--title Title] <data>");

emit(
  <Canvas>
    {title ? <Header icon={"\uf029"} title={title} /> : null}
    <Content>
      <Stack direction="column" gap="lg" align="center" justify="center">
        <QRCode data={data} size={420} />
        <Text content={data} size="sm" color="muted" align="center" />
      </Stack>
    </Content>
    <Timestamp />
  </Canvas>,
);
