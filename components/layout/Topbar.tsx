'use client'

import { useUIStore, type UserRole } from '@/lib/store'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { cn } from '@/lib/utils'
import { 
  Menu, 
  Sun, 
  Moon, 
  User, 
  Wallet,
  ChevronDown,
  LogOut,
  Copy,
  Check,
  Zap,
  Shield
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWallet, useWallets } from '@/lib/wallet'
import { createPortal } from 'react-dom'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import { identifyEmbeddedWallet } from '@/lib/wallet-utils'
import { trackCta } from '@/lib/track-cta'
import { logoutAppSession } from '@/lib/auth/client'

export function Topbar() {
  const { 
    role, 
    setRole,
    allowedRoles,
    setAllowedRoles,
    sidebarOpen, 
    toggleSidebar, 
    theme, 
    setTheme
  } = useUIStore()
  const pathname = usePathname()
  const router = useRouter()
  
  // WaaP authentication hooks (replaces Privy)
  const { ready, authenticated, user, login, logout } = useWallet()
  const { wallets } = useWallets()
  
  // ZeroDev smart wallet hook
  const { smartAccountAddress, isInitializing } = useSmartAccount()
  
  // Get EOA (embedded wallet from WaaP)
  const embeddedWallet = identifyEmbeddedWallet(wallets)
  const eoaAddress = embeddedWallet?.address
  
  // Get email from user
  const userEmail = user?.email?.address || user?.google?.email || 'No disponible'
  
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const roleButtonRef = useRef<HTMLButtonElement>(null)
  // The server decides which roles the account may hold. The public flag only
  // enables the local test switch; in production it is ignored.
  const devRoleSwitcher =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_ROLE_SWITCHER === 'true'
  const canSwitchRoles = allowedRoles.length > 1 || devRoleSwitcher

  const handleRoleChange = async (newRole: UserRole) => {
    setRoleError(null)
    try {
      const response = await fetch('/api/auth/active-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        allowedRoles?: UserRole[]
      }
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cambiar el rol')
      }
      if (Array.isArray(data.allowedRoles)) setAllowedRoles(data.allowedRoles)
      setRole(newRole)
      if (newRole !== 'admin') {
        const onboarding = useOnboardingStore.getState()
        onboarding.setRole(newRole)
        if (newRole === 'usuario') onboarding.setUsuarioIntakeTrack('therapy')
      }
      setShowRoleDropdown(false)
      if (newRole === 'admin') {
        router.push('/admin')
        return
      }
      // Leaving admin shell — land on a non-admin page so the menu can switch
      if (pathname?.startsWith('/admin')) {
        router.push(newRole === 'psm' ? '/disponibilidad' : '/')
      }
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'No se pudo cambiar el rol')
    }
  }

  const handleRoleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowRoleDropdown(false)
    }
  }

  // Calculate dropdown position
  useEffect(() => {
    if (showRoleDropdown && roleButtonRef.current) {
      const rect = roleButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      })
    }
  }, [showRoleDropdown])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'matrix') => {
    setTheme(newTheme)
    setShowThemeDropdown(false)
  }

  const handleLogin = () => {
    trackCta('Inicia Sesión', { location: 'topbar' })
    void login()
  }

  const handleLogout = () => {
    void logoutAppSession()
    logout()
    setShowUserDropdown(false)
  }

  const handleCopyAddress = async (address: string, type: string) => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address)
        setCopiedAddress(type)
        setTimeout(() => setCopiedAddress(null), 2000)
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <header
      className={cn(
        'fixed top-[max(1rem,env(safe-area-inset-top))] left-2 right-2 z-40 sm:left-4 sm:right-4 lg:mr-4 max-w-full',
        // Avril glass-nav-modal + Hub-Psi rounded float (Chat-MotusAI exact)
        'rounded-3xl border backdrop-blur-xl backdrop-saturate-150',
        theme === 'light' &&
          'border-black/10 bg-white/55 shadow-[0_8px_40px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.55)]',
        theme === 'dark' &&
          'border-white/14 bg-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
        theme === 'matrix' &&
          'rounded-none border-[var(--matrix-border)] bg-black/90 shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,65,0.1)] backdrop-blur-[10px]',
        'transition-[margin] duration-300 ease-in-out',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-4'
      )}
    >
      <div className="flex h-12 items-center justify-between gap-2 px-2.5 sm:h-16 sm:px-6">
        {/* Left side */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-4">
          <button
            onClick={toggleSidebar}
            className="shrink-0 rounded-xl p-2 transition-colors hover:bg-foreground/5"
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Role Selector */}
          {canSwitchRoles ? (
          <div className="relative min-w-0">
            <button
              ref={roleButtonRef}
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="relative flex h-9 min-w-0 items-center gap-1.5 rounded-2xl border border-border bg-foreground/5 px-2.5 backdrop-blur-xl transition-colors hover:bg-foreground/10 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-10 sm:min-w-[132px] sm:gap-2 sm:px-4"
              aria-label="Selector de rol"
            >
              <span className="truncate text-xs font-medium capitalize sm:text-sm">{role}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4" />
            </button>

            {showRoleDropdown && createPortal(
              <>
                {/* Portal backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowRoleDropdown(false)}
                />
                {/* Dropdown content */}
                <div className="fixed z-50 min-w-[132px] rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-lg p-1"
                     style={{
                       top: `${dropdownPosition.top}px`,
                       right: `${dropdownPosition.right}px`
                     }}
                     onKeyDown={handleRoleKeyDown}>
                  <div className="space-y-1">
                    {allowedRoles.includes('usuario') && (
                      <button
                        onClick={() => void handleRoleChange('usuario')}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-sm text-foreground/90 hover:bg-foreground/5 hover:text-foreground cursor-pointer focus:bg-foreground/10 focus:outline-none transition-colors",
                          role === 'usuario'
                            ? "bg-foreground/10 text-foreground"
                            : "text-foreground/90"
                        )}
                      >
                        Usuario
                      </button>
                    )}
                    {allowedRoles.includes('psm') && (
                      <button
                        onClick={() => void handleRoleChange('psm')}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-sm text-foreground/90 hover:bg-foreground/5 hover:text-foreground cursor-pointer focus:bg-foreground/10 focus:outline-none transition-colors",
                          role === 'psm'
                            ? "bg-foreground/10 text-foreground"
                            : "text-foreground/90"
                        )}
                      >
                        PSM
                      </button>
                    )}
                    {allowedRoles.includes('admin') && (
                      <button
                        onClick={() => void handleRoleChange('admin')}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-sm text-foreground/90 hover:bg-foreground/5 hover:text-foreground cursor-pointer focus:bg-foreground/10 focus:outline-none transition-colors flex items-center space-x-2",
                          role === 'admin'
                            ? "bg-foreground/10 text-foreground"
                            : "text-foreground/90"
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        <span>Admin</span>
                      </button>
                    )}
                    {roleError && (
                      <p className="px-3 py-1 text-xs text-red-400">{roleError}</p>
                    )}
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
          ) : (
            <div className="flex h-9 min-w-0 items-center rounded-2xl border border-border bg-foreground/5 px-2.5 sm:h-10 sm:min-w-[100px] sm:px-4">
              <span className="truncate text-xs font-medium sm:text-sm">
                {role === 'psm' ? 'PSM' : role === 'admin' ? 'Admin' : 'Usuario'}
              </span>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          {/* Theme Toggle Dropdown */}
          <div className="relative">
          <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className="rounded-xl p-2 transition-colors hover:bg-foreground/5 focus-ring"
              aria-label="Cambiar tema"
          >
            {theme === 'light' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
            ) : theme === 'dark' ? (
                <Moon className="w-5 h-5 text-blue-400" />
            ) : (
                <Zap className="w-5 h-5 text-green-500" />
            )}
          </button>

            {showThemeDropdown && (
              <div className="absolute top-full right-0 mt-2 w-20 glass-strong border border-border rounded-xl shadow-lg z-50">
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={cn(
                      "w-full flex items-center justify-center p-2 rounded-xl transition-colors",
                      theme === 'light' 
                        ? "bg-yellow-500/20" 
                        : "hover:bg-foreground/5"
                    )}
                    title="Light theme"
                  >
                    <Sun className="w-5 h-5 text-yellow-500" />
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={cn(
                      "w-full flex items-center justify-center p-2 rounded-xl transition-colors",
                      theme === 'dark' 
                        ? "bg-blue-500/20" 
                        : "hover:bg-foreground/5"
                    )}
                    title="Dark theme"
                  >
                    <Moon className="w-5 h-5 text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleThemeChange('matrix')}
                    className={cn(
                      "w-full flex items-center justify-center p-2 rounded-xl transition-colors",
                      theme === 'matrix' 
                        ? "bg-green-500/20" 
                        : "hover:bg-foreground/5"
                    )}
                    title="Matrix theme"
                  >
                    <Zap className="w-5 h-5 text-green-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Auth Status */}
          {authenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 glass hover:bg-foreground/5 rounded-xl transition-colors"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-mauve rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">Conectado</p>
                  <p className="text-xs text-muted-foreground">
                    {smartAccountAddress ? formatAddress(smartAccountAddress) : eoaAddress ? formatAddress(eoaAddress) : 'Wallet'}
                  </p>
                </div>
                <div className="text-left sm:hidden">
                  <p className="text-xs font-medium">Conectado</p>
                </div>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-border glass-strong shadow-lg">
                  <div className="space-y-3 p-3">
                    {/* Direct profile entry: on phones the account section sits
                        at the bottom of the drawer, so the avatar is the shortcut. */}
                    <Link
                      href="/perfil"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/5"
                    >
                      <User className="h-4 w-4 text-mauve-400" />
                      Mi perfil
                    </Link>

                    {/* Email */}
                    <div className="border-b border-border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>Email:</span>
                        </span>
                      </div>
                      <p className="font-mono text-xs break-all">
                        {userEmail}
                      </p>
                    </div>
                    
                    {/* EOA Address */}
                    {eoaAddress && (
                      <div className="px-3 py-2 text-sm border-b border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground flex items-center space-x-2">
                            <Wallet className="w-4 h-4" />
                            <span>EOA (WaaP):</span>
                          </span>
                          <button
                            onClick={() => handleCopyAddress(eoaAddress, 'eoa')}
                            className="flex items-center space-x-1 text-xs hover:text-foreground transition-colors"
                          >
                            {copiedAddress === 'eoa' ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-mono text-xs break-all">
                          {eoaAddress}
                        </p>
                      </div>
                    )}
                    
                    {/* Smart Wallet Address */}
                    {isInitializing ? (
                      <div className="px-3 py-2 text-sm border-b border-border">
                        <p className="text-xs text-muted-foreground">
                          Inicializando smart wallet...
                        </p>
                      </div>
                    ) : smartAccountAddress ? (
                      <div className="px-3 py-2 text-sm border-b border-border border-green-500/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span>Smart Wallet (ZeroDev):</span>
                          </span>
                          <button
                            onClick={() => handleCopyAddress(smartAccountAddress, 'smart')}
                            className="flex items-center space-x-1 text-xs hover:text-foreground transition-colors"
                          >
                            {copiedAddress === 'smart' ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-mono text-xs break-all">
                          {smartAccountAddress}
                        </p>
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-sm border-b border-border">
                        <p className="text-xs text-yellow-500">
                          Smart wallet no disponible
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-foreground/5 rounded-xl transition-colors text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Desconectar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={!ready}
              className="btn-primary flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium hidden sm:inline">
                {ready ? 'Inicia Sesión' : 'Cargando...'}
              </span>
              <span className="font-medium sm:hidden">
                {ready ? 'Inicia' : '...'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Click outside handlers */}
      {showRoleDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowRoleDropdown(false)}
        />
      )}
      {showUserDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserDropdown(false)}
        />
      )}
      {showThemeDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowThemeDropdown(false)}
        />
      )}
    </header>
  )
}
