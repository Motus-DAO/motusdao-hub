/** Copy-paste blocks for Psychat + RootRouter (@rootrouter/proxy on npm, tag beta). */

import { parseLocalProxyPort } from '@/lib/psychat-context/proxy-port'

export function rootRouterProxyStartScript(hubOrigin: string, localProxyUrl?: string): string {
  const origin = hubOrigin.replace(/\/$/, '')
  const port = parseLocalProxyPort(localProxyUrl ?? '')
  return `export ROOTROUTER_UPSTREAM_ORIGIN="${origin}"
export ROOTROUTER_STORE_PATH="$HOME/.rootrouter/psychat-store.json"
export ROOTROUTER_HOST=127.0.0.1
export PORT=${port}
npx -p @rootrouter/proxy@beta rootrouter-proxy`
}

export function rootRouterProxyHealthCheck(localProxyUrl?: string): string {
  const port = parseLocalProxyPort(localProxyUrl ?? '')
  return `curl -s http://127.0.0.1:${port}/healthz`
}

export function rootRouterInitCursorHint(projectSlug: string): string {
  return `npx rootrouter@beta init cursor --project-store --project-agent-id ${projectSlug}`
}
