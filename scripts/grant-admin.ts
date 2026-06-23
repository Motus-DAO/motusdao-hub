import { PrismaClient } from '@prisma/client'
import { getAddress, isAddress } from 'viem'

const prisma = new PrismaClient()

async function main() {
  const eoaArg = process.argv[2]

  if (!eoaArg || !isAddress(eoaArg)) {
    console.log('Usage: npm run grant-admin -- <0xEoaAddress>')
    console.log('\nFind your EOA in the app topbar, or on /admin after connecting.')
    process.exit(1)
  }

  const eoaAddress = getAddress(eoaArg)

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { eoaAddress: { equals: eoaAddress, mode: 'insensitive' } },
        { smartWalletAddress: { equals: eoaAddress, mode: 'insensitive' } },
      ],
    },
    include: { profile: true },
  })

  if (!user) {
    console.log(`No user found for wallet ${eoaAddress}`)
    console.log('\nOptions:')
    console.log('  1. Complete onboarding first, then re-run this script')
    console.log('  2. Create a placeholder admin: npm run create-admin')
    console.log('     (edit scripts/create-admin-user.ts with your EOA first)')
    process.exit(1)
  }

  if (user.role === 'admin') {
    console.log(`Already admin: ${user.email} (${user.eoaAddress})`)
    process.exit(0)
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' },
  })

  console.log('Admin role granted:')
  console.log(`  Email: ${updated.email}`)
  console.log(`  EOA:   ${updated.eoaAddress}`)
  console.log(`  Name:  ${user.profile?.nombre ?? '—'} ${user.profile?.apellido ?? ''}`)
  console.log('\nReload /admin — sign in with the same wallet used above.')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
