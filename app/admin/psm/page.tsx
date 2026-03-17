'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { 
  UserCheck, 
  Search, 
  Eye,
  Mail,
  MapPin,
  Award,
  Calendar,
  Users,
  DollarSign,
  Filter,
  ChevronRight,
  Trash2,
  Wallet
} from 'lucide-react'
import { motion } from 'framer-motion'

interface PSM {
  id: string
  email: string
  eoaAddress: string
  smartWalletAddress: string | null
  privyId: string | null
  nombre: string
  apellido: string
  telefono: string
  avatarUrl: string | null
  ciudad: string
  pais: string
  bio: string
  cedulaProfesional: string
  formacionAcademica: string
  experienciaAnios: number
  especialidades: string[]
  participaSupervision: boolean
  participaCursos: boolean
  participaInvestigacion: boolean
  participaComunidad: boolean
  activeMatches: number
  totalMatches: number
  completedSessions: number
  totalSessions: number
  totalRevenue: number
  capacity: {
    current: number
    max: number
    available: number
  }
  registrationCompleted: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export default function AdminPSMPage() {
  const [psms, setPsms] = useState<PSM[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCapacity, setFilterCapacity] = useState<'all' | 'available' | 'full'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedPSM, setSelectedPSM] = useState<PSM | null>(null)

  const fetchPSMs = async () => {
    try {
      const response = await fetch('/api/admin/psm')
      const data = await response.json()
      if (data.success) {
        setPsms(data.psms || [])
      }
    } catch (error) {
      console.error('Error fetching PSMs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPSMs()
  }, [])

  const handleDeletePSM = async (psmId: string) => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar este profesional? Esta acción eliminará todos los datos asociados (perfil, matches, sesiones, pagos, etc.) y no se puede deshacer.'
    )

    if (!confirmed) return

