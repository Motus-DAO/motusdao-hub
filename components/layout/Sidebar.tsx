'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUIStore, getNavigationGroups } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Home,
  Bot,
  Heart,
  Users,
  Eye,
  GraduationCap,
  CreditCard,
  BookOpen,
  User,
  Video,
  Calendar,
  Wallet,
  History,
  Landmark,
  Shield,
  X,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  navSectionIdFromTitle,
  readNavSectionCollapsed,
  writeNavSectionCollapsed,
  type NavSectionId,
} from '@/lib/nav-sidebar-collapse'

const iconMap = {
  Home,
  Bot,
  Heart,
  Users,
  Eye,
  GraduationCap,
  CreditCard,
  BookOpen,
  User,
  Video,
  Calendar,
  Wallet,
  History,
  Landmark,
  Shield,
}

export function Sidebar() {
  const { role, isPlatformAdmin, sidebarOpen, setSidebarOpen } = useUIStore()
  const pathname = usePathname()

  const navigationGroups = getNavigationGroups(role, { isPlatformAdmin })

  const activeSection = useMemo(() => {
    for (const group of navigationGroups) {
      const hit = group.items.some(
        (item) =>
          pathname === item.href ||
          (item.href !== '/' &&
            item.href !== '/finanzas' &&
            pathname.startsWith(`${item.href}/`))
      )
      if (hit) return navSectionIdFromTitle(group.title)
    }
    return null
  }, [navigationGroups, pathname])

  const [collapsed, setCollapsed] = useState<Record<NavSectionId, boolean>>(() =>
    readNavSectionCollapsed()
  )

  useEffect(() => {
    if (!activeSection) return
    setCollapsed((prev) => {
      if (!prev[activeSection]) return prev
      const next = { ...prev, [activeSection]: false }
      writeNavSectionCollapsed(next)
      return next
    })
  }, [activeSection])

  const toggleSection = useCallback((sectionId: NavSectionId) => {
    setCollapsed((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] }
      writeNavSectionCollapsed(next)
      return next
    })
  }, [])

  // Close the drawer after a client navigation (back/forward included). The
  // desktop sidebar is permanent, so only act below the lg breakpoint.
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }, [pathname, setSidebarOpen])

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex flex-col app-viewport-height w-64 max-w-[85vw] overflow-hidden border-r border-border transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Menú principal"
      >
        <div
          className="pointer-events-none absolute inset-0 glass-sidebar rounded-none border-0"
          aria-hidden
        />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative z-[1] min-h-0 flex-1 drawer-scroll-y pt-[env(safe-area-inset-top)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4 sm:p-6">
            <div className="flex min-w-0 items-center space-x-3">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src="/logo.svg"
                  alt="MotusDAO Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-lg font-bold gradient-text">
                  MotusDAO
                </h1>
                <p className="truncate text-xs text-muted-foreground">Mental Health Hub</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="shrink-0 rounded-xl p-2 transition-colors hover:bg-foreground/5"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
            {navigationGroups.map((group) => {
              const sectionId = navSectionIdFromTitle(group.title)
              const isCollapsible = Boolean(group.title)
              const isCollapsed = isCollapsible && collapsed[sectionId]

              return (
              <div key={group.title ?? 'main'} className="mb-5 last:mb-0">
                {group.title ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 px-4 pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 hover:text-muted-foreground"
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleSection(sectionId)}
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                        !isCollapsed && 'rotate-90'
                      )}
                      aria-hidden
                    />
                    <span>{group.title}</span>
                  </button>
                ) : null}
                {!isCollapsed ? (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = iconMap[item.icon as keyof typeof iconMap]
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/' &&
                        item.href !== '/finanzas' &&
                        pathname.startsWith(`${item.href}/`))

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group flex items-center space-x-3 rounded-xl px-4 py-3 transition-all duration-200',
                          isActive
                            ? 'border border-mauve-500/30 bg-mauve-500/20 text-mauve-700 dark:text-mauve-400'
                            : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                        )}
                        onClick={() => {
                          if (window.innerWidth < 1024) setSidebarOpen(false)
                        }}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 shrink-0 transition-colors',
                            isActive
                              ? 'text-mauve-700 dark:text-mauve-400'
                              : 'group-hover:text-foreground'
                          )}
                        />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
                ) : null}
              </div>
            )})}
          </nav>

          {/* Footer is decorative; on phones the vertical space belongs to the menu. */}
          <div className="hidden border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:block">
            <div className="text-center text-xs text-muted-foreground">
              <p>MotusDAO Hub v1.0</p>
              <p className="mt-1">Mental Health & Wellness</p>
            </div>
          </div>
          </div>
        </div>
      </aside>
    </>
  )
}
