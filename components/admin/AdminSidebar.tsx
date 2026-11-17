'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Heart,
  Calendar,
  DollarSign,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  User,
  Home,
  X,
  AtSign,
  Sparkles,
} from 'lucide-react'
import { GradientText } from '@/components/ui/GradientText'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Usuarios',
    href: '/admin/usuarios',
    icon: Users,
  },
  {
    name: 'Profesionales',
    href: '/admin/psm',
    icon: UserCheck,
  },
  {
    name: 'Matches',
    href: '/admin/matches',
    icon: Heart,
  },
  {
    name: 'Sesiones',
    href: '/admin/sesiones',
    icon: Calendar,
  },
  {
    name: 'Pagos',
    href: '/admin/pagos',
    icon: DollarSign,
  },
  {
    name: 'Cursos',
    href: '/admin/cursos',
    icon: GraduationCap,
  },
  {
    name: 'Mensajes',
    href: '/admin/mensajes',
    icon: MessageSquare,
  },
  {
    name: 'MNS Debug',
    href: '/admin/mns',
    icon: AtSign,
  },
  {
    name: 'Founding',
    href: '/admin/founding',
    icon: Sparkles,
  },
  {
    name: 'Reportes',
    href: '/admin/reportes',
    icon: BarChart3,
  },
  {
    name: 'Configuración',
    href: '/admin/configuracion',
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  // Close the drawer after navigation on mobile; the desktop rail stays put.
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
          'fixed left-0 top-0 z-50 flex flex-col app-viewport-height w-64 max-w-[85vw] overflow-hidden border-r border-white/10 transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Menú de administración"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-background/80 backdrop-blur-lg"
          aria-hidden
        />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 drawer-scroll-y pt-[env(safe-area-inset-top)]">
          {/* Header */}
          <div className="border-b border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center space-x-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-mauve-500 to-iris-500">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <GradientText as="h2" className="truncate text-lg font-bold">
                    Admin Panel
                  </GradientText>
                  <p className="truncate text-xs text-muted-foreground">MotusDAO Hub</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="shrink-0 rounded-xl p-2 transition-colors hover:bg-white/15"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200',
                    isActive
                      ? 'border border-mauve-500/30 bg-gradient-to-r from-mauve-500/20 to-iris-500/20 text-mauve-400'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5 shrink-0', isActive && 'text-mauve-400')}
                  />
                  <span
                    className={cn('font-medium', isActive && 'text-mauve-400')}
                  >
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Ways back to the account surfaces; admin is a role, not a cage. */}
          <div className="border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <Home className="h-4 w-4" />
                Ir al Hub
              </Link>
              <Link
                href="/perfil"
                className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <User className="h-4 w-4" />
                Mi perfil
              </Link>
            </div>
          </div>
          </div>
        </div>
      </aside>
    </>
  )
}
