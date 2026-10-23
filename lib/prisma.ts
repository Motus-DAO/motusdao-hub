import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Prisma Client with connection pooling for Vercel
const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  errorFormat: 'pretty',
}

// The dev server keeps the first client on globalThis. A schema change leaves
// that instance without new models, so delegates like sessionTransferEvent are missing.
const cachedPrisma = globalForPrisma.prisma as (PrismaClient & { sessionTransferEvent?: unknown }) | undefined
if (cachedPrisma && cachedPrisma.sessionTransferEvent == null) {
  void cachedPrisma.$disconnect()
  globalForPrisma.prisma = undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions)

// Log connection status in production for debugging
if (process.env.NODE_ENV === 'production') {
  // Verify DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('[PRISMA] ERROR: DATABASE_URL is not set!')
  } else {
    // Log connection string (masked) for debugging
    const maskedUrl = process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@')
    console.log('[PRISMA] Database connection configured:', maskedUrl)
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
