import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, ReactNode } from "react"

interface CTAButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
}

export function CTAButton({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  glow = false,
  ...props
}: CTAButtonProps) {
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "bg-transparent hover:bg-white/5 text-foreground border-white/10 smooth-transition"
  }

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium focus-ring",
        variantClasses[variant],
        sizeClasses[size],
        glow && "shadow-glow hover:shadow-glow",
        props.disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
