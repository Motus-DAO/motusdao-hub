import type { NextRequest } from 'next/server'
import type { ClinicalResource } from '@prisma/client'
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

export async function recordClinicalAccess(input: AuditInput): Promise<void> {
  try {
    await prisma.clinicalAccessLog.create({
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
    console.warn('[clinical-audit] failed to record access event', error)
  }
}
