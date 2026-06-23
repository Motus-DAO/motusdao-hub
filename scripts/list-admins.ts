import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'admin', deletedAt: null },
    select: {
      id: true,
      email: true,
      eoaAddress: true,
      smartWalletAddress: true,
      authProvider: true,
      registrationCompleted: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  if (admins.length === 0) {
    console.log('No admin users found.')
    return
  }

  console.log(`Admin users (${admins.length}):\n`)
  for (const user of admins) {
    console.log(`  Email:        ${user.email}`)
    console.log(`  EOA:          ${user.eoaAddress}`)
    console.log(`  Smart wallet: ${user.smartWalletAddress ?? '—'}`)
    console.log(`  Provider:     ${user.authProvider ?? '—'}`)
    console.log(`  ID:           ${user.id}`)
    console.log('')
  }

  console.log('To grant admin to another wallet:')
  console.log('  npm run grant-admin -- <0xYourEoaAddress>')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
