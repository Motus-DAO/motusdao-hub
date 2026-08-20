'use client'

import { getEffectiveAccentColor } from '@/lib/accent-color'
import { useUIStore } from '@/lib/store'
import { useLayoutEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, accentColor } = useUIStore()

  useLayoutEffect(() => {
    const root = window.document.documentElement
    const effectiveAccent = getEffectiveAccentColor(theme, accentColor)
    
    // Remove all theme classes and data attributes
    root.classList.remove('light', 'dark')
    root.removeAttribute('data-theme')
    root.removeAttribute('data-matrix-color')
    root.removeAttribute('data-accent-color')
    
    root.setAttribute('data-accent-color', effectiveAccent)

    // Apply the current theme
    if (theme === 'matrix') {
      root.setAttribute('data-theme', 'matrix')
      root.setAttribute('data-matrix-color', effectiveAccent)
    } else {
      root.classList.add(theme)
    }
  }, [theme, accentColor])

  return <>{children}</>
}
