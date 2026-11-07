'use client'

import type { ReactNode } from 'react'
import type { LoadError } from '@stripe/connect-js'
import {
  ConnectAccountManagement,
  ConnectBalances,
  ConnectDocuments,
  ConnectNotificationBanner,
  ConnectPayments,
  ConnectPayouts,
} from '@stripe/react-connect-js'
import { cn } from '@/lib/utils'

function ConnectSurface({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-h-[16rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0f] p-2 sm:p-4',
        className
      )}
    >
      {children}
    </div>
  )
}

function logLoadError({ error, elementTagName }: LoadError) {
  console.error(`[stripe-connect] ${elementTagName} failed to load`, error)
}

/** Shows outstanding risk and compliance requirements after onboarding. */
export function EmbeddedNotificationBanner() {
  return <ConnectNotificationBanner onLoadError={logLoadError} />
}

/** Identity, tax, business and payout bank account details. */
export function EmbeddedAccountManagement() {
  return (
    <ConnectSurface>
      <ConnectAccountManagement
        collectionOptions={{ fields: 'eventually_due', futureRequirements: 'include' }}
        onLoadError={logLoadError}
      />
    </ConnectSurface>
  )
}

/** Charges, refunds and disputes for the connected account. */
export function EmbeddedPayments() {
  return (
    <ConnectSurface>
      <ConnectPayments onLoadError={logLoadError} />
    </ConnectSurface>
  )
}

/** Payout history and schedule. */
export function EmbeddedPayouts() {
  return (
    <ConnectSurface>
      <ConnectPayouts onLoadError={logLoadError} />
    </ConnectSurface>
  )
}

/** Available, pending and reserved balances. */
export function EmbeddedBalances() {
  return (
    <ConnectSurface>
      <ConnectBalances onLoadError={logLoadError} />
    </ConnectSurface>
  )
}

/** Tax invoices and forms Stripe issues to the connected account. */
export function EmbeddedDocuments() {
  return (
    <ConnectSurface>
      <ConnectDocuments onLoadError={logLoadError} />
    </ConnectSurface>
  )
}
