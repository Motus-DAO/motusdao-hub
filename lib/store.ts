import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type AccentColor,
  type MatrixColor,
  migratePersistedAccentColor,
} from '@/lib/accent-color'

export type UserRole = 'usuario' | 'psm' | 'admin'
export type { AccentColor, MatrixColor }

interface UIState {
  // Role management
  role: UserRole
  setRole: (role: UserRole) => void
  /** True when the DB user can open admin surfaces while role stays psm/usuario */
  isPlatformAdmin: boolean
  setIsPlatformAdmin: (value: boolean) => void
  
  // Sidebar state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  
  // Theme state
  theme: 'light' | 'dark' | 'matrix'
  setTheme: (theme: 'light' | 'dark' | 'matrix') => void
  toggleTheme: () => void
  
  /**
   * Shared accent for light/dark/matrix. `null` means theme default:
   * pink in light/dark, green in matrix (until the user picks a color).
   */
  accentColor: AccentColor | null
  setAccentColor: (color: AccentColor) => void
  /** @deprecated Use setAccentColor */
  setMatrixColor: (color: MatrixColor) => void
  
  // Note: Authentication state is now handled by Privy directly
  // No need for mock auth state in the store
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Role management
      role: 'usuario',
      setRole: (role) => set({ role }),
      isPlatformAdmin: false,
      setIsPlatformAdmin: (isPlatformAdmin) => set({ isPlatformAdmin }),
      
      // Sidebar state
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // Theme state
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'matrix' : 'light'
      })),
      
      accentColor: null,
      setAccentColor: (color) => set({ accentColor: color }),
      setMatrixColor: (color) => set({ accentColor: color }),
      
      // Authentication is now handled by Privy - no mock state needed
    }),
    {
      name: 'motusdao-ui-storage',
      version: 1,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Record<string, unknown>
        if (version < 1) {
          return {
            ...state,
            accentColor: migratePersistedAccentColor(state.matrixColor),
          }
        }
        return state
      },
      partialize: (state) => ({
        role: state.role,
        isPlatformAdmin: state.isPlatformAdmin,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        accentColor: state.accentColor,
      }),
    }
  )
)

export type NavItem = { name: string; href: string; icon: string }
export type NavGroup = { title: string | null; items: NavItem[] }

/**
 * Navigation grouped by domain: practice (clinical), finance, learn, account.
 *
 * URLs stay where they are on purpose. `/cobros/*` is pinned by the six Stripe
 * Site links (`https://app.motusdao.org/cobros/...`); moving it breaks live
 * AccountSessions and AccountLinks. The finance hub links, it does not rewrite.
 */
export const getNavigationGroups = (role: UserRole): NavGroup[] => {
  const practice: NavItem[] = [
    { name: 'Psychat', href: '/psychat', icon: 'Bot' },
    ...(role === 'usuario'
      ? ([{ name: 'Psicoterapia', href: '/psicoterapia', icon: 'Heart' }] as NavItem[])
      : ([
          { name: 'Mis usuarios', href: '/mis-usuarios', icon: 'Users' },
          { name: 'Disponibilidad', href: '/disponibilidad', icon: 'Calendar' },
          { name: 'Supervisión', href: '/supervision', icon: 'Eye' },
        ] as NavItem[])),
    { name: 'Bitácora', href: '/bitacora', icon: 'BookOpen' },
    { name: 'Videochat', href: '/videochat', icon: 'Video' },
  ]

  const finance: NavItem[] = [
    { name: 'Resumen', href: '/finanzas', icon: 'Wallet' },
    { name: 'Wallet', href: '/pagos', icon: 'Landmark' },
    ...(role === 'usuario'
      ? ([] as NavItem[])
      : ([
          { name: 'Cobros', href: '/cobros', icon: 'CreditCard' },
          { name: 'Depósitos', href: '/finanzas/depositos', icon: 'Landmark' },
          { name: 'Sesiones', href: '/pagos/sesiones', icon: 'Calendar' },
        ] as NavItem[])),
  ]

  return [
    { title: null, items: [{ name: 'Inicio', href: '/', icon: 'Home' }] },
    { title: 'Práctica', items: practice },
    { title: 'Finanzas', items: finance },
    {
      title: 'Aprender',
      items: [{ name: 'Academia', href: '/academia', icon: 'GraduationCap' }],
    },
    { title: 'Cuenta', items: [{ name: 'Perfil', href: '/perfil', icon: 'User' }] },
  ]
}

/** Flat list for callers that do not render group headers. */
export const getNavigationItems = (role: UserRole): NavItem[] =>
  getNavigationGroups(role).flatMap((group) => group.items)
