import { PrismaClient, type Role } from '@prisma/client'
import { getAddress, isAddress } from 'viem'

const prisma = new PrismaClient()

/**
 * Grant dual role: clinical PSM + platform admin.
 * - Sets role=psm (so /disponibilidad and Jitsi PSM flows work)
 * - Sets isPlatformAdmin=true (so /admin APIs still work)
 * - Ensures a minimal PSMProfile exists
 *
 * Usage:
 *   npx tsx scripts/grant-dual-role.ts <email-or-0xEoa>
 *   npx tsx scripts/grant-dual-role.ts benjabuzali@gmail.com
 */
async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.log('Usage: npx tsx scripts/grant-dual-role.ts <email-or-0xEoa>')
    process.exit(1)
  }

  const where = isAddress(arg)
    ? {
        OR: [
          { eoaAddress: { equals: getAddress(arg), mode: 'insensitive' as const } },
          { smartWalletAddress: { equals: getAddress(arg), mode: 'insensitive' as const } },
        ],
      }
    : { email: { equals: arg, mode: 'insensitive' as const } }

  const user = await prisma.user.findFirst({
    where: { ...where, deletedAt: null },
    include: {
      profile: true,
      psm: true,
    },
  })

  if (!user) {
    console.error(`No user found for: ${arg}`)
    process.exit(1)
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'psm' satisfies Role,
      isPlatformAdmin: true,
      onboardingStatus: user.onboardingStatus === 'started' ? 'active' : user.onboardingStatus,
      registrationCompleted: true,
    },
  })

  let psm = user.psm
  if (!psm) {
    const slugBase = (
      user.profile?.nombre ||
      user.email.split('@')[0] ||
      'psm'
    )
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)

    psm = await prisma.pSMProfile.create({
      data: {
        userId: user.id,
        slug: `${slugBase || 'psm'}-dual-${user.id.slice(-6)}`,
        cedulaProfesional: 'DUAL-ADMIN-PENDING',
        formacionAcademica: 'Pendiente — cuenta dual admin/PSM',
        experienciaAnios: 0,
        especialidades: ['general'],
        biografia: 'Cuenta de prueba con rol dual (admin + PSM).',
        verificationStatus: 'approved',
        isAcceptingPatients: true,
        verifiedAt: new Date(),
      },
    })
    console.log(`Created PSMProfile: ${psm.slug}`)
  } else if (psm.verificationStatus !== 'approved') {
    psm = await prisma.pSMProfile.update({
      where: { id: psm.id },
      data: {
        verificationStatus: 'approved',
        isAcceptingPatients: true,
        verifiedAt: psm.verifiedAt ?? new Date(),
      },
    })
    console.log(`Approved existing PSMProfile: ${psm.slug}`)
  }

  console.log('\nDual role granted:')
  console.log(`  Email:            ${updated.email}`)
  console.log(`  Role:             ${updated.role}`)
  console.log(`  isPlatformAdmin:  ${updated.isPlatformAdmin}`)
  console.log(`  EOA:              ${updated.eoaAddress}`)
  console.log(`  PSM slug:         ${psm.slug}`)
  console.log('\nNext: reload the app and re-sign SIWE (session JWT must refresh).')
  console.log('Then use the topbar role toggle: PSM → /disponibilidad, Admin → /admin.')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
