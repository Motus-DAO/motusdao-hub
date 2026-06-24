/**
 * Dev helper: reset onboarding for a test wallet so you can re-run the PSM flow
 * without creating a new EOA or Privy account.
 *
 * Usage:
 *   source .env.local && npm run dev:reset-onboarding -- --eoa=0xYourTestWallet
 *   source .env.local && npm run dev:reset-onboarding -- --email=test@motusdao.com
 *
 * After running, in the browser console:
 *   localStorage.removeItem('motusdao-onboarding-storage')
 *   location.reload()
 *
 * Options:
 *   --hard   Delete the user row entirely (default: soft reset — keeps user, clears profiles)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  return hit?.slice(prefix.length)
}

async function main() {
  const eoa = parseArg('eoa')
  const email = parseArg('email')
  const hard = process.argv.includes('--hard')

  if (!eoa && !email) {
    console.error('Provide --eoa=0x... or --email=...')
    process.exit(1)
  }

  const user = await prisma.user.findFirst({
    where: eoa
      ? { eoaAddress: eoa.toLowerCase() }
      : { email: email! },
    select: { id: true, email: true, eoaAddress: true, registrationCompleted: true },
  })

  if (!user) {
    console.log('No user found for that wallet/email. You can start onboarding fresh.')
    return
  }

  if (hard) {
    await prisma.user.delete({ where: { id: user.id } })
    console.log(`Deleted user ${user.email} (${user.eoaAddress})`)
  } else {
    await prisma.$transaction([
      prisma.profile.deleteMany({ where: { userId: user.id } }),
      prisma.patientProfile.deleteMany({ where: { userId: user.id } }),
      prisma.pSMProfile.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          registrationCompleted: false,
          onboardingStatus: 'started',
        },
      }),
    ])
    console.log(`Soft-reset onboarding for ${user.email} (${user.eoaAddress})`)
    console.log('  registrationCompleted → false')
    console.log('  profile / psm_profile rows removed')
  }

  console.log('\nIn your browser (same wallet session):')
  console.log("  localStorage.removeItem('motusdao-onboarding-storage')")
  console.log('  location.assign("/onboarding")')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
