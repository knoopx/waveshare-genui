import React from "react";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Col, Row, Badge, Stat, List, ListItem, Separator, Timestamp,
} from "../ui";

function sh(cmd: string, cwd?: string): string {
  return execSync(cmd, { timeout: 10_000, cwd }).toString().trim();
}

/** arg0 = path to nix config (e.g. ~/.nix) */
export async function nixosScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  const configDir = params.arg0;
  if (!configDir) return null;

  try {
    const currentSystem = sh("readlink /run/current-system");
    const versionMatch = currentSystem.match(/(\d+\.\d+\.\d{8}\.[a-f0-9]+)/);
    const version = versionMatch?.[1] ?? "unknown";

    const kernel = sh("uname -r");
    const hostname = sh("hostname");

    // Uptime
    const uptimeSec = parseFloat(readFileSync("/proc/uptime", "utf8").split(" ")[0]);
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const uptime = days > 0 ? `${days}d ${hours}h` : `${hours}h`;

    // Closure + store
    let closureSize = "";
    try {
      const parts = sh("nix path-info -Sh /run/current-system 2>/dev/null").split(/\s+/);
      closureSize = parts.slice(-2).join(" ");
    } catch { /* ignore unavailable closure size */ }

    let storeUsage = "";
    let storePct = "";
    try {
      const parts = sh("df -h /nix/store | tail -1").split(/\s+/);
      storeUsage = `${parts[2]} / ${parts[1]}`;
      storePct = parts[4] ?? "";
    } catch { /* ignore unavailable store stats */ }

    // GC-able paths
    let gcPaths = 0;
    try { gcPaths = parseInt(sh("nix-store --gc --print-dead 2>/dev/null | wc -l")); } catch { /* ignore unavailable gc stats */ }

    // Failed systemd units
    let failedUnits: string[] = [];
    try {
      const raw = sh("systemctl --failed --no-legend --no-pager 2>/dev/null");
      if (raw) failedUnits = raw.split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean).slice(0, 3);
    } catch { /* ignore unavailable failed units */ }



    // Recent generations
    interface Gen { id: string; date: string; nixos: string; current: boolean }
    const generations: Gen[] = [];
    try {
      const currentGen = sh("readlink /nix/var/nix/profiles/system").match(/(\d+)/)?.[1] ?? "";
      const raw = sh("nixos-rebuild list-generations 2>/dev/null | tail -3");
      for (const line of raw.split("\n").filter(Boolean)) {
        const parts = line.trim().split(/\s{2,}/);
        const id = parts[0]?.trim();
        const date = parts[1]?.trim();
        const nixos = parts[2]?.trim() ?? "";
        if (id) generations.unshift({ id, date: date ?? "", nixos, current: id === currentGen });
      }
    } catch { /* ignore unavailable generation list */ }

    const storeColor = parseInt(storePct) > 90 ? "red" : parseInt(storePct) > 75 ? "yellow" : "green";

    return {
      name: "nixos",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="nix" title={hostname} subtitle={<Badge label={version} color="green" />} />
          <Col gap="none">
            <Row gap="md" align="stretch" justify="start" wrap={true} padding="lg none">
              <Stat label="Kernel" value={kernel} />
              <Stat label="Uptime" value={uptime} />
            </Row>
            <Separator />
            <List>
              {[
                <ListItem text="Closure" icon="disk" value={closureSize} />,
                <ListItem text="Store" icon="disk" value={storeUsage} color={storeColor} />,
                gcPaths > 0 ? <ListItem text="GC-able paths" icon="trash" value={String(gcPaths)} color="muted" /> : null,
                ...failedUnits.map((u) => <ListItem text={u} icon="error" color="red" />),
              ].filter(Boolean)}
            </List>
            {generations.length > 0 ? <Separator /> : null}
            {generations.length > 0 ? (
              <List>
                {generations.map((g) => (
                  <ListItem
                    text={`#${g.id}`}
                    secondary={g.date}
                    icon={g.current ? "check" : "circle"}
                    color={g.current ? "green" : "muted"}
                    value={g.nixos}
                  />
                ))}
              </List>
            ) : null}
          </Col>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch {
    return null;
  }
}
