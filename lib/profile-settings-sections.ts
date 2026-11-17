export type ProfileSectionId =
  | 'perfil-cuenta'
  | 'perfil-personal'
  | 'perfil-wallets'
  | 'perfil-motus'
  | 'perfil-saldos'
  | 'perfil-spei'
  | 'perfil-stripe'
  | 'perfil-terapia'
  | 'perfil-membresias'
  | 'perfil-preferencias'

export type ProfileSectionRole = 'usuario' | 'psm' | 'admin'

export interface ProfileSectionDef {
  id: ProfileSectionId
  label: string
  description: string
  /** Si se omite, visible para todos los roles con sesión */
  roles?: ProfileSectionRole[]
}

export const PROFILE_SETTINGS_SECTIONS: ProfileSectionDef[] = [
  {
    id: 'perfil-cuenta',
    label: 'Tu cuenta',
    description:
      'userId, correo, rol Motus y color de acento de la app. No confundir con la wallet de sesión.',
  },
  {
    id: 'perfil-personal',
    label: 'Datos personales',
    description: 'Nombre, contacto, biografía e idiomas (varios + interfaz del Hub).',
  },
  {
    id: 'perfil-wallets',
    label: 'Wallets vinculadas',
    description:
      'Direcciones con las que puedes iniciar sesión en la misma cuenta (Human, Thirdweb, etc.).',
  },
  {
    id: 'perfil-motus',
    label: 'Nombres .motus',
    description:
      'Alias on-chain por wallet: registro, cobro y transferencia del NFT entre tus wallets.',
  },
  {
    id: 'perfil-saldos',
    label: 'Saldos',
    description:
      'Balances por wallet vinculada (solo lectura). Los pagos usan la wallet de sesión activa.',
  },
  {
    id: 'perfil-spei',
    label: 'SPEI / CLABE',
    description: 'Datos para recibir transferencias bancarias en México (terapia y cobros).',
    roles: ['usuario', 'psm'],
  },
  {
    id: 'perfil-stripe',
    label: 'Stripe Connect',
    description: 'Cuenta de cobro para terapia y academía como profesional (PSM).',
    roles: ['psm'],
  },
  {
    id: 'perfil-terapia',
    label: 'Terapia y emparejamiento',
    description:
      'Tu profesional o tus pacientes, videoconsulta, resúmenes compartidos y modo de sala.',
    roles: ['usuario', 'psm'],
  },
  {
    id: 'perfil-membresias',
    label: 'Membresías Academia',
    description: 'Suscripciones mensuales a cursos: estado, renovación y cancelación.',
  },
  {
    id: 'perfil-preferencias',
    label: 'Preferencias',
    description: 'Rol de interfaz, privacidad y notificaciones (opciones en evolución).',
  },
]

export const PROFILE_PREFERENCE_ITEMS = [
  {
    id: 'rol',
    title: 'Rol preferido',
    description:
      'Define si navegas como paciente/usuario o como profesional (PSM). Afecta menús y flujos clínicos.',
  },
  {
    id: 'privacidad',
    title: 'Privacidad',
    description:
      'Políticas de datos, consentimientos y visibilidad. Consulta también /privacy y /cookies.',
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones',
    description:
      'Preferencias de avisos por correo o en app (próximamente). No afecta recordatorios clínicos críticos.',
  },
] as const

export function profileSectionsForRole(
  role: string | null | undefined,
): ProfileSectionDef[] {
  const normalized = (role ?? 'usuario').toLowerCase() as ProfileSectionRole
  return PROFILE_SETTINGS_SECTIONS.filter((section) => {
    if (!section.roles) return true
    return section.roles.includes(normalized)
  })
}

export function isProfileSectionId(value: string): value is ProfileSectionId {
  return PROFILE_SETTINGS_SECTIONS.some((s) => s.id === value)
}

export function getProfileSection(id: ProfileSectionId): ProfileSectionDef | undefined {
  return PROFILE_SETTINGS_SECTIONS.find((s) => s.id === id)
}