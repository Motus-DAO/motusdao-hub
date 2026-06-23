'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { motion } from 'framer-motion'
import { 
  Heart, 
  Search, 
  Filter,
  Eye,
  Pause,
  X,
  Calendar,
  User,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Trash2
} from 'lucide-react'

interface Match {
  id: string
  userId: string
  psmId: string
  status: 'active' | 'paused' | 'ended'
  matchedAt: string
  endedAt: string | null
  reason: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    profile: {
      nombre: string
      apellido: string
      telefono: string
      ciudad: string
      pais: string
      avatarUrl: string | null
    } | null
    patient: {
      tipoAtencion: string
      problematica: string
    } | null
  } | null
  psm: {
    id: string
    email: string
    profile: {
      nombre: string
      apellido: string
      telefono: string
      ciudad: string
      pais: string
      avatarUrl: string | null
    } | null
    psm: {
      cedulaProfesional: string
      experienciaAnios: number
      especialidades: string
    } | null
  } | null
  sessions: {
    total: number
    completed: number
    list: Array<{
      id: string
      status: string
      createdAt: string | null
      completedAt: string | null
    }>
  }
}

interface MatchesResponse {
  matches: Match[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    total: number
    active: number
    paused: number
    ended: number
  }
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<MatchesResponse['pagination'] | null>(null)
  const [stats, setStats] = useState<MatchesResponse['stats'] | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      })
      
      if (search) {
        params.append('search', search)
      }
      
      if (statusFilter) {
        params.append('status', statusFilter)
      }

      const response = await authFetch(`/api/admin/matches?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: MatchesResponse = await response.json()
      
      setMatches(data?.matches || [])
      setPagination(data?.pagination || null)
      setStats(data?.stats || null)
    } catch (error) {
      console.error('Error fetching matches:', error)
      setMatches([])
      setPagination(null)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, statusFilter])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const handleUpdateMatch = async (matchId: string, status: 'active' | 'paused' | 'ended', reason?: string) => {
    setActionLoading(matchId)
    try {
      const response = await fetch(`/api/matching/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, reason }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el match')
      }

      // Refresh matches
      await fetchMatches()
      if (selectedMatch?.id === matchId) {
        setSelectedMatch(null)
      }
    } catch (error) {
      console.error('Error updating match:', error)
      alert('Error al actualizar el match. Por favor, intenta de nuevo.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar este match? Esta acción también eliminará todas las sesiones asociadas y no se puede deshacer.'
    )

    if (!confirmed) return

    setActionLoading(matchId)
    try {
      const response = await fetch(`/api/matching/${matchId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar el match')
      }

      // Refresh matches
      await fetchMatches()
      if (selectedMatch?.id === matchId) {
        setSelectedMatch(null)
      }
    } catch (error) {
      console.error('Error deleting match:', error)
      alert('Error al eliminar el match. Por favor, intenta de nuevo.')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'ended':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'paused':
        return 'Pausado'
      case 'ended':
        return 'Finalizado'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && !matches.length) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GradientText as="h1" className="text-4xl font-bold mb-2">
          Gestión de Matches
        </GradientText>
        <p className="text-muted-foreground">
          Visualiza y gestiona todos los emparejamientos entre usuarios y profesionales
        </p>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Matches</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Heart className="w-8 h-8 text-pink-500" />
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Activos</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pausados</p>
                  <p className="text-2xl font-bold">{stats.paused}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Finalizados</p>
                  <p className="text-2xl font-bold">{stats.ended}</p>
                </div>
                <XCircle className="w-8 h-8 text-gray-500" />
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <GlassCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre, email de usuario o PSM..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="paused">Pausados</option>
                <option value="ended">Finalizados</option>
              </select>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Pagination Info */}
      {pagination && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {matches.length} de {pagination.total} matches
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-4 py-2 text-sm">
                  Página {currentPage} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Matches Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <GlassCard className="p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Usuario</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">PSM</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Fecha Match</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Sesiones</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {matches && matches.length > 0 ? matches.map((match, index) => (
                <motion.tr
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                        {match.user?.profile ? (
                          <span className="text-white font-semibold text-sm">
                            {match.user.profile.nombre[0]}{match.user.profile.apellido[0]}
                          </span>
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {match.user?.profile 
                            ? `${match.user.profile.nombre} ${match.user.profile.apellido}`
                            : 'Sin perfil'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {match.user?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        {match.psm?.profile ? (
                          <span className="text-white font-semibold text-sm">
                            {match.psm.profile.nombre[0]}{match.psm.profile.apellido[0]}
                          </span>
                        ) : (
                          <UserCheck className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {match.psm?.profile 
                            ? `${match.psm.profile.nombre} ${match.psm.profile.apellido}`
                            : 'Sin perfil'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {match.psm?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(match.status)}`}>
                      {getStatusLabel(match.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(match.matchedAt)}</span>
                    </div>
                    {match.endedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <XCircle className="w-3 h-3" />
                        <span>Finalizado: {formatDate(match.endedAt)}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {match.sessions.completed}/{match.sessions.total}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedMatch(match)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      {match.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleUpdateMatch(match.id, 'paused')}
                            disabled={actionLoading === match.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg hover:bg-yellow-500/30 text-sm disabled:opacity-50"
                          >
                            <Pause className="w-4 h-4" />
                            {actionLoading === match.id ? '...' : 'Pausar'}
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Razón de finalización (opcional):')
                              if (reason !== null) {
                                handleUpdateMatch(match.id, 'ended', reason || undefined)
                              }
                            }}
                            disabled={actionLoading === match.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 text-sm disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            {actionLoading === match.id ? '...' : 'Finalizar'}
                          </button>
                        </>
                      )}
                      {match.status === 'paused' && (
                        <button
                          onClick={() => handleUpdateMatch(match.id, 'active')}
                          disabled={actionLoading === match.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-lg hover:bg-green-500/30 text-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {actionLoading === match.id ? '...' : 'Reanudar'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        disabled={actionLoading === match.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 text-sm disabled:opacity-50"
                        title="Eliminar match"
                      >
                        <Trash2 className="w-4 h-4" />
                        {actionLoading === match.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )) : null}
            </tbody>
          </table>

          {(!matches || matches.length === 0) && (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron matches</p>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <GradientText as="h2" className="text-2xl">
                  Detalles del Match
                </GradientText>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteMatch(selectedMatch.id)}
                    disabled={actionLoading === selectedMatch.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 text-sm disabled:opacity-50"
                    title="Eliminar match permanentemente"
                  >
                    <Trash2 className="w-4 h-4" />
                    {actionLoading === selectedMatch.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Status and Dates */}
                <GlassCard className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Estado y Fechas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Estado</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(selectedMatch.status)}`}>
                        {getStatusLabel(selectedMatch.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Fecha de Match</p>
                      <p>{formatDate(selectedMatch.matchedAt)}</p>
                    </div>
                    {selectedMatch.endedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fecha de Finalización</p>
                        <p>{formatDate(selectedMatch.endedAt)}</p>
                      </div>
                    )}
                    {selectedMatch.reason && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-1">Razón de Finalización</p>
                        <p>{selectedMatch.reason}</p>
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* User Info Card */}
                {selectedMatch.user && (
                  <GlassCard className="p-4 border-l-4 border-blue-500/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-400" />
                      Usuario
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                        <p className="font-medium">
                          {selectedMatch.user.profile 
                            ? `${selectedMatch.user.profile.nombre} ${selectedMatch.user.profile.apellido}`
                            : 'Sin perfil'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                        <p className="font-medium">{selectedMatch.user.email}</p>
                      </div>
                      {selectedMatch.user.profile && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Ubicación</p>
                            <p>{selectedMatch.user.profile.ciudad}, {selectedMatch.user.profile.pais}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                            <p>{selectedMatch.user.profile.telefono}</p>
                          </div>
                        </>
                      )}
                      {selectedMatch.user.patient && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Tipo de Atención</p>
                            <p>{selectedMatch.user.patient.tipoAtencion}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Problemática</p>
                            <p>{selectedMatch.user.patient.problematica}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </GlassCard>
                )}

                {/* PSM Info Card */}
                {selectedMatch.psm && (
                  <GlassCard className="p-4 border-l-4 border-purple-500/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-purple-400" />
                      Profesional (PSM)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                        <p className="font-medium">
                          {selectedMatch.psm.profile 
                            ? `${selectedMatch.psm.profile.nombre} ${selectedMatch.psm.profile.apellido}`
                            : 'Sin perfil'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                        <p className="font-medium">{selectedMatch.psm.email}</p>
                      </div>
                      {selectedMatch.psm.profile && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Ubicación</p>
                            <p>{selectedMatch.psm.profile.ciudad}, {selectedMatch.psm.profile.pais}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                            <p>{selectedMatch.psm.profile.telefono}</p>
                          </div>
                        </>
                      )}
                      {selectedMatch.psm.psm && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Cédula Profesional</p>
                            <p>{selectedMatch.psm.psm.cedulaProfesional}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Experiencia</p>
                            <p>{selectedMatch.psm.psm.experienciaAnios} años</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground mb-1">Especialidades</p>
                            <p>{selectedMatch.psm.psm.especialidades}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </GlassCard>
                )}

                {/* Sessions Card */}
                <GlassCard className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Sesiones
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Total de Sesiones</span>
                      </div>
                      <span className="font-semibold">{selectedMatch.sessions.total}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm">Sesiones Completadas</span>
                      </div>
                      <span className="font-semibold">{selectedMatch.sessions.completed}</span>
                    </div>
                    {selectedMatch.sessions.list.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Historial de Sesiones</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedMatch.sessions.list.map((session) => (
                            <div key={session.id} className="p-2 bg-white/5 rounded text-xs">
                              <div className="flex items-center justify-between">
                                <span className="capitalize">{session.status}</span>
                                {session.createdAt && (
                                  <span className="text-muted-foreground">
                                    {formatDate(session.createdAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  )
}

