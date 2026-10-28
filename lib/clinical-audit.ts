import type { NextRequest } from 'next/server'
import type { ClinicalResource, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { toInputJson } from '@/lib/prisma-json'

type AuditInput = {
  request?: NextRequest
  actorUserId?: string | null
  targetUserId?: string | null
  action: string
  resource: ClinicalResource
  resourceId?: string | null
  reason?: string | null
  metadata?: Record<string, unknown>
}

export class ClinicalAuditError extends Error {
  constructor(cause?: unknown) {
    super('Clinical access audit failed')
    this.name = 'ClinicalAuditError'
    if (cause instanceof Error) {
      this.cause = cause
    }
  }
}

type AuditClient = Prisma.TransactionClient | typeof prisma

export async function recordClinicalAccess(
  input: AuditInput,
  client: AuditClient = prisma
): Promise<void> {
  try {
    await client.clinicalAccessLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ? toInputJson(input.metadata) : undefined,
        ipAddress:
          input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          input.request?.headers.get('x-real-ip') ||
          null,
        userAgent: input.request?.headers.get('user-agent') || null,
      },
    })
  } catch (error) {
    console.error('[clinical-audit] failed to record access event', error)
    throw new ClinicalAuditError(error)
  }
}

export function handleClinicalAuditError(error: unknown): Response | null {
  if (error instanceof ClinicalAuditError) {
    return Response.json(
      { error: 'No se pudo registrar el acceso clínico' },
      { status: 500 }
    )
  }
  return null
}
