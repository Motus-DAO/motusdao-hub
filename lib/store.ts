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
  /** Roles the signed-in account may hold, per the server. Not persisted. */
  allowedRoles: UserRole[]
  setAllowedRoles: (roles: UserRole[]) => void
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
      allowedRoles: [],
      setAllowedRoles: (allowedRoles) => set({ allowedRoles }),
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

// Navigation lives in a dependency-free module so it can be unit-tested
// without booting the persisted Zustand store.
export {
  getNavigationGroups,
  getNavigationItems,
} from './navigation'
export type { NavGroup, NavItem, NavOptions } from './navigation'
