import { createClient } from '@supabase/supabase-js';
import { getEmbeddingClient, getEmbeddingModel, hasEmbeddingKey } from '@/lib/ai-client';

export interface KnowledgeHit {
  sourcePath: string;
  title: string;
  namespace: string;
  similarity: number;
  content: string;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isKnowledgeRagEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      hasEmbeddingKey()
  );
}

export async function searchMotusKnowledge(
  query: string,
  options?: { namespace?: string | null; limit?: number }
): Promise<KnowledgeHit[]> {
  if (!isKnowledgeRagEnabled()) return [];

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const client = getEmbeddingClient();
  const embedding = await client.embeddings.create({
    model: getEmbeddingModel(),
    input: query,
  });

  const vector = embedding.data[0]?.embedding;
  if (!vector) return [];

  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: vector,
    match_count: options?.limit ?? 5,
    filter_namespace: options?.namespace ?? null,
  });

  if (error) {
    console.error('[motus-knowledge] search error:', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    sourcePath: String(row.source_path),
    title: String(row.title),
    namespace: String(row.namespace),
    similarity: Number(row.similarity ?? 0),
    content: String(row.content),
  }));
}

export function toContextSnippets(hits: KnowledgeHit[]): string[] {
  return hits.map(
    (h) =>
      `[${h.namespace}] ${h.title} (${h.sourcePath}, sim=${h.similarity.toFixed(3)})\n${h.content}`
  );
}

export async function retrieveMotusContext(userQuery: string): Promise<{
  snippets: string[];
  sources: KnowledgeHit[];
}> {
  const trimmed = userQuery.trim();
  if (!trimmed) return { snippets: [], sources: [] };

  const [clinical, product, journey] = await Promise.all([
    searchMotusKnowledge(trimmed, { namespace: 'clinical-policy', limit: 2 }),
    searchMotusKnowledge(trimmed, { namespace: 'product', limit: 2 }),
    searchMotusKnowledge(trimmed, { namespace: null, limit: 3 }),
  ]);

  const merged = new Map<string, KnowledgeHit>();
  for (const hit of [...clinical, ...product, ...journey]) {
    const key = `${hit.sourcePath}:${hit.content.slice(0, 80)}`;
    if (!merged.has(key) || (merged.get(key)?.similarity ?? 0) < hit.similarity) {
      merged.set(key, hit);
    }
  }

  const sources = [...merged.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 6);

  return {
    snippets: toContextSnippets(sources),
    sources,
  };
}
