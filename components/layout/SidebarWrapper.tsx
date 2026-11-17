'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export function SidebarWrapper() {
  const pathname = usePathname()
  const onAdminRoute = Boolean(pathname?.startsWith('/admin'))

  // The admin shell belongs to /admin. A dual admin+PSM account that switches
  // to "admin" still needs the practice menu everywhere else, otherwise
  // Disponibilidad and Perfil disappear from the only menu it can see.
  if (onAdminRoute) {
    return <AdminSidebar />
  }

  return <Sidebar />
}

