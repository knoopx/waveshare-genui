#!/usr/bin/env bun
/**
 * Tasks — live from Google Tasks via gog CLI.
 *
 * Usage: tasks.tsx [--list-id ID] [--max 8] [--show-completed] [--title "My Tasks"]
 */
import React from "react";
import { emit } from "../src/openui-emitter";
import { execSync } from "child_process";
import { Canvas, Header, Content, List, ListItem, Timestamp } from "../src/components";
const argv = process.argv.slice(2);
let listId = "";
let max = 8;
let showCompleted = false;
let title = "My Tasks";

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--list-id" && argv[i + 1]) listId = argv[++i];
  else if (argv[i] === "--max" && argv[i + 1]) max = parseInt(argv[++i]);
  else if (argv[i] === "--show-completed") showCompleted = true;
  else if (argv[i] === "--title" && argv[i + 1]) title = argv[++i];
}

function gog(args: string[]): string {
  return execSync(`gog ${args.join(" ")} -j --results-only --no-input`, { timeout: 15000 }).toString();
}

if (!listId) {
  const lists = JSON.parse(gog(["tasks", "lists", "list"]));
  listId = (Array.isArray(lists) ? lists[0]?.id : lists?.items?.[0]?.id) ?? "";
  if (!listId) throw new Error("No task lists found");
}

const gogArgs = ["tasks", "list", listId, "--max", String(max)];
if (showCompleted) gogArgs.push("--show-completed", "--show-hidden");

let parsed = JSON.parse(gog(gogArgs));
if (!Array.isArray(parsed)) parsed = parsed.tasks ?? parsed.items ?? [];

type Task = { title: string; detail: string; done: boolean };
const now = new Date();
const tasks: Task[] = [];

for (const t of parsed) {
  const done = t.status === "completed";
  let detail = t.notes ?? "";
  if (t.due) {
    const due = new Date(t.due);
    const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);
    if (diffDays < -1) detail = `${Math.abs(diffDays)}d overdue`;
    else if (diffDays === -1) detail = "Yesterday";
    else if (diffDays === 0) detail = "Today";
    else if (diffDays === 1) detail = "Tomorrow";
    else detail = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  tasks.push({ title: t.title ?? "(Untitled)", detail, done });
}

emit(
  <Canvas>
    <Header icon={"\uf0ae"} title={title} />
    <Content>
      <List>
        {tasks.map((t) => (
          <ListItem text={t.title} secondary={t.detail} icon={t.done ? "\uf058" : "\uf111"} />
        ))}
      </List>
    </Content>
    <Timestamp />
  </Canvas>,
);
