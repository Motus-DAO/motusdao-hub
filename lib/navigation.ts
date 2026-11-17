import type { UserRole } from './store'

export type NavItem = { name: string; href: string; icon: string }
export type NavGroup = { title: string | null; items: NavItem[] }
export type NavOptions = {
  /** Adds the admin entry without forcing the admin shell on every route. */
  isPlatformAdmin?: boolean
}

/**
 * Navigation grouped by domain: practice (clinical), finance, learn, account.
 *
 * URLs stay where they are on purpose. `/cobros/*` is pinned by the six Stripe
 * Site links (`https://app.motusdao.org/cobros/...`); moving it breaks live
 * AccountSessions and AccountLinks. The finance hub links, it does not rewrite.
 *
 * `role` is the *active* role. `isPlatformAdmin` only adds the entry to the
 * admin panel; it never grants a role.
 */
export const getNavigationGroups = (
  role: UserRole,
  options: NavOptions = {}
): NavGroup[] => {
  const practice: NavItem[] = [
    { name: 'Psychat', href: '/psychat', icon: 'Bot' },
    ...(role === 'usuario'
      ? ([{ name: 'Psicoterapia', href: '/psicoterapia', icon: 'Heart' }] as NavItem[])
      : ([
          { name: 'Mis usuarios', href: '/mis-usuarios', icon: 'Users' },
          { name: 'Disponibilidad', href: '/disponibilidad', icon: 'Calendar' },
          { name: 'Supervisión', href: '/supervision', icon: 'Eye' },
        ] as NavItem[])),
    { name: 'Bitácora', href: '/bitacora', icon: 'BookOpen' },
    { name: 'Videochat', href: '/videochat', icon: 'Video' },
  ]

  const finance: NavItem[] = [
    { name: role === 'usuario' ? 'Pagos' : 'Resumen', href: '/finanzas', icon: 'Wallet' },
    { name: 'Wallet', href: '/pagos', icon: 'Landmark' },
    ...(role === 'usuario'
      ? ([] as NavItem[])
      : ([
          { name: 'Cobros', href: '/cobros', icon: 'CreditCard' },
          { name: 'Depósitos', href: '/finanzas/depositos', icon: 'Landmark' },
          { name: 'Sesiones', href: '/pagos/sesiones', icon: 'Calendar' },
        ] as NavItem[])),
  ]

  const account: NavItem[] = [
    ...(role === 'admin' || options.isPlatformAdmin
      ? ([{ name: 'Admin', href: '/admin', icon: 'Shield' }] as NavItem[])
      : []),
    { name: 'Perfil', href: '/perfil', icon: 'User' },
  ]

  return [
    { title: null, items: [{ name: 'Inicio', href: '/', icon: 'Home' }] },
    { title: 'Práctica', items: practice },
    { title: 'Finanzas', items: finance },
    {
      title: 'Aprender',
      items: [{ name: 'Academia', href: '/academia', icon: 'GraduationCap' }],
    },
    { title: 'Cuenta', items: account },
  ]
}

/** Flat list for callers that do not render group headers. */
export const getNavigationItems = (
  role: UserRole,
  options: NavOptions = {}
): NavItem[] => getNavigationGroups(role, options).flatMap((group) => group.items)
