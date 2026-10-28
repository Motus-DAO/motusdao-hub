/** Copy-paste blocks for Psychat + RootRouter (@rootrouter/proxy on npm, tag beta). */

export function rootRouterProxyStartScript(hubOrigin: string): string {
  const origin = hubOrigin.replace(/\/$/, '')
  return `export ROOTROUTER_UPSTREAM_ORIGIN="${origin}"
export ROOTROUTER_STORE_PATH="$HOME/.rootrouter/psychat-store.json"
export ROOTROUTER_HOST=127.0.0.1
export PORT=8787
npx -p @rootrouter/proxy@beta rootrouter-proxy`
}

export function rootRouterProxyHealthCheck(): string {
  return 'curl -s http://127.0.0.1:8787/healthz'
}

export function rootRouterInitCursorHint(projectSlug: string): string {
  return `npx rootrouter@beta init cursor --project-store --project-agent-id ${projectSlug}`
}
