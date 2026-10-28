import type { Role } from '@prisma/client'

export type AdminDbRow = {
  role: Role
  isPlatformAdmin: boolean
}

export function userHasAdminPrivileges(user: AdminDbRow | null | undefined): boolean {
  if (!user) return false
  return user.role === 'admin' || user.isPlatformAdmin === true
}
