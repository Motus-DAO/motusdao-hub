import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { normalizeMotusName } from '@/lib/mns-utils'

const patchMnsSchema = z.object({
  eoaAddress: z.string().min(1),
  motusName: z.string().min(1),
  mnsTxHash: z.string().optional()
})

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const data = patchMnsSchema.parse(body)
    const normalizedName = normalizeMotusName(data.motusName)

    if (!normalizedName) {
      return NextResponse.json(
        { error: 'Nombre MNS inválido' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        eoaAddress: { equals: data.eoaAddress, mode: 'insensitive' }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado para esta wallet' },
        { status: 404 }
      )
    }

    const nameTaken = await prisma.user.findFirst({
      where: {
        motusName: normalizedName,
        NOT: { id: user.id }
      }
    })

    if (nameTaken) {
      return NextResponse.json(
        { error: 'Este nombre MNS ya está registrado por otro usuario', code: 'MNS_NAME_TAKEN' },
        { status: 409 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        motusName: normalizedName,
        mnsTxHash: data.mnsTxHash ?? user.mnsTxHash,
        mnsRegisteredAt: user.mnsRegisteredAt ?? new Date()
      },
      select: {
        id: true,
        motusName: true,
        mnsTxHash: true,
        mnsRegisteredAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updated
    })
  } catch (error) {
    console.error('Error updating MNS profile:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
