import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { handleAuthError, requireSession } from '@/lib/auth/session'
import { ACCOUNT_DATA_KEY_VERSION } from '@/lib/account-data-key/constants'
import {
  pickUserDataKeyFields,
  publicDataKeyPrefs,
} from '@/lib/account-data-key/server'
import { resolveEffectiveDataKeyMode } from '@/lib/account-data-key/mode'
import {
  handleClinicalAuditError,
  recordClinicalAccess,
} from '@/lib/clinical-audit'

const patchSchema = z.object({
  mode: z.enum(['account', 'wallet']),
  migrationComplete: z.boolean().optional(),
  walletEoa: z.string().nullable().optional(),
})

async function userHasEncryptedData(userId: string): Promise<boolean> {
  const [journalCount, archive] = await Promise.all([
    prisma.journalEntry.count({ where: { userId } }),
    prisma.psychatArchiveSnapshot.findUnique({
      where: { userId },
      select: { id: true },
    }),
  ])
  return journalCount > 0 || archive != null
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        dataKeyMode: true,
        dataKeyVersion: true,
        dataKeyWalletEoa: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hasEncryptedData = await userHasEncryptedData(session.userId)
    const fields = pickUserDataKeyFields(user)

    return NextResponse.json({
      ...publicDataKeyPrefs(fields),
      hasEncryptedData,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    throw error
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession(request)
    if (!session.userId) {
      return NextResponse.json({ error: 'Se necesita una cuenta del Hub.' }, { status: 403 })
    }

    const body = patchSchema.parse(await request.json())
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        dataKeyMode: true,
        dataKeyVersion: true,
        dataKeyWalletEoa: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const fields = pickUserDataKeyFields(user)
    const currentMode = resolveEffectiveDataKeyMode(fields)
    const hasEncryptedData = await userHasEncryptedData(session.userId)

    if (body.migrationComplete) {
      if (!hasEncryptedData) {
        return NextResponse.json(
          { error: 'No hay datos para migrar.' },
          { status: 400 }
        )
      }
      const walletEoa =
        body.mode === 'wallet'
          ? (body.walletEoa?.toLowerCase() ?? session.eoaAddress?.toLowerCase() ?? null)
          : null

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.user.update({
          where: { id: session.userId! },
          data: {
            dataKeyMode: body.mode,
            dataKeyVersion: ACCOUNT_DATA_KEY_VERSION,
            dataKeyWalletEoa: walletEoa,
          },
          select: {
            dataKeyMode: true,
            dataKeyVersion: true,
            dataKeyWalletEoa: true,
          },
        })
        await tx.psychatArchiveSnapshot.updateMany({
          where: { userId: session.userId! },
          data: { dataKeyMode: body.mode, keyVersion: ACCOUNT_DATA_KEY_VERSION },
        })
        await recordClinicalAccess(
          {
            request,
            actorUserId: session.userId,
            targetUserId: session.userId,
            action: 'update',
            resource: 'profile',
            resourceId: user.id,
            reason: 'data_key_mode_migration_complete',
            metadata: { mode: body.mode },
          },
          tx
        )
        return row
      })

      const prefs = publicDataKeyPrefs(pickUserDataKeyFields(updated))
      return NextResponse.json({ ...prefs, hasEncryptedData })
    }

    if (hasEncryptedData && body.mode !== currentMode) {
      return NextResponse.json(
        {
          error: 'Hay datos cifrados. Completa la migración en el cliente antes de cambiar el modo.',
          code: 'MIGRATION_REQUIRED',
          currentMode,
        },
        { status: 409 }
      )
    }

    const walletEoa =
      body.mode === 'wallet' ? (session.eoaAddress?.toLowerCase() ?? null) : null

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id: session.userId! },
        data: {
          dataKeyMode: body.mode,
          dataKeyVersion: ACCOUNT_DATA_KEY_VERSION,
          dataKeyWalletEoa: walletEoa,
        },
        select: {
          dataKeyMode: true,
          dataKeyVersion: true,
          dataKeyWalletEoa: true,
        },
      })
      await recordClinicalAccess(
        {
          request,
          actorUserId: session.userId,
          targetUserId: session.userId,
          action: 'update',
          resource: 'profile',
          resourceId: user.id,
          reason: 'data_key_mode_preference',
          metadata: { mode: body.mode },
        },
        tx
      )
      return row
    })

    const prefs = publicDataKeyPrefs(pickUserDataKeyFields(updated))
    return NextResponse.json({ ...prefs, hasEncryptedData })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    const auditResponse = handleClinicalAuditError(error)
    if (auditResponse) return auditResponse
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    throw error
  }
}