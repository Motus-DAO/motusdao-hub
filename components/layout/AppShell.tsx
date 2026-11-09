'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { MottyWidget } from '@/components/motty/MottyWidget'
import { SidebarWrapper } from './SidebarWrapper'
import { Topbar } from './Topbar'
import { Footer } from './Footer'

const MOBILE_BREAKPOINT = 1024

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const roleSwitcherEnabled = process.env.NEXT_PUBLIC_ROLE_SWITCHER === 'true'

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const handleChange = (query: MediaQueryList | MediaQueryListEvent) => {
      if (query.matches) {
        setSidebarOpen(false)
      }
    }

    handleChange(mediaQuery)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [setSidebarOpen])

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="flex min-h-screen max-w-full">
        <SidebarWrapper />
        <div
          data-app-shell-scroll
          className={cn(
            'flex flex-1 flex-col min-h-screen overflow-y-auto overflow-x-hidden relative z-10',
            'transition-[margin] duration-300 ease-in-out',
            sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
          )}
        >
          <Topbar />
          <main className="flex-1 max-w-full overflow-x-hidden pt-16 sm:pt-20 pb-[env(safe-area-inset-bottom)]">
            {roleSwitcherEnabled && (
              <div
                role="status"
                className="mx-auto mb-2 max-w-4xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200"
              >
                <strong>Modo prueba:</strong> el cambio de rol es local y no otorga
                permisos de servidor. No usar en producción.
              </div>
            )}
            {children}
          </main>
          <Footer />
        </div>
      </div>
      {/* Motty FAB — separate from MotusAI; same pattern as academia.motusdao.org */}
      <MottyWidget />
    </div>
  )
}
