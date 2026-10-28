import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { guardAdmin } from '@/lib/auth/admin-route'
import {
  contactPostRateLimited,
  contactRateLimitClientKey,
} from '@/lib/platform-spend-guard'

export async function POST(request: NextRequest) {
  try {
    const clientKey = contactRateLimitClientKey(request)
    if (contactPostRateLimited(clientKey)) {
      return NextResponse.json(
        { error: 'Demasiados mensajes. Intenta más tarde.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, message, userId } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        message,
        userId: userId || null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Contact message sent successfully',
        id: contactMessage.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating contact message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const denied = await guardAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.contactMessage.count(),
    ])

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching contact messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
