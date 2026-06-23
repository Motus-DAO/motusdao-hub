import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { asStringArray } from '@/lib/prisma-json'
import { requireJournalOwnerOrAdmin, requireSelfOrAdmin } from '@/lib/auth/guards'
import { handleAuthError } from '@/lib/auth/session'
import { recordClinicalAccess } from '@/lib/clinical-audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, content, mood, tags } = body

    // Validate required fields
    if (!userId || !content) {
      return NextResponse.json(
        { error: 'User ID and content are required' },
        { status: 400 }
      )
    }

    const session = await requireSelfOrAdmin(request, userId)

    // Create journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        userId,
        content,
        mood: mood || null,
        tags: Array.isArray(tags) ? tags : tags ?? null
      }
    })

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: userId,
      action: 'create',
      resource: 'journal_entry',
      resourceId: journalEntry.id,
      reason: 'journal_create',
    })

    return NextResponse.json(
      { 
        success: true, 
        message: 'Journal entry created successfully',
        entry: journalEntry
      },
      { status: 201 }
    )
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

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

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.journalEntry.count({
        where: { userId }
      })
    ])

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: userId,
      action: 'list',
      resource: 'journal_entry',
      reason: 'journal_list',
      metadata: { page, limit, total },
    })

    // Parse tags for each entry
    const entriesWithParsedTags = entries.map(entry => ({
      ...entry,
      tags: asStringArray(entry.tags)
    }))

    return NextResponse.json({
      entries: entriesWithParsedTags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
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
    const body = await request.json()
    const { id, content, mood, tags } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    const { session, entry } = await requireJournalOwnerOrAdmin(request, id)

    const updatedEntry = await prisma.journalEntry.update({
      where: { id },
      data: {
        content,
        mood,
        tags: Array.isArray(tags) ? tags : tags ?? null
      }
    })

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: entry.userId,
      action: 'update',
      resource: 'journal_entry',
      resourceId: id,
      reason: 'journal_update',
    })

    return NextResponse.json({
      success: true,
      message: 'Journal entry updated successfully',
      entry: {
        ...updatedEntry,
        tags: asStringArray(updatedEntry.tags)
      }
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

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

    await prisma.journalEntry.delete({
      where: { id }
    })

    await recordClinicalAccess({
      request,
      actorUserId: session.userId,
      targetUserId: entry.userId,
      action: 'delete',
      resource: 'journal_entry',
      resourceId: id,
      reason: 'journal_delete',
    })

    return NextResponse.json({
      success: true,
      message: 'Journal entry deleted successfully'
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse

    console.error('Error deleting journal entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
