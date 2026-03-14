import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { library, promptOptions } from "../../../../genui/src/library.ts";

const PRIORITIES = ["low", "normal", "high"] as const;
const DESCRIPTION = `Render openui-lang to the 720×720 display.\n\n${library.prompt(promptOptions)}`;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export default function waveshareGenuiExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "genui",
    label: "Display",
    description: DESCRIPTION,
    parameters: Type.Object({
      source: Type.String({
        description:
          "openui-lang source text. Must contain `root = Canvas(...)` as entry point.",
      }),
      priority: Type.Optional(
        StringEnum([...PRIORITIES], {
          description: "Frame priority (default: normal)",
        }),
      ),
    }),

    async execute(_toolCallId, params) {
      const { source, priority } = params as {
        source: string;
        priority?: (typeof PRIORITIES)[number];
      };

      const priorityArgs = priority && priority !== "normal" ? ` --priority ${priority}` : "";
      const command = `printf '%s' ${shellQuote(source)} | waveshare-genui -${priorityArgs}`;
      const result = await pi.exec("sh", ["-c", command]);

      if (result.code !== 0) {
        throw new Error(result.stderr || result.stdout || "waveshare-genui failed");
      }

      return {
        content: [],
        details: { exitCode: result.code },
      };
    },
  });
}
