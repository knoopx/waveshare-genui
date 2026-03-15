import { describe, expect, it } from "bun:test";
import React from "react";
import { Text, Alert, CodeBlock } from "./components/react/content";
import { Header } from "./components/react/layout";
import { KeyValue } from "./components/react/data";
import { ProgressBar } from "./components/react/viz";
import { parseOpenUILang } from "./openui-parser";
import { library } from "./library";
import { rasterize } from "./rasterizer";

function styleOf(node: any) {
  return node.props.style as Record<string, unknown>;
}

/** Walk the rendered tree to find all elements, allowing structural assertions. */
function flattenChildren(node: any): any[] {
  if (!node?.props?.children) return [];
  const kids = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
  return kids.filter(Boolean);
}

function findByStyle(root: any, pred: (s: Record<string, unknown>) => boolean): any {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node?.props) continue;
    if (node.props.style && pred(node.props.style)) return node;
    const kids = flattenChildren(node);
    stack.push(...kids);
  }
  return null;
}

describe("overflow handling", () => {
  it("wraps long Text content instead of overflowing horizontally", () => {
    const element = Text({ children: "A very long line", size: "md", weight: "normal", color: "default", align: "left" }) as React.ReactElement;

    expect(styleOf(element).whiteSpace).toBe("pre-wrap");
    expect(styleOf(element).overflowWrap).toBe("anywhere");
    expect(styleOf(element).width).toBe("100%");
  });

  it("lets Header title and subtitle clamp with multiline ellipsis styles", () => {
    const longSubtitle = "This subtitle is much longer than the available space";
    const element = Header({ icon: <span>⚠</span>, title: "Long title", subtitle: longSubtitle }) as any;

    // Find title span (has WebkitLineClamp)
    const title = findByStyle(element, (s) => s.WebkitLineClamp === 3 && s.fontWeight === 700);
    expect(title).toBeTruthy();
    expect(styleOf(title).overflowWrap).toBe("anywhere");
    expect(styleOf(title).textOverflow).toBe("ellipsis");
    expect(styleOf(title).maxHeight).toBe(`${3 * 1.2}em`);

    // Find subtitle span (has textAlign right)
    const subtitle = findByStyle(element, (s) => s.textAlign === "right");
    expect(subtitle).toBeTruthy();
    expect(styleOf(subtitle).textOverflow).toBe("ellipsis");
  });

  it("wraps long Alert titles and messages", () => {
    const element = Alert({ title: "Long alert title", message: "Long alert message", color: "yellow" }) as any;

    const title = findByStyle(element, (s) => s.fontWeight === 700 && s.fontSize === UI.alert.titleSize);
    const message = findByStyle(element, (s) => s.fontSize === UI.alert.messageSize);

    expect(title).toBeTruthy();
    expect(styleOf(title).overflowWrap).toBe("anywhere");
    expect(message).toBeTruthy();
    expect(styleOf(message).overflowWrap).toBe("anywhere");
  });

  it("breaks long CodeBlock tokens to stay inside the card", () => {
    const element = CodeBlock({ language: "typescript", codeString: "const extraordinarilyLongIdentifierName = foo.bar.baz();" }) as any;

    const code = findByStyle(element, (s) => s.fontFamily === UI.fontFamily.icon && s.fontSize === UI.codeBlock.codeSize);
    expect(code).toBeTruthy();
    expect(styleOf(code).overflowWrap).toBe("anywhere");
    expect(styleOf(code).wordBreak).toBe("break-word");
  });

  it("allows KeyValue values to wrap and shrink instead of spilling out", () => {
    const element = KeyValue({
      label: "Configuration label",
      value: "A very long value that should wrap instead of overflowing",
      secondary: "Secondary metadata",
      color: "accent",
    }) as any;

    const value = findByStyle(element, (s) => s.maxWidth === "45%" && s.textAlign === "right");
    expect(value).toBeTruthy();
    expect(styleOf(value).overflowWrap).toBe("anywhere");
    expect(styleOf(value).flexShrink).toBe(1);
  });

  it("lets ProgressBar label and display text wrap within the header row", () => {
    const element = ProgressBar({
      label: "A very long progress label",
      value: 42,
      max: 100,
      display: "42 items completed out of 100 total items",
      color: "green",
    }) as any;

    const label = findByStyle(element, (s) => s.fontSize === UI.progressBar.labelSize);
    const display = findByStyle(element, (s) => s.maxWidth === "40%");

    expect(label).toBeTruthy();
    expect(styleOf(label).overflowWrap).toBe("anywhere");
    expect(display).toBeTruthy();
    expect(styleOf(display).overflowWrap).toBe("anywhere");
  });

  it("rasterizes a long-content screen without throwing", async () => {
    const source = `root = Canvas([header, content, ts])
header = Header("warning", "Extremely long header title that should not overlap the subtitle area when content grows", "A very long subtitle that must stay contained")
content = Col([alert, code, kv, prog], "md")
alert = Alert("Alert title that is long enough to test wrapping", "This message is intentionally verbose so it can reveal overflow bugs in the alert component when content exceeds the comfortable size of the card.", "warning", "yellow")
code = CodeBlock("typescript", "const extraordinarilyLongIdentifierName = someFunctionCall(withAnArgumentThatIsTooLongToFitNormally, anotherArgument, thirdArgument);")
kv = KeyValue("Configuration label with a secondary explanation", "A very long value that should wrap inside the row instead of running off-screen", "Secondary metadata that should also remain readable", "accent")
prog = ProgressBar("Long progress label that may collide with the display string", 42, 100, "42 items completed out of 100 total items", "green")
ts = Timestamp()`;

    const { element, warnings } = parseOpenUILang(source, library);
    expect(warnings).toHaveLength(0);

    const image = await rasterize(element, { rotate: 0 });
    expect(image.byteLength).toBeGreaterThan(1000);
  });
});

// Import UI tokens for style assertions
import { UI } from "./tokens";
