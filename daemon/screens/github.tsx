import React from "react";
import { execSync } from "child_process";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Col, List, ListItem, Timestamp,
} from "../ui";

function sh(cmd: string): string {
  return execSync(cmd, { timeout: 10_000 }).toString().trim();
}

/** GitHub PRs screen. arg0 = owner/repo */
export async function prsScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  const repo = params.arg0;
  if (!repo) return null;
  const repoName = repo.split("/").pop() ?? repo;

  try {
    const raw = sh(`gh pr list --repo "${repo}" --limit 6 --json number,title,state,author 2>/dev/null`);
    const prs = JSON.parse(raw);
    if (!Array.isArray(prs) || prs.length === 0) return null;

    return {
      name: "prs",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="git" title={repoName} subtitle={`${prs.length} PRs`} />
          <Col>
            <List>
              {prs.map((p: any) => (
                <ListItem
                  text={p.title ?? ""}
                  secondary={`#${p.number} by ${p.author?.login ?? "?"}`}
                  icon="git"
                  color={p.state === "OPEN" ? "green" : "muted"}
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

/** GitHub CI runs screen. arg0 = owner/repo */
export async function ciScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  const repo = params.arg0;
  if (!repo) return null;
  const repoName = repo.split("/").pop() ?? repo;

  try {
    const raw = sh(`gh run list --repo "${repo}" --limit 6 --json status,conclusion,name,event,headBranch 2>/dev/null`);
    const runs = JSON.parse(raw);
    if (!Array.isArray(runs) || runs.length === 0) return null;

    function icon(r: any): string {
      if (r.conclusion === "success") return "check";
      if (r.conclusion === "failure") return "error";
      if (r.status === "in_progress") return "sync";
      return "circle";
    }

    function color(r: any): string {
      if (r.conclusion === "success") return "green";
      if (r.conclusion === "failure") return "red";
      if (r.status === "in_progress") return "yellow";
      return "muted";
    }

    return {
      name: "ci",
      priority: "normal",
      element: (
        <Canvas>
          <Header icon="github" title={repoName} subtitle="CI" />
          <Col>
            <List>
              {runs.map((r: any) => (
                <ListItem
                  text={r.name ?? ""}
                  secondary={`${r.headBranch ?? ""} · ${r.conclusion || r.status}`}
                  icon={icon(r)}
                  color={color(r)}
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
