'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/store'
import { GradientText } from '@/components/ui/GradientText'

/** Deep link: abre el modal global (FoundingWaitlistModalHost). */
export default function FoundingPage() {
  const setOpen = useUIStore((s) => s.setFoundingModalOpen)

  useEffect(() => {
    setOpen(true)
  }, [setOpen])

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <GradientText as="h1" className="text-2xl font-semibold">
        Lista fundadora
      </GradientText>
      <p className="mt-3 text-sm text-muted-foreground">
        Si no ves el formulario, recarga la página o vuelve al inicio.
      </p>
    </div>
  )
}