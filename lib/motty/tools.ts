import {
  NamespaceNotAllowedError,
  formatKnowledgeForModel,
  searchPublicKnowledge,
} from "@/lib/motty/mcp";
import type { MottySession, ToolResult } from "@/lib/motty/types";

export const ALL_MOTTY_TOOL_NAMES = ["searchKnowledge"] as const;

export type MottyToolName = (typeof ALL_MOTTY_TOOL_NAMES)[number];

export const PUBLIC_MOTTY_ENABLED_TOOLS: readonly MottyToolName[] = [
  "searchKnowledge",
];

type JsonSchema = Record<string, unknown>;

type OpenAiTool = {
  type: "function";
  function: {
    name: MottyToolName;
    description: string;
    parameters: JsonSchema;
  };
};

const TOOL_SCHEMAS: Record<MottyToolName, OpenAiTool> = {
  searchKnowledge: {
    type: "function",
    function: {
      name: "searchKnowledge",
      description:
        "Search public MotusDAO knowledge (brand and product only) via Motus Knowledge MCP. Use before answering factual questions about MotusDAO, PSM, pricing, or product capabilities not listed in your system prompt.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural-language query.",
          },
          namespace: {
            type: "string",
            enum: ["brand", "product"],
            description:
              "Optional public namespace. Internal namespaces are rejected server-side.",
          },
        },
        required: ["query"],
      },
    },
  },
};

export function enabledToolSchemas(): OpenAiTool[] {
  return PUBLIC_MOTTY_ENABLED_TOOLS.map((name) => TOOL_SCHEMAS[name]);
}

export async function executeMottyTool(
  name: string,
  rawArgs: unknown,
  session: MottySession,
): Promise<{ result: ToolResult; session: MottySession }> {
  if (!isMottyToolName(name)) {
    return {
      session,
      result: { ok: false, tool: name, error: "tool_unknown" },
    };
  }

  if (!PUBLIC_MOTTY_ENABLED_TOOLS.includes(name)) {
    return {
      session,
      result: { ok: false, tool: name, error: "tool_not_enabled" },
    };
  }

  const args = isRecord(rawArgs) ? rawArgs : {};

  switch (name) {
    case "searchKnowledge":
      return { session, result: await runSearchKnowledge(args) };
    default:
      return {
        session,
        result: { ok: false, tool: name, error: "tool_unknown" },
      };
  }
}

async function runSearchKnowledge(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const query = typeof args.query === "string" ? args.query : "";
  const namespace = typeof args.namespace === "string" ? args.namespace : undefined;

  try {
    const hits = await searchPublicKnowledge({ query, namespace });
    return {
      ok: true,
      tool: "searchKnowledge",
      data: {
        namespaces: hits.map((hit) => hit.namespace),
        context: formatKnowledgeForModel(hits),
      },
    };
  } catch (error) {
    if (error instanceof NamespaceNotAllowedError) {
      return {
        ok: false,
        tool: "searchKnowledge",
        error: `namespace_not_allowed:${error.namespace}`,
      };
    }
    return {
      ok: false,
      tool: "searchKnowledge",
      error: "knowledge_unavailable",
    };
  }
}

function isMottyToolName(name: string): name is MottyToolName {
  return (ALL_MOTTY_TOOL_NAMES as readonly string[]).includes(name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
