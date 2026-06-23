'use client'

import { AdminAuthGate } from '@/components/auth/AdminAuthGate'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <AdminAuthGate>{children}</AdminAuthGate>
      </div>
    </div>
  )
}
