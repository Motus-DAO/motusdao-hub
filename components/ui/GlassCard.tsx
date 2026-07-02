import { cn } from "@/lib/utils"
import { ReactNode, MouseEventHandler, CSSProperties } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'strong'
  hover?: boolean
  onClick?: MouseEventHandler<HTMLDivElement>
  style?: CSSProperties
}

export function GlassCard({ 
  children, 
  className, 
  variant = 'default',
  hover = false,
  onClick,
  style,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "smooth-transition",
        variant === 'default' 
          ? "glass" 
          : "glass-strong",
        hover && "hover:bg-foreground/5 hover:scale-[1.02] hover:shadow-glow dark:hover:bg-white/20",
        className,
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}
