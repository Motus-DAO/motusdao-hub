'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

type CourseProgressBarProps = {
  progress: number
  completed?: boolean
  label?: string
  className?: string
  compact?: boolean
}

export function CourseProgressBar({
  progress,
  completed = false,
  label = 'Progreso del curso',
  className = '',
  compact = false,
}: CourseProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress))

  return (
    <div className={className}>
      <div className={`flex items-center justify-between ${compact ? 'mb-1.5 text-xs' : 'mb-2 text-sm'}`}>
        <span className="text-muted-foreground">{label}</span>
        <motion.span
          key={clamped}
          initial={{ opacity: 0.5, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="font-semibold text-mauve-300"
        >
          {clamped}%
        </motion.span>
      </div>
      <div className={`overflow-hidden rounded-full bg-white/10 ${compact ? 'h-1.5' : 'h-2'}`}>
        <motion.div
          className={`h-full rounded-full ${
            completed
              ? 'bg-gradient-to-r from-green-500 via-emerald-400 to-mauve-400'
              : 'bg-gradient-to-r from-mauve-500 to-pink-500'
          }`}
          initial={false}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      {completed && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className={`flex items-center gap-2 text-green-300 ${compact ? 'mt-1.5 text-xs' : 'mt-2 text-xs'}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          ¡Curso completado!
        </motion.p>
      )}
    </div>
  )
}
