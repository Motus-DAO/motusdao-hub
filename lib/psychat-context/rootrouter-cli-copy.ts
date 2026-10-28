/** Copy-paste blocks for Psychat + RootRouter (see RootRouter repo packages/proxy/README.md). */

export function rootRouterProxyStartScript(hubOrigin: string): string {
  const origin = hubOrigin.replace(/\/$/, '')
  return `# Terminal — RootRouter proxy (Psychat memoria local)
# Requiere Node 20+. Primera vez: npm i -g rootrouter@beta  (opcional)

export ROOTROUTER_UPSTREAM_ORIGIN="${origin}"
export ROOTROUTER_STORE_PATH="$HOME/.rootrouter/psychat-store.json"
export ROOTROUTER_HOST=127.0.0.1
export PORT=8787

npx -p @rootrouter/proxy@beta rootrouter-proxy
# Alternativa desde clone Motus RootRouter: npm run proxy:start (mismas env)
`
}

export function rootRouterProxyHealthCheck(): string {
  return 'curl -s http://127.0.0.1:8787/healthz'
}

export function rootRouterInitCursorHint(projectSlug: string): string {
  return `# Opcional — indexar repo en Cursor con store aislado
npx rootrouter@beta init cursor --project-store --project-agent-id ${projectSlug}
`
}
