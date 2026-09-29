/**
 * Public Motty may only query these Motus Knowledge MCP namespaces.
 * Enforcement is server-side: the model cannot opt into internal corpora.
 */
export const PUBLIC_KNOWLEDGE_NAMESPACES = ["brand", "product"] as const;

export type PublicKnowledgeNamespace =
  (typeof PUBLIC_KNOWLEDGE_NAMESPACES)[number];

const PUBLIC_SET = new Set<string>(PUBLIC_KNOWLEDGE_NAMESPACES);

export const DEFAULT_KNOWLEDGE_NAMESPACES: readonly PublicKnowledgeNamespace[] =
  PUBLIC_KNOWLEDGE_NAMESPACES;

export function isPublicKnowledgeNamespace(
  value: string,
): value is PublicKnowledgeNamespace {
  return PUBLIC_SET.has(value);
}

export function assertPublicKnowledgeNamespace(
  value: string,
): PublicKnowledgeNamespace {
  if (!isPublicKnowledgeNamespace(value)) {
    throw new NamespaceNotAllowedError(value);
  }
  return value;
}

export class NamespaceNotAllowedError extends Error {
  readonly namespace: string;

  constructor(namespace: string) {
    super(`Motty cannot query namespace "${namespace}".`);
    this.name = "NamespaceNotAllowedError";
    this.namespace = namespace;
  }
}
