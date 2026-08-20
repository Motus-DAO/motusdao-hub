'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  color?: string
  isCurrency?: boolean
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'from-mauve-500 to-iris-500',
  isCurrency = false,
}: StatsCardProps) {
  const formatValue = (val: string | number) => {
    if (isCurrency && typeof val === 'string') {
      return val
    }
    if (typeof val === 'number') {
      return val.toLocaleString('es-ES')
    }
    return val
  }

  return (
    <GlassCard className="p-6 hover:scale-105 transition-transform duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
            trend >= 0
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          )}>
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold">{formatValue(value)}</p>
      </div>
    </GlassCard>
  )
}










