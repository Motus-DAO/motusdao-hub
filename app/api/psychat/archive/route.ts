import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { assertValidStoredCiphertext } from '@/lib/safe-notes/crypto'
import { hasStoredPsychatArchiveConsent } from '@/lib/auth/psychat-archive-consent'
import { PSYCHAT_ARCHIVE_KEY_VERSION } from '@/lib/psychat-archive/constants'
import {
  handleClinicalAuditError,
  recordClinicalAccess,
} from '@/lib/clinical-audit'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const row = await prisma.psychatArchiveSnapshot.findUnique({
      where: { userId: session.userId },
    })

    if (!row) {
      return NextResponse.json({ snapshot: null })
    }

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: session.userId,
      action: 'list',
      resource: 'psychat_archive',
      resourceId: row.id,
      reason: 'psychat_archive_read',
    })

    return NextResponse.json({
      snapshot: {
        id: row.id,
        ciphertext: row.ciphertext,
        iv: row.iv,
        keyVersion: row.keyVersion,
        updatedAt: row.updatedAt,
      },
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const enabled = await hasStoredPsychatArchiveConsent(session.userId)
    if (!enabled) {
      return NextResponse.json(
        { error: 'Activa primero “Guardar copia cifrada” en Psychat.' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      ciphertext?: string
      iv?: string
      keyVersion?: number
    }

    if (!body.ciphertext || !body.iv) {
      return NextResponse.json({ error: 'ciphertext and iv are required' }, { status: 400 })
    }
    if (body.keyVersion !== undefined && body.keyVersion !== PSYCHAT_ARCHIVE_KEY_VERSION) {
      return NextResponse.json({ error: 'Unsupported key version' }, { status: 400 })
    }

    try {
      assertValidStoredCiphertext(body.ciphertext, body.iv)
    } catch {
      return NextResponse.json({ error: 'Invalid ciphertext or iv' }, { status: 400 })
    }

    const snapshot = await prisma.$transaction(async (tx) => {
      const row = await tx.psychatArchiveSnapshot.upsert({
        where: { userId: session.userId! },
        create: {
          userId: session.userId!,
          ciphertext: body.ciphertext!,
          iv: body.iv!,
          keyVersion: PSYCHAT_ARCHIVE_KEY_VERSION,
        },
        update: {
          ciphertext: body.ciphertext!,
          iv: body.iv!,
          keyVersion: PSYCHAT_ARCHIVE_KEY_VERSION,
        },
      })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: session.userId,
          action: 'update',
          resource: 'psychat_archive',
          resourceId: row.id,
          reason: 'psychat_archive_save',
        },
        tx
      )
      return row
    })

    return NextResponse.json({
      snapshot: {
        id: snapshot.id,
        keyVersion: snapshot.keyVersion,
        updatedAt: snapshot.updatedAt,
      },
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse
    throw error
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const existing = await prisma.psychatArchiveSnapshot.findUnique({
      where: { userId: session.userId },
    })

    if (!existing) {
      return NextResponse.json({ success: true })
    }

    await prisma.$transaction(async (tx) => {
      await tx.psychatArchiveSnapshot.delete({ where: { userId: session.userId! } })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: session.userId,
          action: 'delete',
          resource: 'psychat_archive',
          resourceId: existing.id,
          reason: 'psychat_archive_delete',
        },
        tx
      )
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse
    throw error
  }
}
