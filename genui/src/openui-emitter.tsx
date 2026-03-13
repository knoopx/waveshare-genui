/**
 * JSX → openui-lang emitter.
 *
 * Converts a React element tree into openui-lang text by matching component
 * references against a Library's zod schema key order for positional args.
 *
 * Usage:
 *   import { emit } from "./openui-emitter";
 *   emit(<Canvas><Text content="hi" /></Canvas>);
 */

import React from "react";
import type { ReactElement } from "react";
import type { Library } from "@openuidev/react-lang";
import { library } from "./library";

// ─── Types ──────────────────────────────────────────────────────────────

type Node = { typeName: string; args: Arg[] };
type Arg = string | number | boolean | null | Arg[] | Node;
type Statement = { id: string; text: string };

function isNode(a: unknown): a is Node {
  return typeof a === "object" && a !== null && "typeName" in a && "args" in a;
}

// ─── Factory ────────────────────────────────────────────────────────────

/** Quote a string for openui-lang, escaping PUA codepoints (Nerd Font icons) as \\uXXXX. */
function quoteString(s: string): string {
  // The openui-lang parser interprets \uXXXX inside quoted strings as Unicode escapes.
  // PUA chars (Nerd Font icons) must be emitted as \uXXXX so the parser can decode them.
  let out = '"';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xe000 && code <= 0xf8ff) {
      out += `\\u${code.toString(16).padStart(4, "0")}`;
    } else if (ch === '"') {
      out += '\\"';
    } else if (ch === "\\") {
      out += "\\\\";
    } else if (ch === "\n") {
      out += "\\n";
    } else {
      out += ch;
    }
  }
  return out + '"';
}

function createEmitter(library: Library) {
  const propOrder: Record<string, string[]> = {};
  const componentMap = new Map<unknown, string>();

  for (const [name, def] of Object.entries(library.components)) {
    propOrder[name] = Object.keys((def as any).props.shape);
    componentMap.set(def, name);
    componentMap.set((def as any).component, name);
  }

  function resolveTypeName(type: unknown): string {
    if (typeof type === "string") return type;
    return componentMap.get(type) ?? "";
  }

  function buildNode(el: ReactElement): Node {
    const typeName = resolveTypeName(el.type);
    if (!typeName) throw new Error(`Unknown component: ${el.type}`);

    const order = propOrder[typeName];
    if (!order) throw new Error(`"${typeName}" not in library`);

    const props = (el.props ?? {}) as Record<string, unknown>;
    const resolved: Record<string, unknown> = { ...props };
    delete resolved.children;

    // Merge JSX children into the schema's child slot
    const childSlot = order.find((k) => k === "children" || k === "items" || k === "columns");
    if (props.children != null && childSlot) {
      const kids = Array.isArray(props.children) ? props.children : [props.children];
      resolved[childSlot] = kids;
    }

    // Positional args, trim trailing omitted
    let lastIdx = -1;
    for (let i = 0; i < order.length; i++) {
      if (resolved[order[i]] != null) lastIdx = i;
    }

    const args: Arg[] = [];
    for (let i = 0; i <= lastIdx; i++) {
      args.push(toArg(resolved[order[i]]));
    }

    return { typeName, args };
  }

  function toArg(value: unknown): Arg {
    if (value == null) return null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    if (React.isValidElement(value)) return buildNode(value);
    if (Array.isArray(value)) return value.map(toArg);
    return null;
  }

  function flatten(node: Node): Statement[] {
    const stmts: Statement[] = [];
    const counters = new Map<string, number>();

    function nextId(typeName: string): string {
      const base = typeName.toLowerCase();
      const n = counters.get(base) ?? 0;
      counters.set(base, n + 1);
      return n === 0 ? base : `${base}${n + 1}`;
    }

    function argToString(a: Arg): string {
      if (a === null) return "null";
      if (typeof a === "string") return quoteString(a);
      if (typeof a === "number") return String(a);
      if (typeof a === "boolean") return String(a);
      if (Array.isArray(a)) {
        const hasNodes = a.some(isNode);
        if (hasNodes) {
          const ids = a.map((x) => (isNode(x) ? visit(x) : argToString(x)));
          return `[${ids.join(", ")}]`;
        }
        return `[${a.map(argToString).join(", ")}]`;
      }
      if (isNode(a)) return visit(a);
      return "null";
    }

    function visit(n: Node): string {
      const argStrs = n.args.map(argToString);
      const rootName = library.root;
      const id = rootName && n.typeName === rootName ? "root" : nextId(n.typeName);
      const expr = argStrs.length > 0 ? `${n.typeName}(${argStrs.join(", ")})` : `${n.typeName}()`;
      stmts.push({ id, text: expr });
      return id;
    }

    visit(node);
    stmts.reverse();
    return stmts;
  }

  /**
   * Convert a JSX tree to openui-lang text.
   */
  function toOpenUILang(rootElement: ReactElement): string {
    const tree = buildNode(rootElement);
    const stmts = flatten(tree);
    return stmts.map((s) => `${s.id} = ${s.text}`).join("\n");
  }

  /**
   * Print a JSX tree as openui-lang to stdout.
   */
  function emit(rootElement: ReactElement): void {
    process.stdout.write(`${toOpenUILang(rootElement)}\n`);
  }

  return { emit, toOpenUILang };
}

// ─── Pre-bound exports ──────────────────────────────────────────────────

const emitter = createEmitter(library);

/** Print a JSX tree as openui-lang to stdout. */
export const emit = emitter.emit;

/** Convert a JSX tree to openui-lang text. */
export const toOpenUILang = emitter.toOpenUILang;
