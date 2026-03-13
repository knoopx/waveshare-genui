#!/usr/bin/env bun
/**
 * List — from JSON, stdin, CLI items, or live nix profile.
 *
 * Usage: list.tsx                                        (auto: nix profile packages)
 *        list.tsx -i "Buy milk:From the store" -i "Walk dog" [--title "To Do"]
 *        list.tsx --json '[{"text":"Item","secondary":"Detail","icon":"\\uf07a"}]'
 *        echo '[...]' | list.tsx --stdin [--title "Data"]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";
const argv = process.argv.slice(2);
const itemSpecs: string[] = [];
let jsonStr = "";
let useStdin = false;
let title = "";
let icon = "\uf03a";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "-i" && argv[i + 1]) itemSpecs.push(argv[++i]);
  else if (argv[i] === "--json" && argv[i + 1]) jsonStr = argv[++i];
  else if (argv[i] === "--stdin") useStdin = true;
  else if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
  else if (argv[i] === "--icon" && argv[i + 1]) icon = argv[++i];
}

type Item = { text: string; secondary: string; icon?: string };
let items: Item[];

if (jsonStr || useStdin) {
  const data = JSON.parse(useStdin ? readFileSync("/dev/stdin", "utf8") : jsonStr);
  items = data.map((d: any) =>
    typeof d === "string" ? { text: d, secondary: "" } : { text: d.text ?? "", secondary: d.secondary ?? "", icon: d.icon },
  );
} else if (itemSpecs.length > 0) {
  items = itemSpecs.map((s) => {
    const [text, ...rest] = s.split(":");
    return { text, secondary: rest.join(":") };
  });
} else {
  title = title || "Installed Packages";
  icon = "\uf487";
  const raw = execSync("nix profile list --json", { timeout: 10000 }).toString();
  const parsed = JSON.parse(raw);
  const elements = parsed.elements ?? {};
  items = Object.entries(elements).slice(0, 8).map(([, el]) => {
    const e = el as any;
    const name = e.attrPath?.split(".")?.pop() ?? e.storePaths?.[0]?.split("-")?.slice(1)?.join("-") ?? "unknown";
    return { text: name, secondary: e.originalUrl ?? e.url ?? "" };
  });
}

emit(
  <Canvas>
    <Header icon={icon} title={title || "List"} />
    <Content>
      <List>
        {items.map((it) => (
          <ListItem text={it.text} secondary={it.secondary} icon={it.icon ?? icon} />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
