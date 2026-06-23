/** Normalize a Motus Name Service label (lowercase, no .motus suffix). */
export function normalizeMotusName(raw: string): string {
  return raw.toLowerCase().replace(/\.motus$/i, '').replace(/[^a-z0-9-]/g, '')
}
