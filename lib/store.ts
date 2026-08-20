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
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        accentColor: state.accentColor,
      }),
    }
  )
)

// Navigation items based on role
export const getNavigationItems = (role: UserRole) => {
  const baseItems = [
    { name: 'Inicio', href: '/', icon: 'Home' },
    { name: 'MotusAI', href: '/motusai', icon: 'Bot' },
    { name: 'Academia', href: '/academia', icon: 'GraduationCap' },
    { name: 'Pagos', href: '/pagos', icon: 'CreditCard' },
    { name: 'Videochat', href: '/videochat', icon: 'Video' },
    { name: 'Bitácora', href: '/bitacora', icon: 'BookOpen' },
    { name: 'Perfil', href: '/perfil', icon: 'User' },
  ]

  if (role === 'usuario') {
    return [
      ...baseItems.slice(0, 2),
      { name: 'Psicoterapia', href: '/psicoterapia', icon: 'Heart' },
      ...baseItems.slice(2),
    ]
  } else {
    return [
      ...baseItems.slice(0, 2),
      { name: 'Mis usuarios', href: '/mis-usuarios', icon: 'Users' },
      { name: 'Disponibilidad', href: '/disponibilidad', icon: 'Calendar' },
      { name: 'Supervisión', href: '/supervision', icon: 'Eye' },
      ...baseItems.slice(2),
    ]
  }
}
