export const FOUNDING_DISMISS_KEY = 'motus-founding-waitlist-dismissed-v1'
export const FOUNDING_DRAFT_KEY = 'motus-founding-waitlist-draft-v1'

export type FoundingModalStep =
  | 'teaser'
  | 'role'
  | 'register'
  | 'wallet'
  | 'mns'
  | 'table'
  | 'done'

export type FoundingWaitlistRole = 'user' | 'psm'

export type FoundingDraft = {
  step: Exclude<FoundingModalStep, 'teaser' | 'done' | 'table' | 'role'>
  role: FoundingWaitlistRole
  displayName: string
  email: string
  optionalNote: string
  mnsLabel: string | null
  mnsTxHash: string | null
  updatedAt: string
}

export function foundingWaitlistAutoOpenSuppressed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('from') === 'founding-code') return true
  } catch {
    // ignore
  }
  return false
}

export function readFoundingDraft(): FoundingDraft | null {
  try {
    const raw = sessionStorage.getItem(FOUNDING_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FoundingDraft
    if (!parsed?.email || !parsed.displayName || !parsed.role) return null
    return parsed
  } catch {
    return null
  }
}

export function writeFoundingDraft(draft: FoundingDraft) {
  try {
    sessionStorage.setItem(FOUNDING_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // ignore
  }
}

export function clearFoundingDraft() {
  try {
    sessionStorage.removeItem(FOUNDING_DRAFT_KEY)
  } catch {
    // ignore
  }
}