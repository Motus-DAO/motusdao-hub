export async function checkRootRouterProxyHealth(baseUrl: string, timeoutMs = 4000): Promise<boolean> {
  const root = baseUrl.replace(/\/$/, '')
  const paths = [`${root}/healthz`, `${root}/health`, `${root}/v1/models`]
  for (const url of paths) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.ok || res.status === 401 || res.status === 404) {
        return true
      }
    } catch {
      // try next
    }
  }
  return false
}
