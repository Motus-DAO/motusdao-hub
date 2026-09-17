import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admins = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [{ role: 'admin' }, { isPlatformAdmin: true }],
    },
    select: {
      id: true,
      email: true,
      eoaAddress: true,
      smartWalletAddress: true,
      authProvider: true,
      role: true,
      isPlatformAdmin: true,
      registrationCompleted: true,
      createdAt: true,
      psm: { select: { slug: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (admins.length === 0) {
    console.log('No admin users found.')
    return
  }

  console.log(`Admin / platform-admin users (${admins.length}):\n`)
  for (const user of admins) {
    const dual = user.role === 'psm' && user.isPlatformAdmin
    console.log(`  Email:        ${user.email}`)
    console.log(`  Role:         ${user.role}${dual ? ' (dual + admin)' : ''}`)
    console.log(`  PlatformAdmin:${user.isPlatformAdmin}`)
    console.log(`  EOA:          ${user.eoaAddress}`)
    console.log(`  Smart wallet: ${user.smartWalletAddress ?? '—'}`)
    console.log(`  Provider:     ${user.authProvider ?? '—'}`)
    console.log(`  PSM slug:     ${user.psm?.slug ?? '—'}`)
    console.log(`  ID:           ${user.id}`)
    console.log('')
  }

  console.log('To grant admin to another wallet:')
  console.log('  npm run grant-admin -- <0xYourEoaAddress>')
  console.log('To grant dual admin+PSM:')
  console.log('  npm run grant-dual-role -- <email-or-0xEoa>')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
