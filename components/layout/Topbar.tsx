'use client'

import { useUIStore } from '@/lib/store'
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
import { usePathname, useRouter } from 'next/navigation'
import { useWallet, useWallets, getWalletIdentity, appendWalletIdentityParams } from '@/lib/wallet'
import { createPortal } from 'react-dom'
import { useSmartAccount } from '@/lib/contexts/ZeroDevSmartWalletProvider'
import { identifyEmbeddedWallet } from '@/lib/wallet-utils'

export function Topbar() {
  const { 
    role, 
    setRole,
    setIsPlatformAdmin,
    sidebarOpen, 
    toggleSidebar, 
    theme, 
    setTheme
  } = useUIStore()
  const pathname = usePathname()
  const router = useRouter()
  
  // WaaP authentication hooks (replaces Privy)
  const { ready, authenticated, user, login, logout, providerId } = useWallet()
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const roleButtonRef = useRef<HTMLButtonElement>(null)

  const handleRoleChange = (newRole: 'usuario' | 'psm' | 'admin') => {
    setRole(newRole)
    setShowRoleDropdown(false)
    if (newRole === 'admin') {
      router.push('/admin')
      return
    }
    // Leaving admin shell — land on a non-admin page so the menu can switch
    if (pathname?.startsWith('/admin')) {
      router.push(newRole === 'psm' ? '/disponibilidad' : '/')
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

  // Keep UI role aligned with /admin without fighting the toggle
  useEffect(() => {
    if (pathname?.startsWith('/admin') && role !== 'admin') {
      setRole('admin')
    }
  }, [pathname, role, setRole])

  // Sync platform-admin flag from database when user is authenticated.
  // Do NOT overwrite an intentional admin/psm UI choice for dual-role users.
  useEffect(() => {
    const syncUserRole = async () => {
      if (!ready || !authenticated || !user) return

      const userEmail = user?.email?.address || user?.google?.email
      const walletIdentity = getWalletIdentity(user, providerId)

      if (!userEmail && !walletIdentity) return

      try {
        const params = new URLSearchParams()
        appendWalletIdentityParams(params, walletIdentity)
        if (userEmail) params.append('email', userEmail)

        const response = await fetch(`/api/profile?${params.toString()}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.user?.role) {
            const dbRole = data.user.role as 'usuario' | 'psm' | 'admin'
            const platformAdmin =
              data.user.isPlatformAdmin === true || dbRole === 'admin'
            setIsPlatformAdmin(platformAdmin)

            if (platformAdmin) {
              // Dual role: UI toggle is the source of truth (plus /admin URL).
              return
            }

            if (dbRole !== role) {
              console.log('🔄 Syncing user role from database:', {
                currentRole: role,
                databaseRole: dbRole,
                updating: true
              })
              setRole(dbRole)
            }
          }
        } else if (response.status === 404) {
          console.log('ℹ️ User not registered yet, keeping current role')
        }
      } catch (err) {
        console.error('Error syncing user role:', err)
      }
    }

    syncUserRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user?.id])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'matrix') => {
    setTheme(newTheme)
    setShowThemeDropdown(false)
  }

  const handleLogin = () => {
    void login()
  }

  const handleLogout = () => {
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
      <div className="flex h-12 sm:h-16 items-center justify-between px-3 sm:px-6">
        {/* Left side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-foreground/5 rounded-xl transition-colors"
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Role Selector */}
          <div className="relative">
            <button
              ref={roleButtonRef}
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="relative min-w-[132px] rounded-2xl border border-border bg-foreground/5 backdrop-blur-xl px-4 h-10 flex items-center gap-2 hover:bg-foreground/10 transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Selector de rol"
            >
              <span className="text-xs sm:text-sm font-medium capitalize">{role}</span>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
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
                    <button
                      onClick={() => handleRoleChange('usuario')}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-sm text-foreground/90 hover:bg-foreground/5 hover:text-foreground cursor-pointer focus:bg-foreground/10 focus:outline-none transition-colors",
                        role === 'usuario' 
                          ? "bg-foreground/10 text-foreground" 
                          : "text-foreground/90"
                      )}
                    >
                      Usuario
                    </button>
                    <button
                      onClick={() => handleRoleChange('psm')}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-sm text-foreground/90 hover:bg-foreground/5 hover:text-foreground cursor-pointer focus:bg-foreground/10 focus:outline-none transition-colors",
                        role === 'psm' 
                          ? "bg-foreground/10 text-foreground" 
                          : "text-foreground/90"
                      )}
                    >
                      PSM
                    </button>
                    <button
                      onClick={() => handleRoleChange('admin')}
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
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Theme Toggle Dropdown */}
          <div className="relative">
          <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className="p-2 hover:bg-foreground/5 rounded-xl transition-colors focus-ring"
              aria-label="Theme selector"
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
                <div className="absolute top-full right-0 mt-2 w-80 glass-strong border border-border rounded-xl shadow-lg z-50">
                  <div className="p-3 space-y-3">
                    {/* Email */}
                    <div className="px-3 py-2 text-sm border-b border-border">
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
