import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseFoundingRole } from '@/lib/founding/constants'
import { contactRateLimitClientKey } from '@/lib/platform-spend-guard'
import {
  foundingSignupRateLimited,
  listFoundingPublic,
  registerFoundingWaitlist,
} from '@/lib/founding/store'
import { trackFunnel } from '@/lib/track-funnel'

const postSchema = z.object({
  role: z.enum(['user', 'psm']),
  displayName: z.string().min(2).max(80),
  email: z.string().email(),
  wallet: z.string().optional(),
  mnsLabel: z.string().min(2).max(32),
  mnsTxHash: z.string().min(10),
  locale: z.enum(['es', 'en']).optional(),
  optionalNote: z.string().max(500).optional(),
})

export async function GET(request: NextRequest) {
  const roleParam = request.nextUrl.searchParams.get('role') ?? 'user'
  const role = parseFoundingRole(roleParam)
  if (!role) {
    return NextResponse.json({ error: 'role debe ser user o psm.' }, { status: 400 })
  }

  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50)
  )

  const data = await listFoundingPublic(role, page, pageSize)
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (foundingSignupRateLimited(request)) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })
  }

  try {
    const body = postSchema.parse(await request.json())
    const role = parseFoundingRole(body.role)
    if (!role) {
      return NextResponse.json({ error: 'role inválido.' }, { status: 400 })
    }

    const clientIp = contactRateLimitClientKey(request)
    const result = await registerFoundingWaitlist({
      role,
      displayName: body.displayName,
      email: body.email,
      wallet: body.wallet,
      mnsLabel: body.mnsLabel,
      mnsTxHash: body.mnsTxHash,
      locale: body.locale,
      optionalNote: body.optionalNote,
      clientIp,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status }
      )
    }

    trackFunnel('tofu_page_view', {
      surface: 'founding_signup',
      role: body.role,
      position: String(result.entry.position),
    })

    return NextResponse.json(
      {
        id: result.entry.id,
        role: result.entry.role,
        position: result.entry.position,
        tier: result.entry.tier,
        discountPercent: result.entry.discountPercent,
        displayName: result.entry.displayName,
        publicName: `${result.entry.mnsLabel}.motus`,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos.', details: error.flatten() }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'CLOSED') {
      return NextResponse.json({ error: 'Lista cerrada.', code: 'CLOSED' }, { status: 403 })
    }
    console.error('founding waitlist POST', error)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}