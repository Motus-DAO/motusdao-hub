/** Parse JSON bodies without Safari's opaque "did not match the expected pattern". */
export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text.trim()) {
    throw new Error(`Respuesta vacía del servidor (HTTP ${response.status}).`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 120)
    throw new Error(
      `El servidor no devolvió JSON (HTTP ${response.status}). ${snippet}`
    )
  }
}