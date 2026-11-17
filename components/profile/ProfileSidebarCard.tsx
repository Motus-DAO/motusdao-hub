'use client'

import Image from 'next/image'
import { Camera, ChevronLeft, ChevronRight, Loader, User } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

const STORAGE_KEY = 'perfil-rail-collapsed'

export function readProfileRailCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

export function writeProfileRailCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
}

type ProfileSidebarCardProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
  displayName: string
  roleLabel: string
  avatarUrl?: string
  isEditing: boolean
  isUploadingAvatar: boolean
  onAvatarClick: () => void
}

export function ProfileSidebarCard({
  collapsed,
  onToggleCollapsed,
  displayName,
  roleLabel,
  avatarUrl,
  isEditing,
  isUploadingAvatar,
  onAvatarClick,
}: ProfileSidebarCardProps) {
  const avatarSizes = collapsed ? 'w-[5.5rem] h-[5.5rem] sm:w-24 sm:h-24' : 'w-32 h-32'

  return (
    <GlassCard
      className={`relative transition-all duration-300 ${
        collapsed ? 'p-2 lg:p-3' : 'p-6 text-center'
      }`}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={`absolute z-10 flex items-center justify-center rounded-full border border-white/15 bg-background/80 text-muted-foreground hover:text-foreground hover:border-mauve-500/40 transition-colors ${
          collapsed
            ? 'top-1 right-1 w-7 h-7'
            : 'top-3 right-3 w-8 h-8'
        }`}
        title={collapsed ? 'Mostrar perfil' : 'Solo mi foto'}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expandir panel de perfil' : 'Colapsar a solo foto'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className={`flex flex-col items-center ${collapsed ? 'gap-2 pt-6' : ''}`}>
        <div className="relative">
          <button
            type="button"
            onClick={collapsed ? onToggleCollapsed : onAvatarClick}
            disabled={false}
            className={`${avatarSizes} bg-gradient-mauve rounded-full flex items-center justify-center overflow-hidden mx-auto transition-all duration-300 ${
              isEditing && !collapsed ? 'cursor-pointer hover:opacity-80' : collapsed ? 'cursor-pointer hover:ring-2 hover:ring-mauve-500/50' : ''
            } ${isUploadingAvatar ? 'opacity-50' : ''}`}
            title={collapsed ? 'Abrir perfil' : isEditing ? 'Cambiar foto' : displayName}
          >
            {isUploadingAvatar ? (
              <Loader className={`${collapsed ? 'w-5 h-5' : 'w-8 h-8'} text-white animate-spin`} />
            ) : avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={collapsed ? 96 : 128}
                height={collapsed ? 96 : 128}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className={`${collapsed ? 'w-10 h-10' : 'w-16 h-16'} text-white`} />
            )}
          </button>
          {isEditing && !isUploadingAvatar && !collapsed && (
            <button
              type="button"
              onClick={onAvatarClick}
              className="absolute bottom-2 right-2 w-10 h-10 bg-mauve-500 rounded-full flex items-center justify-center hover:bg-mauve-600 transition-colors shadow-lg"
              title="Cambiar foto de perfil"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {!collapsed && (
          <>
            <h2 className="text-2xl font-bold mb-2 mt-4">{displayName}</h2>
            <p className="text-muted-foreground mb-4 capitalize">{roleLabel}</p>

            <div className="grid grid-cols-2 gap-4 mt-2 w-full">
              <div className="text-center">
                <div className="text-2xl font-bold text-mauve-500">-</div>
                <div className="text-sm text-muted-foreground">Sesiones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-mauve-500">-</div>
                <div className="text-sm text-muted-foreground">Cursos</div>
              </div>
            </div>
          </>
        )}
      </div>
    </GlassCard>
  )
}