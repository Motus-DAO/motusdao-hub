import { mottyConfig } from "@/lib/motty/config";
import {
  DEFAULT_KNOWLEDGE_NAMESPACES,
  NamespaceNotAllowedError,
  assertPublicKnowledgeNamespace,
  type PublicKnowledgeNamespace,
} from "@/lib/motty/namespaces";

const PROTOCOL = "2025-03-26";
const MAX_CONTEXT_CHARS = 4000;

type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id?: number | string;
  result?: unknown;
};

type McpToolContent = { type: string; text?: string };

type McpCallResult = {
  content?: McpToolContent[];
  isError?: boolean;
};

type CachedSession = { id: string; ready: boolean };

let cached: CachedSession | null = null;

export type KnowledgeHit = {
  namespace: PublicKnowledgeNamespace;
  text: string;
};

export async function searchPublicKnowledge(input: {
  query: string;
  namespace?: string;
}): Promise<KnowledgeHit[]> {
  const query = input.query.trim().slice(0, 500);
  if (!query) {
    return [];
  }

  const namespaces = resolveNamespaces(input.namespace);
  const hits: KnowledgeHit[] = [];

  for (const namespace of namespaces) {
    const text = await callSearchKnowledge(query, namespace);
    if (text) hits.push({ namespace, text });
  }

  return hits;
}

function resolveNamespaces(requested?: string): PublicKnowledgeNamespace[] {
  if (!requested) {
    return [...DEFAULT_KNOWLEDGE_NAMESPACES];
  }
  return [assertPublicKnowledgeNamespace(requested)];
}

async function callSearchKnowledge(
  query: string,
  namespace: PublicKnowledgeNamespace,
): Promise<string> {
  const result = await mcpToolCall("search_knowledge", {
    query,
    namespace,
    limit: 3,
  });

  const text = (result.content ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim()
    .slice(0, MAX_CONTEXT_CHARS);

  if (result.isError || !text) return "";
  return text;
}

async function mcpToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<McpCallResult> {
  await ensureSession();
  try {
    return await invokeTool(name, args);
  } catch {
    cached = null;
    await ensureSession();
    return invokeTool(name, args);
  }
}

async function ensureSession(): Promise<void> {
  if (cached?.ready) return;

  const init = await mcpPost(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL,
        capabilities: {},
        clientInfo: { name: 'motty-hub-apd', version: '0.1.0' },
      },
    },
    cached?.id,
  );

  cached = { id: init.sessionId, ready: false };

  await mcpPost(
    { jsonrpc: "2.0", method: "notifications/initialized" },
    cached.id,
  );

  cached.ready = true;
}

async function invokeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<McpCallResult> {
  if (!cached?.id) {
    throw new Error("MCP session missing.");
  }

  const { payload } = await mcpPost(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name, arguments: args },
    },
    cached.id,
  );

  const body = payload as JsonRpcSuccess;
  if (!body || typeof body !== "object" || !("result" in body)) {
    throw new Error("MCP tool call failed.");
  }
  return (body.result ?? {}) as McpCallResult;
}

async function mcpPost(
  body: Record<string, unknown>,
  sessionId?: string,
): Promise<{ payload: unknown; sessionId: string }> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": PROTOCOL,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const response = await fetch(mottyConfig().mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const nextSession =
    response.headers.get("mcp-session-id") ?? sessionId ?? "";

  if (!response.ok && response.status !== 202) {
    throw new Error(`MCP HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 202 || !contentType) {
    return { payload: null, sessionId: nextSession };
  }

  const raw = await response.text();
  const payload = contentType.includes("text/event-stream")
    ? parseSseJson(raw)
    : raw
      ? JSON.parse(raw)
      : null;

  return { payload, sessionId: nextSession };
}

function parseSseJson(raw: string): unknown {
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    return JSON.parse(data);
  }
  return null;
}

export function formatKnowledgeForVisitor(hits: KnowledgeHit[]): string {
  const cleaned = hits
    .map((hit) => cleanKnowledgeText(hit.text))
    .filter(Boolean)
    .join("\n\n");
  return truncateText(cleaned, 700);
}

export function formatKnowledgeForModel(hits: KnowledgeHit[]): string {
  if (!hits.length) {
    return "No public MotusDAO knowledge matched this query.";
  }
  return hits
    .map((hit) => `## namespace:${hit.namespace}\n${hit.text}`)
    .join("\n\n")
    .slice(0, MAX_CONTEXT_CHARS);
}

function cleanKnowledgeText(text: string): string {
  return text
    .replace(/^Contexto verificado[^\n]*\n+/i, "")
    .replace(/\nFuentes:[\s\S]*$/i, "")
    .replace(/\[(?:brand|product)\][^\n]*\n/g, "")
    .replace(/^---\n/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

function truncateText(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
}

export { NamespaceNotAllowedError };
