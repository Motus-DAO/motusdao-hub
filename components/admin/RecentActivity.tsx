'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { 
  UserPlus, 
  Heart, 
  Calendar, 
  DollarSign,
  MessageSquare,
  Clock,
  UserMinus,
  UserCheck
} from 'lucide-react'
// Simple date formatting without date-fns for now
function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'hace unos segundos'
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} minutos`
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`
  if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)} días`
  return `hace ${Math.floor(diffInSeconds / 604800)} semanas`
}

interface ActivityItem {
  id: string
  type: 'user_registered' | 'user_deleted' | 'user_restored' | 'match_created' | 'session_created' | 'payment' | 'message'
  title: string
  description: string
  timestamp: string
  icon: typeof UserPlus
}

export function RecentActivity() {
  // TEMPORAL: Sin autenticación
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // TEMPORAL: Sin privyId requerido
        const response = await authFetch('/api/admin/recent-activity')
        const data = await response.json()
        setActivities(data.activities || [])
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_registered':
        return UserPlus
      case 'user_deleted':
        return UserMinus
      case 'user_restored':
        return UserCheck
      case 'match_created':
        return Heart
      case 'session_created':
        return Calendar
      case 'payment':
        return DollarSign
      case 'message':
        return MessageSquare
      default:
        return Clock
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_registered':
        return 'from-blue-500 to-cyan-600'
      case 'user_deleted':
        return 'from-red-500 to-rose-600'
      case 'user_restored':
        return 'from-green-500 to-emerald-600'
      case 'match_created':
        return 'from-pink-500 to-rose-600'
      case 'session_created':
        return 'from-green-500 to-emerald-600'
      case 'payment':
        return 'from-yellow-500 to-orange-600'
      case 'message':
        return 'from-purple-500 to-pink-600'
      default:
        return 'from-mauve-500 to-purple-600'
    }
  }

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <GradientText as="h2" className="text-2xl font-bold mb-6">
        Actividad Reciente
      </GradientText>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No hay actividad reciente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            const color = getActivityColor(activity.type)

            return (
              <div
                key={activity.id}
                className="flex items-start space-x-4 p-4 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className={`w-10 h-10 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold mb-1">{activity.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp))}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}

