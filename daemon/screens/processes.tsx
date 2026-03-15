import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import { Canvas, Col, Header, List, ListItem, Timestamp } from "../ui";

/**
 * Params:
 *   sort: "cpu" | "mem" (default: "cpu")
 *   count: number of processes (default: 7)
 *   filter: regex to filter command names
 */
export async function processesScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  try {
    const sort = params.sort === "mem" ? "mem" : "cpu";
    const count = parseInt(params.count ?? "7") || 7;
    const sortKey = sort === "mem" ? "-%mem" : "-%cpu";
    const icon = sort === "mem" ? "memory" : "cpu";
    const label = sort === "mem" ? "MEM" : "CPU";

    const raw = execSync(
      `ps -eo pid,user,%cpu,%mem,comm --sort=${sortKey} | head -n ${count + 1} | tail -n ${count}`,
      { timeout: 3000 },
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);

    let processes = raw.map((line) => {
      const parts = line.trim().split(/\s+/, 5);
      return {
        pid: parts[0] ?? "?",
        user: parts[1] ?? "?",
        cpu: parts[2] ?? "0.0",
        mem: parts[3] ?? "0.0",
        command: parts[4] ?? "?",
      };
    });

    if (params.filter) {
      const re = new RegExp(params.filter, "i");
      processes = processes.filter((p) => re.test(p.command));
    }

    const metric = sort === "mem" ? (p: typeof processes[0]) => p.mem : (p: typeof processes[0]) => p.cpu;

    return {
      name: "processes",
      priority: "low",
      element: (
        <Canvas>
          <Header icon={icon} title={`Top by ${label}`} subtitle={params.filter ?? undefined} />
          <Col>
            <List>
              {processes.map((p) => (
                <ListItem
                  text={p.command}
                  secondary={`pid ${p.pid} · ${p.user} · CPU ${p.cpu}% · MEM ${p.mem}%`}
                  icon={icon}
                  value={`${metric(p)}%`}
                  color={parseFloat(metric(p)) > 10 ? "red" : parseFloat(metric(p)) > 3 ? "orange" : "accent"}
                />
              ))}
            </List>
          </Col>
          <Timestamp />
        </Canvas>
      ),
    };
  } catch {
    return null;
  }
}
