import { prisma } from '@/lib/prisma'

export async function createCrisisEventIfNeeded(input: {
  userId: string
  source: string
  urgencyLevel?: string
  riskFlags?: string[]
  summary?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const riskFlags = input.riskFlags ?? []
  const shouldCreate =
    input.urgencyLevel === 'crisis' ||
    riskFlags.some(flag => ['self_harm', 'violence', 'abuse'].includes(flag))

  if (!shouldCreate) return

  await prisma.crisisEvent.create({
    data: {
      userId: input.userId,
      source: input.source,
      severity: input.urgencyLevel === 'crisis' ? 'high' : 'possible',
      summary: input.summary,
      metadata: {
        riskFlags,
        ...(input.metadata ?? {}),
      },
    },
  })
}
