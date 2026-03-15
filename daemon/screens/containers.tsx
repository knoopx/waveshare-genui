import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Col, List, ListItem, Timestamp,
} from "../ui";

interface Container {
  name: string;
  image: string;
  state: string;
  status: string;
}

function listContainers(): Container[] {
  try {
    const raw = execSync("podman ps -a --format json 2>/dev/null", { timeout: 5000 }).toString();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: any) => ({
      name: (c.Names?.[0] ?? c.Name ?? "?").replace(/^\//, ""),
      image: (c.Image ?? "?").split("/").pop()?.split(":")[0] ?? "?",
      state: c.State ?? "unknown",
      status: c.Status ?? "",
    }));
  } catch {
    // Try docker
    try {
      const raw = execSync("docker ps -a --format json 2>/dev/null", { timeout: 5000 }).toString();
      return raw.split("\n").filter(Boolean).map((line) => {
        const c = JSON.parse(line);
        return {
          name: c.Names ?? "?",
          image: (c.Image ?? "?").split("/").pop()?.split(":")[0] ?? "?",
          state: c.State ?? "unknown",
          status: c.Status ?? "",
        };
      });
    } catch { return []; }
  }
}

function stateIcon(state: string): string {
  if (state === "running") return "play";
  if (state === "exited" || state === "stopped") return "stop";
  if (state === "paused") return "pause";
  if (state === "created") return "circle";
  return "circle";
}

function stateColor(state: string): string | undefined {
  if (state === "running") return "green";
  if (state === "exited" || state === "stopped") return "red";
  if (state === "paused") return "yellow";
  return "muted";
}

export async function containersScreen(_ctx: Context, _params: ScreenParams): Promise<Screen | null> {
  const containers = listContainers();
  if (containers.length === 0) return null;

  const running = containers.filter((c) => c.state === "running").length;

  return {
    name: "containers",
    priority: "normal",
    element: (
      <Canvas>
        <Header icon="docker" title="Containers" subtitle={`${running}/${containers.length} running`} />
        <Col>
          <List>
            {containers.slice(0, 8).map((c) => (
              <ListItem
                text={c.name}
                secondary={`${c.image} · ${c.status}`}
                icon={stateIcon(c.state)}
                color={stateColor(c.state)}
              />
            ))}
          </List>
        </Col>
        <Timestamp />
      </Canvas>
    ),
  };
}
