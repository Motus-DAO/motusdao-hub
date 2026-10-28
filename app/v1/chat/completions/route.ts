import type { NextRequest } from 'next/server'
import { handleRootRouterUpstreamPost } from '@/lib/psychat-context/rootrouter-upstream'

/** Alias path so @rootrouter/proxy can forward `/v1/chat/completions` unchanged. */
export async function POST(req: NextRequest) {
  return handleRootRouterUpstreamPost(req)
}
