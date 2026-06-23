'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { StatsCard } from '@/components/admin/StatsCard'
import { RecentActivity } from '@/components/admin/RecentActivity'
import { 
  Users, 
  UserCheck, 
  Heart, 
  Calendar, 
  DollarSign, 
  GraduationCap,
  MessageSquare,
  TrendingUp,
  Activity
} from 'lucide-react'
import { motion } from 'framer-motion'
import { authFetch } from '@/lib/auth/client'

interface DashboardStats {
  totalUsers: number
  totalPSM: number
  totalAdmins: number
  activeMatches: number
  sessionsToday: number
  sessionsThisWeek: number
  sessionsThisMonth: number
  totalPayments: number
  totalRevenue: string
  publishedCourses: number
  totalEnrollments: number
  unreadMessages: number
  usersGrowth: number
  matchesGrowth: number
}

export default function AdminDashboard() {
  // TEMPORAL: Sin autenticación
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // TEMPORAL: Sin privyId requerido
        const response = await authFetch('/api/admin/stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-64"></div>
            <div className="h-4 bg-white/10 rounded w-48"></div>
          </div>
        </GlassCard>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-8 text-center">
          <p className="text-muted-foreground">Error al cargar estadísticas</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GradientText as="h1" className="text-4xl font-bold mb-2">
          Dashboard de Administración
        </GradientText>
        <p className="text-muted-foreground">
          Visión general de la plataforma MotusDAO Hub
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatsCard
            title="Total Usuarios"
            value={stats.totalUsers}
            icon={Users}
            trend={stats.usersGrowth}
            color="from-blue-500 to-cyan-600"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatsCard
            title="Profesionales (PSM)"
            value={stats.totalPSM}
            icon={UserCheck}
            color="from-purple-500 to-pink-600"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <StatsCard
            title="Matches Activos"
            value={stats.activeMatches}
            icon={Heart}
            trend={stats.matchesGrowth}
            color="from-pink-500 to-rose-600"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <StatsCard
            title="Sesiones Hoy"
            value={stats.sessionsToday}
            icon={Calendar}
            color="from-green-500 to-emerald-600"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <StatsCard
            title="Ingresos Totales"
            value={stats.totalRevenue}
            icon={DollarSign}
            color="from-yellow-500 to-orange-600"
            isCurrency
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <StatsCard
            title="Cursos Publicados"
            value={stats.publishedCourses}
            icon={GraduationCap}
            color="from-indigo-500 to-blue-600"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <StatsCard
            title="Inscripciones"
            value={stats.totalEnrollments}
            icon={TrendingUp}
            color="from-teal-500 to-cyan-600"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <StatsCard
            title="Mensajes Pendientes"
            value={stats.unreadMessages}
            icon={MessageSquare}
            color="from-amber-500 to-yellow-600"
          />
        </motion.div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sesiones Esta Semana</p>
                <p className="text-2xl font-bold">{stats.sessionsThisWeek}</p>
              </div>
              <Activity className="w-8 h-8 text-mauve-500" />
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sesiones Este Mes</p>
                <p className="text-2xl font-bold">{stats.sessionsThisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-mauve-500" />
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Transacciones</p>
                <p className="text-2xl font-bold">{stats.totalPayments}</p>
              </div>
              <DollarSign className="w-8 h-8 text-mauve-500" />
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      >
        <RecentActivity />
      </motion.div>
    </div>
  )
}

