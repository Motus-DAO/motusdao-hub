import { NextResponse } from 'next/server'
import { getStripePublishableKey, isStripeConfigured } from '@/lib/stripe'

export async function GET() {
  return NextResponse.json({
    enabled: isStripeConfigured(),
    publishableKey: getStripePublishableKey() ?? null,
  })
}
