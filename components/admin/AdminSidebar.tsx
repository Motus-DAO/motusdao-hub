'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { useEffect, useState } from 'react'
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
  X,
  AtSign
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
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
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-background/80 backdrop-blur-lg border-r border-white/10 z-50 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-mauve-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <GradientText as="h2" className="text-lg font-bold">
                    Admin Panel
                  </GradientText>
                  <p className="text-xs text-muted-foreground">MotusDAO Hub</p>
                </div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-white/15 rounded-xl transition-colors"
                aria-label="Cerrar sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    // Close sidebar on mobile when clicking a link
                    if (isMobile) {
                      setSidebarOpen(false)
                    }
                  }}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-mauve-500/20 to-purple-600/20 border border-mauve-500/30 text-mauve-400'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5',
                    isActive && 'text-mauve-400'
                  )} />
                  <span className={cn(
                    'font-medium',
                    isActive && 'text-mauve-400'
                  )}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <GlassCard className="p-3">
              <p className="text-xs text-muted-foreground text-center">
                Panel de Administración
              </p>
            </GlassCard>
          </div>
        </div>
      </aside>
    </>
  )
}

