import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireJournalOwnerOrAdmin, requireSelfOrAdmin, isAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import {
  handleClinicalAuditError,
  recordClinicalAccess,
} from '@/lib/clinical-audit'
import { assertValidStoredCiphertext } from '@/lib/safe-notes/crypto'
import { SAFE_NOTES_KEY_VERSION } from '@/lib/safe-notes/constants'

function rejectLegacyPlaintextFields(body: Record<string, unknown>): NextResponse | null {
  if ('content' in body || 'mood' in body || 'tags' in body) {
    return NextResponse.json(
      { error: 'Journal entries must be sent encrypted (ciphertext + iv)' },
      { status: 400 }
    )
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const legacy = rejectLegacyPlaintextFields(body)
    if (legacy) return legacy

    const { userId, ciphertext, iv, keyVersion } = body as {
      userId?: string
      ciphertext?: string
      iv?: string
      keyVersion?: number
    }

    if (!userId || !ciphertext || !iv) {
      return NextResponse.json(
        { error: 'User ID, ciphertext, and iv are required' },
        { status: 400 }
      )
    }

    if (keyVersion !== undefined && keyVersion !== SAFE_NOTES_KEY_VERSION) {
      return NextResponse.json({ error: 'Unsupported key version' }, { status: 400 })
    }

    try {
      assertValidStoredCiphertext(ciphertext, iv)
    } catch {
      return NextResponse.json({ error: 'Invalid ciphertext or iv' }, { status: 400 })
    }

    const session = await requireSelfOrAdmin(request, userId)

    const journalEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          userId,
          ciphertext,
          iv,
          keyVersion: SAFE_NOTES_KEY_VERSION,
        },
      })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: userId,
          action: 'create',
          resource: 'journal_entry',
          resourceId: entry.id,
          reason: 'journal_create',
        },
        tx
      )
      return entry
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Journal entry created successfully',
        entry: {
          id: journalEntry.id,
          userId: journalEntry.userId,
          ciphertext: journalEntry.ciphertext,
          iv: journalEntry.iv,
          keyVersion: journalEntry.keyVersion,
          createdAt: journalEntry.createdAt,
          updatedAt: journalEntry.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse

    console.error('Error creating journal entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const session = await requireSelfOrAdmin(request, userId)
    const actorId = session.userId
    const adminMetadataOnly =
      isAdmin(session) && Boolean(actorId) && actorId !== userId

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.journalEntry.count({
        where: { userId },
      }),
    ])

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: userId,
      action: 'list',
      resource: 'journal_entry',
      reason: 'journal_list',
      metadata: { page, limit, total, adminMetadataOnly },
    })

    const mapped = entries.map((entry) => {
      if (adminMetadataOnly) {
        return {
          id: entry.id,
          userId: entry.userId,
          keyVersion: entry.keyVersion,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }
      }
      return {
        id: entry.id,
        userId: entry.userId,
        ciphertext: entry.ciphertext,
        iv: entry.iv,
        keyVersion: entry.keyVersion,
        needsMigration: entry.iv == null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }
    })

    return NextResponse.json({
      entries: mapped,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error fetching journal entries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const legacy = rejectLegacyPlaintextFields(body)
    if (legacy) return legacy

    const { id, ciphertext, iv, keyVersion } = body as {
      id?: string
      ciphertext?: string
      iv?: string
      keyVersion?: number
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    if (!ciphertext || !iv) {
      return NextResponse.json(
        { error: 'Ciphertext and iv are required' },
        { status: 400 }
      )
    }

    if (keyVersion !== undefined && keyVersion !== SAFE_NOTES_KEY_VERSION) {
      return NextResponse.json({ error: 'Unsupported key version' }, { status: 400 })
    }

    try {
      assertValidStoredCiphertext(ciphertext, iv)
    } catch {
      return NextResponse.json({ error: 'Invalid ciphertext or iv' }, { status: 400 })
    }

    const { session, entry } = await requireJournalOwnerOrAdmin(request, id)

    const updatedEntry = await prisma.$transaction(async (tx) => {
      const row = await tx.journalEntry.update({
        where: { id },
        data: {
          ciphertext,
          iv,
          keyVersion: SAFE_NOTES_KEY_VERSION,
        },
      })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: entry.userId,
          action: 'update',
          resource: 'journal_entry',
          resourceId: id,
          reason: 'journal_update',
        },
        tx
      )
      return row
    })

    return NextResponse.json({
      success: true,
      message: 'Journal entry updated successfully',
      entry: {
        id: updatedEntry.id,
        userId: updatedEntry.userId,
        ciphertext: updatedEntry.ciphertext,
        iv: updatedEntry.iv,
        keyVersion: updatedEntry.keyVersion,
        createdAt: updatedEntry.createdAt,
        updatedAt: updatedEntry.updatedAt,
      },
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse

    console.error('Error updating journal entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    const { session, entry } = await requireJournalOwnerOrAdmin(request, id)

    await prisma.$transaction(async (tx) => {
      await tx.journalEntry.delete({ where: { id } })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: entry.userId,
          action: 'delete',
          resource: 'journal_entry',
          resourceId: id,
          reason: 'journal_delete',
        },
        tx
      )
    })

    return NextResponse.json({
      success: true,
      message: 'Journal entry deleted successfully',
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse

    console.error('Error deleting journal entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
