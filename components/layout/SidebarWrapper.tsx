'use client'

import { usePathname } from 'next/navigation'
import { useUIStore } from '@/lib/store'
import { Sidebar } from './Sidebar'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export function SidebarWrapper() {
  const { role } = useUIStore()
  const pathname = usePathname()
  const onAdminRoute = Boolean(pathname?.startsWith('/admin'))

  // Prefer URL so dual-role users keep AdminSidebar on /admin even if
  // the store briefly still says psm after a refresh.
  if (onAdminRoute || role === 'admin') {
    return <AdminSidebar />
  }

  return <Sidebar />
}