    setActionLoading(psmId)
    try {
      const response = await fetch(`/api/admin/psm/${psmId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar el profesional')
      }

      // Refresh PSMs
      await fetchPSMs()
      if (selectedPSM?.id === psmId) {
        setSelectedPSM(null)
      }
    } catch (error) {
      console.error('Error deleting PSM:', error)
      alert(error instanceof Error ? error.message : 'Error al eliminar el profesional. Por favor, intenta de nuevo.')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredPsms = psms.filter(psm => {
    const matchesSearch = 
      psm.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      psm.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      psm.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      psm.cedulaProfesional.toLowerCase().includes(searchTerm.toLowerCase()) ||
      psm.especialidades.some(esp => esp.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesFilter = 
      filterCapacity === 'all' ||
      (filterCapacity === 'available' && psm.capacity.available > 0) ||
      (filterCapacity === 'full' && psm.capacity.available === 0)

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: psms.length,
    active: psms.filter(p => p.activeMatches > 0).length,
    available: psms.filter(p => p.capacity.available > 0).length,
    full: psms.filter(p => p.capacity.available === 0).length,
    totalRevenue: psms.reduce((sum, p) => sum + p.totalRevenue, 0)
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <GradientText as="h1" className="text-3xl font-bold">
              Gestión de Profesionales (PSM)
            </GradientText>
            <p className="text-muted-foreground">
              Administra y supervisa los profesionales de salud mental
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total PSM</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <UserCheck className="w-8 h-8 text-purple-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Activos</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Disponibles</p>
              <p className="text-2xl font-bold">{stats.available}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Capacidad Llena</p>
              <p className="text-2xl font-bold">{stats.full}</p>
            </div>
            <Users className="w-8 h-8 text-red-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Ingresos Totales</p>
              <p className="text-2xl font-bold">
                ${stats.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500" />
          </div>
        </GlassCard>
      </div>

      {/* Search and Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, cédula o especialidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <select
              value={filterCapacity}
              onChange={(e) => setFilterCapacity(e.target.value as 'all' | 'available' | 'full')}
              className="px-4 py-2 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="available">Con capacidad</option>
              <option value="full">Capacidad llena</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* PSM List */}
      <div className="space-y-4">
        {filteredPsms.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <UserCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No se encontraron profesionales</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterCapacity !== 'all' 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay profesionales registrados aún'}
            </p>
          </GlassCard>
        ) : (
          filteredPsms.map((psm) => (
            <motion.div
              key={psm.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      {psm.avatarUrl ? (
                        <Image
                          src={psm.avatarUrl}
                          alt={`${psm.nombre} ${psm.apellido}`}
                          fill
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {psm.nombre[0]}{psm.apellido[0]}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          {psm.nombre} {psm.apellido}
                        </h3>
                        {!psm.registrationCompleted && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                            Pendiente
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>{psm.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{psm.ciudad}, {psm.pais}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4" />
                          <span>Cédula: {psm.cedulaProfesional}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{psm.experienciaAnios} años de experiencia</span>
                        </div>
                      </div>

                      {/* Especialidades */}
                      {psm.especialidades.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {psm.especialidades.map((esp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs"
                            >
                              {esp}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Matches Activos</p>
                          <p className="text-lg font-semibold">{psm.activeMatches}/{psm.capacity.max}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sesiones Completadas</p>
                          <p className="text-lg font-semibold">{psm.completedSessions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Sesiones</p>
                          <p className="text-lg font-semibold">{psm.totalSessions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
                          <p className="text-lg font-semibold">
                            ${psm.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Capacidad</span>
                          <span className="text-sm text-muted-foreground">
                            {psm.capacity.current}/{psm.capacity.max} ({psm.capacity.available} disponibles)
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              psm.capacity.available === 0 
                                ? 'bg-red-500' 
                                : psm.capacity.available <= 2 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${(psm.capacity.current / psm.capacity.max) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <CTAButton 
                      variant="secondary" 
                      size="sm"
                      onClick={() => setSelectedPSM(psm)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalle
                    </CTAButton>
                    <button
                      onClick={() => handleDeletePSM(psm.id)}
                      disabled={actionLoading === psm.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 text-sm disabled:opacity-50"
                      title="Eliminar profesional"
                    >
                      <Trash2 className="w-4 h-4" />
                      {actionLoading === psm.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>

      {/* PSM Detail Modal */}
      {selectedPSM && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <GradientText as="h2" className="text-2xl">
                  Detalles del Profesional
                </GradientText>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeletePSM(selectedPSM.id)}
                    disabled={actionLoading === selectedPSM.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 text-sm disabled:opacity-50"
                    title="Eliminar profesional permanentemente"
                  >
                    <Trash2 className="w-4 h-4" />
                    {actionLoading === selectedPSM.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                  <button
                    onClick={() => setSelectedPSM(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <GlassCard className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-purple-400" />
                    Información Básica
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ID</p>
                      <p className="font-mono text-sm">{selectedPSM.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <p>{selectedPSM.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Privy ID</p>
                      <p className="font-mono text-sm">{selectedPSM.privyId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Estado de Registro</p>
                      <div className="flex items-center gap-2">
                        {selectedPSM.registrationCompleted ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Completo</span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Pendiente</span>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Wallet Addresses */}
                <GlassCard className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Direcciones de Wallet
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">EOA Address</p>
                      <p className="font-mono text-sm break-all">{selectedPSM.eoaAddress}</p>
                    </div>
                    {selectedPSM.smartWalletAddress && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Smart Wallet Address</p>
                        <p className="font-mono text-sm break-all">{selectedPSM.smartWalletAddress}</p>
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* Profile */}
                <GlassCard className="p-4 border-l-4 border-purple-500/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-purple-400" />
                    Perfil Personal
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                      <p className="font-medium">{selectedPSM.nombre} {selectedPSM.apellido}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                      <p>{selectedPSM.telefono}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Ubicación</p>
                      <p>{selectedPSM.ciudad}, {selectedPSM.pais}</p>
                    </div>
                    {selectedPSM.avatarUrl && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Avatar</p>
                        <div className="relative w-16 h-16">
                          <Image
                            src={selectedPSM.avatarUrl}
                            alt={`${selectedPSM.nombre} ${selectedPSM.apellido}`}
                            fill
                            className="rounded-lg object-cover"
                          />
                        </div>
                      </div>
                    )}
                    {selectedPSM.bio && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-1">Biografía</p>
                        <p>{selectedPSM.bio}</p>
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* Professional Info */}
                <GlassCard className="p-4 border-l-4 border-purple-500/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Información Profesional
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Cédula Profesional</p>
                      <p className="font-medium">{selectedPSM.cedulaProfesional}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Experiencia</p>
                      <p>{selectedPSM.experienciaAnios} años</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Formación Académica</p>
                      <p>{selectedPSM.formacionAcademica}</p>
                    </div>
                    {selectedPSM.especialidades.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-2">Especialidades</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedPSM.especialidades.map((esp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs"
                            >
                              {esp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-2">Participación</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${selectedPSM.participaSupervision ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                          <span className="text-sm">Supervisión</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${selectedPSM.participaCursos ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                          <span className="text-sm">Cursos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${selectedPSM.participaInvestigacion ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                          <span className="text-sm">Investigación</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${selectedPSM.participaComunidad ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                          <span className="text-sm">Comunidad</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Statistics */}
                <GlassCard className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Estadísticas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Matches Activos</p>
                      <p className="text-2xl font-bold">{selectedPSM.activeMatches}/{selectedPSM.capacity.max}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Matches</p>
                      <p className="text-2xl font-bold">{selectedPSM.totalMatches}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sesiones Completadas</p>
                      <p className="text-2xl font-bold">{selectedPSM.completedSessions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Sesiones</p>
                      <p className="text-2xl font-bold">{selectedPSM.totalSessions}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Ingresos Totales</p>
                      <p className="text-2xl font-bold">
                        ${selectedPSM.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground mb-2">Capacidad</p>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            selectedPSM.capacity.available === 0 
                              ? 'bg-red-500' 
                              : selectedPSM.capacity.available <= 2 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${(selectedPSM.capacity.current / selectedPSM.capacity.max) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedPSM.capacity.current}/{selectedPSM.capacity.max} ({selectedPSM.capacity.available} disponibles)
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Dates */}
                <GlassCard className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Fechas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Creado</p>
                      <p>{formatDate(selectedPSM.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Actualizado</p>
                      <p>{formatDate(selectedPSM.updatedAt)}</p>
                    </div>
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

