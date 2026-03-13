#!/usr/bin/env bun
/**
 * Full-screen image display.
 *
 * Usage: image.tsx /path/to/photo.png
 *        image.tsx --width 560 --height 420 --title "Photo" /path/to/photo.jpg
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { Canvas, Header, Content, Stack, Image, Timestamp } from "../src/components";
import { RADIUS } from "../src/tokens";

const argv = process.argv.slice(2);
let title = "";
let width: number | undefined;
let height: number | undefined;
let src = "";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
  else if (argv[i] === "--width" && argv[i + 1]) width = parseInt(argv[++i]);
  else if (argv[i] === "--height" && argv[i + 1]) height = parseInt(argv[++i]);
  else if (!argv[i].startsWith("-")) src = argv[i];
}

if (!src) throw new Error("Usage: image.tsx [--title Title] [--width N] [--height N] <path>");

emit(
  <Canvas>
    {title ? <Header icon={"\uf03e"} title={title} /> : null}
    <Content>
      <Stack direction="column" gap="lg" align="center" justify="center">
        <Image src={src} width={width} height={height} borderRadius={RADIUS.md} />
      </Stack>
    </Content>
    <Timestamp />
  </Canvas>,
);
