import type { NextRequest } from 'next/server'
import type { AuthContext } from './session'
import { requireSession } from './session'
import { AuthError } from './errors'
import { prisma } from '@/lib/prisma'

export function isAdmin(session: AuthContext): boolean {
  return session.role === 'admin' && Boolean(session.userId)
}

export function assertAuthenticatedUser(session: AuthContext): string {
  if (!session.userId) {
    throw new AuthError(401, 'Authenticated user is not linked to an app profile')
  }
  return session.userId
}

export function assertSelfOrAdmin(session: AuthContext, userId: string): void {
  const actorId = assertAuthenticatedUser(session)
  if (!isAdmin(session) && actorId !== userId) {
    throw new AuthError(403, 'Not authorized for this user')
  }
}

export async function requireSelfOrAdmin(
  request: NextRequest,
  userId: string
): Promise<AuthContext> {
  const session = await requireSession(request)
  assertSelfOrAdmin(session, userId)
  return session
}

export async function requireMatchParticipantOrAdmin(
  request: NextRequest,
  matchId: string
): Promise<{ session: AuthContext; match: { id: string; userId: string; psmId: string } }> {
  const session = await requireSession(request)
  const actorId = assertAuthenticatedUser(session)
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, userId: true, psmId: true },
  })

  if (!match) {
    throw new AuthError(404, 'Emparejamiento no encontrado')
  }

  if (!isAdmin(session) && actorId !== match.userId && actorId !== match.psmId) {
    throw new AuthError(403, 'Not authorized for this match')
  }

  return { session, match }
}

export async function requireJournalOwnerOrAdmin(
  request: NextRequest,
  entryId: string
): Promise<{ session: AuthContext; entry: { id: string; userId: string } }> {
  const session = await requireSession(request)
  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    select: { id: true, userId: true },
  })

  if (!entry) {
    throw new AuthError(404, 'Journal entry not found')
  }

  assertSelfOrAdmin(session, entry.userId)
  return { session, entry }
}

export async function requireMatchedUserAccess(
  request: NextRequest,
  userId: string
): Promise<AuthContext> {
  const session = await requireSession(request)
  const actorId = assertAuthenticatedUser(session)

  if (isAdmin(session) || actorId === userId) {
    return session
  }

  const match = await prisma.match.findFirst({
    where: {
      userId,
      psmId: actorId,
      status: 'active',
    },
    select: { id: true },
  })

  if (!match) {
    throw new AuthError(403, 'Not authorized for this user')
  }

  return session
}
