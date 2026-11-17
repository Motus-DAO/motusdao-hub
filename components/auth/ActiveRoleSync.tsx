'use client'

import { useEffect } from 'react'
import { authFetch } from '@/lib/auth/client'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { useUIStore, type UserRole } from '@/lib/store'

type ActiveRoleResponse = {
  activeRole?: UserRole
  allowedRoles?: UserRole[]
  isPlatformAdmin?: boolean
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'usuario' || value === 'psm' || value === 'admin'
}

/**
 * The menu and the PSM/admin surfaces depend on the *server* session, not on
 * the wallet SDK being connected. WaaP auto-connect can fail or stay idle on
 * mobile; when it did, the persisted client role won and a PSM saw the patient
 * menu (no Disponibilidad). This sync only needs the signed session cookie.
 */
export function ActiveRoleSync() {
  const setRole = useUIStore((state) => state.setRole)
  const setAllowedRoles = useUIStore((state) => state.setAllowedRoles)
  const setIsPlatformAdmin = useUIStore((state) => state.setIsPlatformAdmin)
  const { sessionState } = useSiweSession()

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      try {
        const response = await authFetch('/api/auth/active-role', {
          cache: 'no-store',
        })
        if (!response.ok) return

        const data = (await response.json()) as ActiveRoleResponse
        if (cancelled) return

        setAllowedRoles(
          Array.isArray(data.allowedRoles)
            ? data.allowedRoles.filter(isUserRole)
            : []
        )
        setIsPlatformAdmin(data.isPlatformAdmin === true)
        if (isUserRole(data.activeRole)) setRole(data.activeRole)
      } catch (error) {
        // Offline or a transient 5xx: keep the last known role, the server
        // guards still decide what is accessible.
        console.error('[ActiveRoleSync] No se pudo sincronizar el rol:', error)
      }
    }

    void sync()

    return () => {
      cancelled = true
    }
  }, [sessionState, setRole, setAllowedRoles, setIsPlatformAdmin])

  return null
}
