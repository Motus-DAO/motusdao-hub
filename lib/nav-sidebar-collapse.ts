const STORAGE_KEY = 'motus-nav-section-collapsed-v1'

export type NavSectionId =
  | 'main'
  | 'practica'
  | 'finanzas'
  | 'aprender'
  | 'cuenta'

const SECTION_IDS: NavSectionId[] = [
  'main',
  'practica',
  'finanzas',
  'aprender',
  'cuenta',
]

export function navSectionIdFromTitle(title: string | null): NavSectionId {
  switch (title) {
    case 'Práctica':
      return 'practica'
    case 'Finanzas':
      return 'finanzas'
    case 'Aprender':
      return 'aprender'
    case 'Cuenta':
      return 'cuenta'
    default:
      return 'main'
  }
}

export function readNavSectionCollapsed(): Record<NavSectionId, boolean> {
  const defaults: Record<NavSectionId, boolean> = {
    main: false,
    practica: false,
    finanzas: false,
    aprender: false,
    cuenta: false,
  }
  if (typeof localStorage === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Record<NavSectionId, boolean>>
    for (const id of SECTION_IDS) {
      if (typeof parsed[id] === 'boolean') defaults[id] = parsed[id]
    }
    return defaults
  } catch {
    return defaults
  }
}

export function writeNavSectionCollapsed(state: Record<NavSectionId, boolean>) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}