/**
 * OpenUI Lang → React element pipeline.
 *
 * Parses openui-lang text into a component tree and converts it
 * to React elements using the library's component renderers.
 */

import React from "react";
import { createParser } from "@openuidev/react-lang";
import type { Library } from "@openuidev/react-lang";

export interface ParsedUI {
  element: React.ReactElement;
  warnings: string[];
}

/**
 * Convert an ElementNode tree to React nodes using library component renderers.
 */
function elementToReact(value: unknown, library: Library): React.ReactNode {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map((v, i) => {
      const node = elementToReact(v, library);
      if (React.isValidElement(node)) return React.cloneElement(node, { key: i });
      return node;
    });
  }

  if (typeof value === "object" && "type" in value && (value as Record<string, unknown>).type === "element") {
    const node = value as unknown as { typeName: string; props: Record<string, unknown> };
    const def = library.components[node.typeName];
    if (!def) return null;
    const Comp = def.component;
    const renderNode = (v: unknown) => elementToReact(v, library);
    return React.createElement(Comp, { props: node.props, renderNode });
  }

  return null;
}

/**
 * Parse openui-lang text and return a React element tree.
 *
 * Throws on parse failure (no root, validation errors).
 * Returns warnings for non-fatal issues (unresolved references).
 */
export function parseOpenUILang(source: string, library: Library): ParsedUI {
  const parser = createParser(library.toJSONSchema());
  const result = parser.parse(source.trim());

  if (!result.root) {
    const errors: string[] = [];
    if (result.meta.unresolved.length) {
      errors.push(`Unresolved references: ${result.meta.unresolved.join(", ")}`);
    }
    for (const e of result.meta.validationErrors) {
      errors.push(`${e.component}${e.path}: ${e.message}`);
    }
    throw new Error(`Parse error: no root element\n${errors.join("\n")}`);
  }

  const warnings: string[] = [];
  if (result.meta.unresolved.length) {
    warnings.push(`Unresolved references: ${result.meta.unresolved.join(", ")}`);
  }

  const element = elementToReact(result.root, library) as React.ReactElement;
  return { element, warnings };
}
