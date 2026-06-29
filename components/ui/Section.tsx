import { cn } from "@/lib/utils"
import { ReactNode, CSSProperties } from "react"

interface SectionProps {
  children: ReactNode
  className?: string
  id?: string
  padding?: 'sm' | 'md' | 'lg' | 'xl'
  style?: CSSProperties
}

export function Section({ 
  children, 
  className, 
  id,
  padding = 'lg',
  style
}: SectionProps) {
  const paddingClasses = {
    sm: 'py-6 sm:py-8',
    md: 'py-8 sm:py-12',
    lg: 'py-10 sm:py-16',
    xl: 'py-12 sm:py-24',
  }

  return (
    <section
      id={id}
      className={cn(
        "w-full",
        paddingClasses[padding],
        className
      )}
      style={style}
    >
      {children}
    </section>
  )
}
