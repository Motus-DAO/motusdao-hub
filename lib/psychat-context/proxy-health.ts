export async function checkRootRouterProxyHealth(baseUrl: string, timeoutMs = 4000): Promise<boolean> {
  const root = baseUrl.replace(/\/$/, '')
  const controllers = [
    `${root}/health`,
    `${root}/v1/models`,
    `${root}/`,
  ]
  for (const url of controllers) {
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
