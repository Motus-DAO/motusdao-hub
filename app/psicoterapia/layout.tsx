import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Psicoterapia online | MotusDAO',
  description:
    'Directorio de psicólogos verificados para teleterapia en LATAM. Sesiones por videollamada desde $45 USD.',
}

export default function PsicoterapiaLayout({ children }: { children: React.ReactNode }) {
  return children
}
