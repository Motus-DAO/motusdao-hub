import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  type DocumentType,
  uploadProfessionalDocument,
} from '@/lib/storage'
import { resolveUploadActor } from '@/lib/storage-auth'
import { handleAuthError } from '@/lib/auth/session'

const documentTypeSchema = z.enum(['cedula', 'titulo'])

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null
    const eoaAddress = formData.get('eoaAddress') as string | null
    const documentTypeRaw = formData.get('documentType') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const documentType = documentTypeSchema.parse(documentTypeRaw) as DocumentType
    const actor = await resolveUploadActor(request, eoaAddress, userId)
    const { storagePath } = await uploadProfessionalDocument({
      file,
      ownerKey: actor.ownerKey,
      documentType,
    })

    if (actor.userId) {
      const psmProfile = await prisma.pSMProfile.findUnique({
        where: { userId: actor.userId },
        select: { id: true, verificationStatus: true },
      })

      if (psmProfile) {
        const field =
          documentType === 'cedula' ? 'cedulaDocumentPath' : 'tituloDocumentPath'
        await prisma.pSMProfile.update({
          where: { userId: actor.userId },
          data: {
            [field]: storagePath,
            ...(psmProfile.verificationStatus === 'rejected'
              ? {
                  verificationStatus: 'pending' as const,
                  isAcceptingPatients: false,
                  rejectedAt: null,
                }
              : {}),
          },
        })

        if (psmProfile.verificationStatus === 'rejected') {
          await prisma.user.update({
            where: { id: actor.userId },
            data: { onboardingStatus: 'pending_verification' },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      documentType,
      storagePath,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error uploading document:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'documentType must be "cedula" or "titulo"' },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('Not authorized') ||
      message.includes('does not match') ||
      message.includes('required')
        ? 403
        : message.includes('Invalid') || message.includes('too large') || message.includes('Unsupported')
          ? 400
          : 500

    return NextResponse.json({ error: message }, { status })
  }
}
