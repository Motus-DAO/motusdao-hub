const CLABE_WEIGHTS = [3, 7, 1] as const

export const TRANSFER_REPORTED = 'patient_reported'
export const TRANSFER_CONFIRMED = 'psm_confirmed'
export const TRANSFER_REJECTED = 'psm_rejected'

export type TransferKind =
  | typeof TRANSFER_REPORTED
  | typeof TRANSFER_CONFIRMED
  | typeof TRANSFER_REJECTED

export type TransferState = 'none' | 'reported' | 'confirmed' | 'rejected'

export function clabeChecksum(first17: string): number {
  let sum = 0
  for (let index = 0; index < 17; index += 1) {
    const digit = Number(first17[index])
    sum += (digit * CLABE_WEIGHTS[index % 3]) % 10
  }
  return (10 - (sum % 10)) % 10
}

export function normalizeClabe(value: string): string {
  return value.replace(/\s+/g, '')
}

export function isValidClabe(value: string): boolean {
  const clabe = normalizeClabe(value)
  if (!/^\d{18}$/.test(clabe)) return false
  return clabeChecksum(clabe.slice(0, 17)) === Number(clabe[17])
}

export function formatClabe(value: string): string {
  const clabe = normalizeClabe(value)
  return clabe.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function parseMxnAmount(value: unknown): number | null {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null
  return amount
}

export function normalizeTransferReference(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const reference = value.trim().replace(/\s+/g, '')
  if (!/^[A-Za-z0-9]{4,40}$/.test(reference)) return null
  return reference.toUpperCase()
}

export type SpeiAccount = {
  beneficiaryName: string
  bankName: string
  clabe: string
}

export function parseSpeiAccount(
  body: unknown
): { ok: true; account: SpeiAccount } | { ok: false; error: string } {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const beneficiaryName = typeof record.beneficiaryName === 'string' ? record.beneficiaryName.trim() : ''
  const bankName = typeof record.bankName === 'string' ? record.bankName.trim() : ''
  const clabe = typeof record.clabe === 'string' ? normalizeClabe(record.clabe) : ''

  if (beneficiaryName.length < 2 || beneficiaryName.length > 120) {
    return { ok: false, error: 'Escribe el nombre del titular, como aparece en el banco.' }
  }
  if (bankName.length < 2 || bankName.length > 80) {
    return { ok: false, error: 'Escribe el nombre del banco.' }
  }
  if (!isValidClabe(clabe)) {
    return { ok: false, error: 'La CLABE debe tener 18 dígitos y un dígito verificador válido.' }
  }
  return { ok: true, account: { beneficiaryName, bankName, clabe } }
}

export function transferState(kinds: string[]): TransferState {
  const last = kinds[kinds.length - 1]
  if (last === TRANSFER_REPORTED) return 'reported'
  if (last === TRANSFER_CONFIRMED) return 'confirmed'
  if (last === TRANSFER_REJECTED) return 'rejected'
  return 'none'
}
