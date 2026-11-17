'use client'

import { AdminAuthGate } from '@/components/auth/AdminAuthGate'
import { AdminShellRedirect } from '@/components/auth/AdminShellRedirect'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <AdminShellRedirect />
      <div className="p-6">
        <AdminAuthGate>{children}</AdminAuthGate>
      </div>
    </div>
  )
}
