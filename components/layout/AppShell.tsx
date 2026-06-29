'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { SidebarWrapper } from './SidebarWrapper'
import { Topbar } from './Topbar'
import { Footer } from './Footer'

const MOBILE_BREAKPOINT = 1024

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

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
          className={cn(
            'flex flex-1 flex-col min-h-screen overflow-y-auto overflow-x-hidden relative z-10',
            'transition-[margin] duration-300 ease-in-out',
            sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
          )}
        >
          <Topbar />
          <main className="flex-1 pt-16 sm:pt-20 max-w-full relative z-10">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
