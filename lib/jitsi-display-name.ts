import { prisma } from '@/lib/prisma'
import { normalizeMotusName } from '@/lib/mns-utils'

const JITSI_DISPLAY_NAME_MAX = 48

function truncateDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, JITSI_DISPLAY_NAME_MAX)
}

/**
 * Resolves the name shown in Jitsi from Hub profile data (not wallet address).
 */
export async function resolveJitsiDisplayName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      email: true,
      motusName: true,
      profile: {
        select: { nombre: true, apellido: true },
      },
    },
  })

  if (!user) return 'Usuario'

  const fullName = [user.profile?.nombre, user.profile?.apellido]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim()

  if (fullName) {
    return truncateDisplayName(fullName)
  }

  const motusLabel = user.motusName
    ? normalizeMotusName(user.motusName)
    : null
  if (motusLabel) {
    return truncateDisplayName(motusLabel)
  }

  if (user.email) {
    const local = user.email.split('@')[0]?.trim()
    if (local) return truncateDisplayName(local)
  }

  return 'Usuario'
}
