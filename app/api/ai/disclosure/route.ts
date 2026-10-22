import { NextResponse } from 'next/server'
import { getAIDisclosure } from '@/lib/ai-client'

export async function GET() {
  return NextResponse.json(getAIDisclosure())
}
