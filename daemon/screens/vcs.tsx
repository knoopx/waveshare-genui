import React from "react";
import { execSync } from "child_process";
import { existsSync } from "fs";
import type { Screen, Context, ScreenParams } from "../types";
import {
  Canvas, Header, Col, Badge, List, ListItem, Separator, Timestamp,
} from "../ui";

function sh(cmd: string, cwd?: string): string {
  return execSync(cmd, { timeout: 3000, cwd }).toString().trim();
}

type VcsKind = "jj" | "git";

interface VcsInfo {
  kind: VcsKind;
  repoName: string;
  branch: string;
  conflicts: boolean;
  log: { id: string; message: string }[];
}

function detectVcs(dir: string): { kind: VcsKind; root: string } | null {
  if (existsSync(`${dir}/.jj`)) return { kind: "jj", root: dir };
  try {
    const root = sh("jj root 2>/dev/null", dir);
    if (root && existsSync(`${root}/.jj`)) return { kind: "jj", root };
  } catch { /* ignore */ }
  try {
    const root = sh("git rev-parse --show-toplevel 2>/dev/null", dir);
    if (root) return { kind: "git", root };
  } catch { /* ignore */ }
  return null;
}

function jjInfo(dir: string): VcsInfo | null {
  try {
    const repoName = dir.split("/").pop() || dir;

    let branch = "";
    try { branch = sh("jj log --no-graph -r @ -T 'bookmarks' --limit 1", dir); } catch { /* ignore */ }
    if (!branch) {
      try { branch = sh("jj log --no-graph -r 'latest(ancestors(@) & bookmarks())' -T 'bookmarks' --limit 1", dir); } catch { /* ignore */ }
    }
    if (!branch) branch = sh("jj log --no-graph -r @ -T 'change_id.short(8)' --limit 1", dir);

    const conflicts = sh("jj log --no-graph -r @ -T 'if(conflict, \"yes\", \"no\")'", dir) === "yes";

    const logRaw = sh(
      "jj log --no-graph -r '::@' -T 'change_id.short(8) ++ \"\\t\" ++ description.first_line() ++ \"\\n\"' --limit 6",
      dir,
    );
    const log = logRaw.split("\n").filter(Boolean).map((line) => {
      const [id, ...rest] = line.split("\t");
      return { id: id ?? "", message: rest.join("\t") || "(no description)" };
    });

    return { kind: "jj", repoName, branch, conflicts, log };
  } catch {
    return null;
  }
}

function gitInfo(dir: string): VcsInfo | null {
  function git(args: string): string {
    return sh(`git ${args} 2>/dev/null`, dir);
  }
  try {
    const repoName = dir.split("/").pop() || dir;
    const branch = git("branch --show-current") || git("rev-parse --short HEAD");

    let conflicts = false;
    for (const line of git("status --porcelain=v1").split("\n").filter(Boolean)) {
      const x = line[0], y = line[1];
      if (x === "U" || y === "U" || (x === "A" && y === "A") || (x === "D" && y === "D")) {
        conflicts = true;
        break;
      }
    }

    const logRaw = git("log --oneline -6 --format='%h\t%s'");
    const log = logRaw.split("\n").filter(Boolean).map((line) => {
      const [id, ...rest] = line.split("\t");
      return { id: id ?? "", message: rest.join("\t") || "(no message)" };
    });

    return { kind: "git", repoName, branch, conflicts, log };
  } catch {
    return null;
  }
}

/**
 * VCS screen — local repo status.
 * Params: path (absolute directory)
 */
export async function vcsScreen(_ctx: Context, params: ScreenParams): Promise<Screen | null> {
  if (!params.arg0) return null;

  const vcs = detectVcs(params.arg0);
  if (!vcs) return null;

  const info = vcs.kind === "jj" ? jjInfo(vcs.root) : gitInfo(vcs.root);
  if (!info) return null;

  return {
    name: "vcs",
    priority: "normal",
    element: (
      <Canvas>
        <Header icon="git" title={info.repoName} subtitle={<Badge label={info.branch} color="accent" />} />
        <Col gap="sm">
          {info.conflicts ? (
            <List>
              <ListItem text="Conflicts" icon="warning" color="red" />
            </List>
          ) : null}
          {info.log.length > 0 ? <Separator /> : null}
          {info.log.length > 0 ? (
            <List>
              {info.log.map((l) => (
                <ListItem text={l.message} secondary={l.id} icon="circle" color="muted" />
              ))}
            </List>
          ) : null}
        </Col>
        <Timestamp />
      </Canvas>
    ),
  };
}
