import type { NextRequest } from 'next/server'
import { handleRootRouterUpstreamPost } from '@/lib/psychat-context/rootrouter-upstream'

export async function POST(req: NextRequest) {
  return handleRootRouterUpstreamPost(req)
}
