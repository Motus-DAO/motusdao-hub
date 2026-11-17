'use client'

import { Edit, Heart, Shield, User } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'

type MotusAccountCardProps = {
  userId?: string | null
  email?: string | null
  role?: string | null
  displayName?: string
  /** Lleva a Datos personales, donde está el formulario editable */
  onEditPersonalData?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  usuario: 'Usuario (terapia / academia)',
  psm: 'Profesional de salud mental (PSM)',
  admin: 'Administración',
}

export function MotusAccountCard({
  userId,
  email,
  role,
  displayName,
  onEditPersonalData,
}: MotusAccountCardProps) {
  const roleKey = (role ?? '').toLowerCase()
  const roleLabel = ROLE_LABELS[roleKey] ?? role ?? 'Cuenta Motus'

  return (
    <GlassCard className="p-4 space-y-3 border border-white/10">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-mauve-400" />
        <h3 className="text-sm font-semibold">Tu cuenta Motus</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Identidad de producto (perfil, terapia, pagos PSM). Es independiente de la wallet con la que
        firmas en este momento. El nombre y el contacto se editan en{' '}
        <strong className="font-medium text-foreground/90">Datos personales</strong>.
      </p>

      {onEditPersonalData ? (
        <CTAButton type="button" size="sm" variant="secondary" className="w-full" onClick={onEditPersonalData}>
          <Edit className="mr-2 h-4 w-4" />
          Editar en Datos personales
        </CTAButton>
      ) : null}

      {displayName ? (
        <AccountDetailRow icon={User} label="Nombre en perfil" value={displayName} />
      ) : null}

      {userId ? (
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">userId</p>
          <p className="text-xs font-mono break-all">{userId}</p>
        </div>
      ) : null}

      {email ? <AccountDetailRow icon={User} label="Correo" value={email} /> : null}

      <div className="rounded-lg bg-white/5 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rol</p>
        <p className="text-sm flex items-center gap-1.5">
          {roleKey === 'psm' ? (
            <Heart className="h-3.5 w-3.5 text-mauve-400" />
          ) : (
            <User className="h-3.5 w-3.5 text-mauve-400" />
          )}
          {roleLabel}
        </p>
      </div>
    </GlassCard>
  )
}

function AccountDetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-xs break-all">{value}</p>
    </div>
  )
}