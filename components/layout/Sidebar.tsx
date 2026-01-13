'use client'

import { useUIStore, getNavigationItems } from '@/lib/store'
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
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useWaaP } from '@/lib/contexts/WaaPProvider'
import { useState } from 'react'
import { LoginRequiredModal } from '@/components/ui/LoginRequiredModal'

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
}

export function Sidebar() {
  const { role, sidebarOpen, setSidebarOpen } = useUIStore()
  const pathname = usePathname()
  const { authenticated } = useWaaP()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const navigationItems = getNavigationItems(role)

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Allow access to home and docs pages
    if (href === '/' || href === '/docs') {
      return
    }

    // Block access to other pages if not authenticated
    if (!authenticated) {
      e.preventDefault()
      setShowLoginModal(true)
    }
  }

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
          "fixed left-0 top-0 z-50 h-screen w-64 glass-sidebar border-r border-white/10 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:z-40"
        )}
      >
        <div className="flex h-screen flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 relative">
                <Image
                  src="/logo.svg"
                  alt="MotusDAO Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg gradient-text">
                  MotusDAO
                </h1>
                <p className="text-xs text-muted-foreground">Mental Health Hub</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-white/15 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap]
              const isActive = pathname === item.href
              const isBlocked = !authenticated && item.href !== '/' && item.href !== '/docs'

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-mauve-500/20 text-mauve-400 border border-mauve-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    isBlocked && "opacity-60 cursor-not-allowed"
                  )}
                  onClick={(e) => {
                    handleLinkClick(e, item.href)
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false)
                    }
                  }}
                >
                  <Icon 
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive ? "text-mauve-400" : "group-hover:text-foreground"
                    )} 
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="text-xs text-muted-foreground text-center">
              <p>MotusDAO Hub v1.0</p>
              <p className="mt-1">Mental Health & Wellness</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Login Required Modal */}
      <LoginRequiredModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  )
}
