import {
  NamespaceNotAllowedError,
  formatKnowledgeForModel,
  searchPublicKnowledge,
} from "@/lib/motty/mcp";
import { mottyConfig } from "@/lib/motty/config";
import {
  createEscrowForUserSession,
  getPaymentStatusForSession,
  getRampLinkForUser,
  getUpcomingSessionForUser,
  getWalletSnapshotForUser,
  quoteTherapy,
} from "@/lib/motty/payments";
import type { MottySession, ToolResult } from "@/lib/motty/types";

export const ALL_MOTTY_TOOL_NAMES = [
  "searchKnowledge",
  "getMyUpcomingSession",
  "quoteTherapyInWmxn",
  "getMyWalletBalance",
  "getMyPaymentStatus",
  "createTherapyEscrowForMySession",
  "getMyRipioRampLink",
] as const;

export type MottyToolName = (typeof ALL_MOTTY_TOOL_NAMES)[number];

/** Tools that only exist when the payments agent is enabled. */
export const MOTTY_PAYMENT_TOOL_NAMES: readonly MottyToolName[] = [
  "getMyUpcomingSession",
  "quoteTherapyInWmxn",
  "getMyWalletBalance",
  "getMyPaymentStatus",
  "createTherapyEscrowForMySession",
  "getMyRipioRampLink",
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

const NO_PARAMS: JsonSchema = { type: "object", properties: {} };

const SESSION_ID_PARAM: JsonSchema = {
  type: "object",
  properties: {
    sessionId: {
      type: "string",
      description: "Therapy session id returned by getMyUpcomingSession.",
    },
  },
  required: ["sessionId"],
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
  getMyUpcomingSession: {
    type: "function",
    function: {
      name: "getMyUpcomingSession",
      description:
        "Return the signed-in user's next therapy session: id, professional, start, listed price and the wMXN quote. Call this before answering anything about paying a session.",
      parameters: NO_PARAMS,
    },
  },
  quoteTherapyInWmxn: {
    type: "function",
    function: {
      name: "quoteTherapyInWmxn",
      description:
        "Quote the standard 45 USD therapy session in wMXN using the server-side rate. Never invent a rate or an amount.",
      parameters: NO_PARAMS,
    },
  },
  getMyWalletBalance: {
    type: "function",
    function: {
      name: "getMyWalletBalance",
      description:
        "Return the signed-in user's wMXN and CELO balance plus their wallet address.",
      parameters: NO_PARAMS,
    },
  },
  getMyPaymentStatus: {
    type: "function",
    function: {
      name: "getMyPaymentStatus",
      description:
        "Return the escrow status for one of the user's therapy sessions (waiting for deposit, funded, confirmed, released or refunded).",
      parameters: SESSION_ID_PARAM,
    },
  },
  createTherapyEscrowForMySession: {
    type: "function",
    function: {
      name: "createTherapyEscrowForMySession",
      description:
        "Create the on-chain escrow for the user's own session and return the payment link. Idempotent: a second call returns the same escrow. It does not move funds; the patient signs the deposit.",
      parameters: SESSION_ID_PARAM,
    },
  },
  getMyRipioRampLink: {
    type: "function",
    function: {
      name: "getMyRipioRampLink",
      description:
        "Return the Ripio on-ramp URL prefilled with the user's wallet, country and token, optionally with an amount in MXN/wMXN.",
      parameters: {
        type: "object",
        properties: {
          amountWmxn: {
            type: "string",
            description: "Optional amount in MXN (1 wMXN = 1 MXN).",
          },
        },
      },
    },
  },
};

export function mottyPaymentsEnabled(): boolean {
  return mottyConfig().paymentsEnabled;
}

export function enabledMottyToolNames(): MottyToolName[] {
  const payments = mottyPaymentsEnabled();
  return ALL_MOTTY_TOOL_NAMES.filter(
    (name) => payments || !MOTTY_PAYMENT_TOOL_NAMES.includes(name)
  );
}

export function enabledToolSchemas(): OpenAiTool[] {
  return enabledMottyToolNames().map((name) => TOOL_SCHEMAS[name]);
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

  if (!enabledMottyToolNames().includes(name)) {
    return {
      session,
      result: { ok: false, tool: name, error: "tool_not_enabled" },
    };
  }

  const args = isRecord(rawArgs) ? rawArgs : {};

  switch (name) {
    case "searchKnowledge":
      return { session, result: await runSearchKnowledge(args) };
    case "getMyUpcomingSession":
      return {
        session,
        result: await runHelper(name, () => getUpcomingSessionForUser(session.userId)),
      };
    case "quoteTherapyInWmxn":
      return { session, result: { ok: true, tool: name, data: quoteTherapy() } };
    case "getMyWalletBalance":
      return {
        session,
        result: await runHelper(name, () => getWalletSnapshotForUser(session.userId)),
      };
    case "getMyPaymentStatus": {
      const sessionId = getString(args, "sessionId");
      if (!sessionId) {
        return { session, result: { ok: false, tool: name, error: "session_id_required" } };
      }
      return {
        session,
        result: await runHelper(name, () =>
          getPaymentStatusForSession(session.userId, sessionId)
        ),
      };
    }
    case "createTherapyEscrowForMySession": {
      const sessionId = getString(args, "sessionId");
      if (!sessionId) {
        return { session, result: { ok: false, tool: name, error: "session_id_required" } };
      }
      return {
        session,
        result: await runHelper(name, () =>
          createEscrowForUserSession(session.userId, sessionId)
        ),
      };
    }
    case "getMyRipioRampLink": {
      const amount = getString(args, "amountWmxn");
      return {
        session,
        result: await runHelper(name, () => getRampLinkForUser(session.userId, amount)),
      };
    }
    default:
      return {
        session,
        result: { ok: false, tool: name, error: "tool_unknown" },
      };
  }
}

async function runHelper(
  tool: string,
  run: () => Promise<unknown>,
): Promise<ToolResult> {
  try {
    const data = await run();
    if (isRecord(data) && data.ok === false) {
      return { ok: false, tool, error: String(data.error || "tool_failed") };
    }
    return { ok: true, tool, data };
  } catch (error) {
    return {
      ok: false,
      tool,
      error: error instanceof Error ? error.message : "tool_failed",
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

function getString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isMottyToolName(name: string): name is MottyToolName {
  return (ALL_MOTTY_TOOL_NAMES as readonly string[]).includes(name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
