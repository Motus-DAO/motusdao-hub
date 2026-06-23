import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  createSignedDocumentUrl,
  normalizeWalletAddress,
} from '@/lib/storage'
import { assertDocumentOwnership } from '@/lib/storage-auth'
import { recordClinicalAccess } from '@/lib/clinical-audit'

const querySchema = z.object({
  storagePath: z.string().min(1),
  userId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { storagePath, userId } = querySchema.parse({
      storagePath: searchParams.get('storagePath'),
      userId: searchParams.get('userId') ?? undefined,
    })

    const session = await getSessionFromRequest(request)
    const adminDenied = await guardAdmin(request)
    const isAdmin = !adminDenied

    if (!isAdmin) {
      if (!session?.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      if (userId && session.userId !== userId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { eoaAddress: true },
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      assertDocumentOwnership(storagePath, user.eoaAddress)
    } else if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { eoaAddress: true },
      })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      assertDocumentOwnership(storagePath, user.eoaAddress)
    } else {
      const ownerPrefix = storagePath.split('/')[0]
      if (!ownerPrefix || !ownerPrefix.startsWith('0x')) {
        return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 })
      }
      normalizeWalletAddress(ownerPrefix)
    }

    const signedUrl = await createSignedDocumentUrl(storagePath)

    await recordClinicalAccess({
      request,
      actorUserId: session?.userId ?? null,
      targetUserId: userId ?? session?.userId ?? null,
      action: 'read',
      resource: 'document',
      resourceId: storagePath,
      reason: isAdmin ? 'admin_document_review' : 'owner_document_access',
    })

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn: 3600,
    })
  } catch (error) {
    console.error('Error creating signed document URL:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('Not authorized') || message.includes('does not belong')
        ? 403
        : message.includes('Invalid') || message.includes('not found')
          ? 400
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}
