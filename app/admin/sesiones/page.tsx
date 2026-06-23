'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Search, 
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  UserCheck,
  Video,
  ExternalLink,
  MessageSquare
} from 'lucide-react'

interface Session {
  id: string
  userId: string
  psmId: string
  matchId: string | null
  status: 'requested' | 'accepted' | 'completed' | 'cancelled'
  mode: string
  externalUrl: string
  requestedAt: string
  acceptedAt: string | null
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
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
  match: {
    id: string
    status: string
    matchedAt: string | null
  } | null
}

interface SessionsResponse {
  sessions: Session[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    total: number
    requested: number
    accepted: number
    completed: number
    cancelled: number
  }
}

export default function AdminSesionesPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<SessionsResponse['pagination'] | null>(null)
  const [stats, setStats] = useState<SessionsResponse['stats'] | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  const fetchSessions = useCallback(async () => {
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

      const response = await authFetch(`/api/admin/sessions?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: SessionsResponse = await response.json()
      
      setSessions(data?.sessions || [])
      setPagination(data?.pagination || null)
      setStats(data?.stats || null)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setSessions([])
      setPagination(null)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, statusFilter])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'accepted':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested':
        return 'Solicitada'
      case 'accepted':
        return 'Aceptada'
      case 'completed':
        return 'Completada'
      case 'cancelled':
        return 'Cancelada'
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

  if (loading && !sessions.length) {
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
          Gestión de Sesiones
        </GradientText>
        <p className="text-muted-foreground">
          Visualiza y gestiona todas las sesiones de terapia de la plataforma
        </p>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Sesiones</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Solicitadas</p>
                  <p className="text-2xl font-bold">{stats.requested}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Aceptadas</p>
                  <p className="text-2xl font-bold">{stats.accepted}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-500" />
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completadas</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Canceladas</p>
                  <p className="text-2xl font-bold">{stats.cancelled}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
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
                placeholder="Buscar por nombre, email de usuario o PSM, URL..."
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
                <option value="requested">Solicitadas</option>
                <option value="accepted">Aceptadas</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
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
                Mostrando {sessions.length} de {pagination.total} sesiones
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

      {/* Sessions Table */}
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Fecha Solicitud</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">URL</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sessions && sessions.length > 0 ? sessions.map((session, index) => (
                <motion.tr
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                        {session.user?.profile ? (
                          <span className="text-white font-semibold text-sm">
                            {session.user.profile.nombre[0]}{session.user.profile.apellido[0]}
                          </span>
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {session.user?.profile 
                            ? `${session.user.profile.nombre} ${session.user.profile.apellido}`
                            : 'Sin perfil'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.user?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        {session.psm?.profile ? (
                          <span className="text-white font-semibold text-sm">
                            {session.psm.profile.nombre[0]}{session.psm.profile.apellido[0]}
                          </span>
                        ) : (
                          <UserCheck className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {session.psm?.profile 
                            ? `${session.psm.profile.nombre} ${session.psm.profile.apellido}`
                            : 'Sin perfil'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.psm?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(session.status)}`}>
                      {getStatusLabel(session.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(session.requestedAt)}</span>
                    </div>
                    {session.acceptedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Aceptada: {formatDate(session.acceptedAt)}</span>
                      </div>
                    )}
                    {session.completedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span>Completada: {formatDate(session.completedAt)}</span>
                      </div>
                    )}
                    {session.cancelledAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <XCircle className="w-3 h-3 text-red-400" />
                        <span>Cancelada: {formatDate(session.cancelledAt)}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <a
                      href={session.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      <Video className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{session.externalUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalles
                    </button>
                  </td>
                </motion.tr>
              )) : null}
            </tbody>
          </table>

          {(!sessions || sessions.length === 0) && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron sesiones</p>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <GradientText as="h2" className="text-2xl">
                  Detalles de la Sesión
                </GradientText>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
                >
                  ✕
                </button>
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(selectedSession.status)}`}>
                        {getStatusLabel(selectedSession.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Modo</p>
                      <p className="capitalize">{selectedSession.mode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Fecha de Solicitud</p>
                      <p>{formatDate(selectedSession.requestedAt)}</p>
                    </div>
                    {selectedSession.acceptedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fecha de Aceptación</p>
                        <p>{formatDate(selectedSession.acceptedAt)}</p>
                      </div>
                    )}
                    {selectedSession.startedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fecha de Inicio</p>
                        <p>{formatDate(selectedSession.startedAt)}</p>
                      </div>
                    )}
                    {selectedSession.completedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fecha de Finalización</p>
                        <p>{formatDate(selectedSession.completedAt)}</p>
                      </div>
                    )}
                    {selectedSession.cancelledAt && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fecha de Cancelación</p>
                        <p>{formatDate(selectedSession.cancelledAt)}</p>
                      </div>
                    )}
                    {selectedSession.cancelReason && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-1">Razón de Cancelación</p>
                        <p>{selectedSession.cancelReason}</p>
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* Session URL */}
                <GlassCard className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    URL de Videochat
                  </h3>
                  <a
                    href={selectedSession.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 break-all"
                  >
                    <span>{selectedSession.externalUrl}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </GlassCard>

                {/* User Info */}
                {selectedSession.user && (
                  <GlassCard className="p-4 border-l-4 border-blue-500/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-400" />
                      Usuario
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                        <p className="font-medium">
                          {selectedSession.user.profile 
                            ? `${selectedSession.user.profile.nombre} ${selectedSession.user.profile.apellido}`
                            : 'Sin perfil'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                        <p className="font-medium">{selectedSession.user.email}</p>
                      </div>
                      {selectedSession.user.profile && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Ubicación</p>
                            <p>{selectedSession.user.profile.ciudad}, {selectedSession.user.profile.pais}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                            <p>{selectedSession.user.profile.telefono}</p>
                          </div>
                        </>
                      )}
                      {selectedSession.user.patient && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Tipo de Atención</p>
                            <p>{selectedSession.user.patient.tipoAtencion}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Problemática</p>
                            <p>{selectedSession.user.patient.problematica}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </GlassCard>
                )}

                {/* PSM Info */}
                {selectedSession.psm && (
                  <GlassCard className="p-4 border-l-4 border-purple-500/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-purple-400" />
                      Profesional (PSM)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                        <p className="font-medium">
                          {selectedSession.psm.profile 
                            ? `${selectedSession.psm.profile.nombre} ${selectedSession.psm.profile.apellido}`
                            : 'Sin perfil'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                        <p className="font-medium">{selectedSession.psm.email}</p>
                      </div>
                      {selectedSession.psm.profile && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Ubicación</p>
                            <p>{selectedSession.psm.profile.ciudad}, {selectedSession.psm.profile.pais}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                            <p>{selectedSession.psm.profile.telefono}</p>
                          </div>
                        </>
                      )}
                      {selectedSession.psm.psm && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Cédula Profesional</p>
                            <p>{selectedSession.psm.psm.cedulaProfesional}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Experiencia</p>
                            <p>{selectedSession.psm.psm.experienciaAnios} años</p>
                          </div>
                        </>
                      )}
                    </div>
                  </GlassCard>
                )}

                {/* Match Info */}
                {selectedSession.match && (
                  <GlassCard className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Match Relacionado
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">ID del Match</p>
                        <p className="font-mono text-sm">{selectedSession.match.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Estado del Match</p>
                        <span className="capitalize">{selectedSession.match.status}</span>
                      </div>
                      {selectedSession.match.matchedAt && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Fecha de Match</p>
                          <p>{formatDate(selectedSession.match.matchedAt)}</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  )
}










