'use client'

import { useState, useEffect, useCallback } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter,
  Mail,
  Wallet,
  User as UserIcon,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  RotateCcw
} from 'lucide-react'

interface User {
  id: string
  email: string
  role: 'usuario' | 'psm' | 'admin'
  eoaAddress: string
  smartWalletAddress: string | null
  privyId: string | null
  registrationCompleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  profile: {
    nombre: string
    apellido: string
    telefono: string
    fechaNacimiento: string
    ciudad: string
    pais: string
    avatarUrl: string | null
    bio: string | null
    language: string
  } | null
  patientProfile: {
    tipoAtencion: string
    problematica: string
    preferenciaAsignacion: string
  } | null
  psmProfile: {
    cedulaProfesional: string
    formacionAcademica: string
    experienciaAnios: number
    biografia: string | null
    especialidades: string
    participaSupervision: boolean
    participaCursos: boolean
    participaInvestigacion: boolean
    participaComunidad: boolean
  } | null
}

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('usuario') // Por defecto mostrar solo usuarios
  const [showDeleted, setShowDeleted] = useState(false) // Filtro para usuarios eliminados
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<UsersResponse['pagination'] | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      })
      
      if (search) {
        params.append('search', search)
      }
      
      if (roleFilter) {
        params.append('role', roleFilter)
      }
      
      if (showDeleted) {
        params.append('showDeleted', 'true')
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: UsersResponse = await response.json()
      
      // Ensure we always set an array, even if data.users is undefined
      setUsers(data?.users || [])
      setPagination(data?.pagination || null)
    } catch (error) {
      console.error('Error fetching users:', error)
      // On error, ensure users is still an array
      setUsers([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, roleFilter, showDeleted])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers, showDeleted])

  const handleDeleteUser = async (userId: string) => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar este usuario? Esta acción ocultará el usuario del sistema (soft delete) pero preservará todos los datos. El usuario puede ser restaurado más tarde si es necesario.'
    )

    if (!confirmed) return

    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar el usuario')
      }

      // Refresh users
      await fetchUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(error instanceof Error ? error.message : 'Error al eliminar el usuario. Por favor, intenta de nuevo.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestoreUser = async (userId: string) => {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas restaurar este usuario? El usuario volverá a estar visible en el sistema.'
    )

    if (!confirmed) return

    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}?action=restore`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al restaurar el usuario')
      }

      // Refresh users
      await fetchUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Error restoring user:', error)
      alert(error instanceof Error ? error.message : 'Error al restaurar el usuario. Por favor, intenta de nuevo.')
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'psm':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'usuario':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
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

  const truncateAddress = (address: string) => {
    if (!address) return 'N/A'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading && !users.length) {
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
          Gestión de Usuarios
        </GradientText>
        <p className="text-muted-foreground">
          Visualiza y gestiona todos los usuarios registrados en la plataforma
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <GlassCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por email, nombre, dirección..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">Todos los roles</option>
                <option value="usuario">Usuario</option>
                <option value="psm">PSM</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Show Deleted Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showDeleted"
                checked={showDeleted}
                onChange={(e) => {
                  setShowDeleted(e.target.checked)
                  setCurrentPage(1)
                }}
                className="w-4 h-4 rounded bg-white/5 border border-white/10 text-mauve-500 focus:ring-2 focus:ring-mauve-500 cursor-pointer"
              />
              <label htmlFor="showDeleted" className="text-sm text-muted-foreground cursor-pointer">
                Mostrar eliminados
              </label>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats */}
      {pagination && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {users.length} de {pagination.total} usuarios
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

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <GlassCard className="p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Usuario</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Rol</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Direcciones</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Estado</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Registro</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users && users.length > 0 ? users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "border-b border-white/5 hover:bg-white/5",
                    user.deletedAt && "opacity-60"
                  )}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        user.deletedAt 
                          ? "bg-gray-500/50" 
                          : "bg-gradient-to-br from-mauve-500 to-purple-600"
                      )}>
                        {user.profile ? (
                          <span className="text-white font-semibold">
                            {user.profile.nombre[0]}{user.profile.apellido[0]}
                          </span>
                        ) : (
                          <UserIcon className="w-5 h-5 text-white" />
                        )}
                      </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {user.profile 
                                ? `${user.profile.nombre} ${user.profile.apellido}`
                                : 'Sin perfil'
                              }
                            </p>
                            {user.deletedAt && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/50 rounded-full text-xs font-medium">
                                Eliminado
                              </span>
                            )}
                          </div>
                        {user.profile && (
                          <p className="text-xs text-muted-foreground">
                            {user.profile.ciudad}, {user.profile.pais}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                      {user.role === 'usuario' ? 'Usuario' : user.role === 'psm' ? 'PSM' : 'Admin'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Wallet className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono">{truncateAddress(user.eoaAddress)}</span>
                      </div>
                      {user.smartWalletAddress && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Wallet className="w-3 h-3" />
                          <span className="font-mono">{truncateAddress(user.smartWalletAddress)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {user.registrationCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-xs">
                        {user.registrationCompleted ? 'Completo' : 'Pendiente'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(user.createdAt)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalles
                      </button>
                      {user.role !== 'admin' && (
                        <>
                          {user.deletedAt ? (
                            <button
                              onClick={() => handleRestoreUser(user.id)}
                              disabled={actionLoading === user.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-lg hover:bg-green-500/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-green-400"
                              title="Restaurar usuario"
                            >
                              <RotateCcw className="w-4 h-4" />
                              {actionLoading === user.id ? 'Restaurando...' : 'Restaurar'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionLoading === user.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-red-400"
                              title="Eliminar usuario (soft delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                              {actionLoading === user.id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )) : null}
            </tbody>
          </table>

          {(!users || users.length === 0) && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No se encontraron usuarios</p>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <GradientText as="h2" className="text-2xl">
                    Detalles del Usuario
                  </GradientText>
                  {selectedUser.deletedAt && (
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded-full text-sm font-medium">
                      Eliminado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedUser.role !== 'admin' && (
                    <>
                      {selectedUser.deletedAt ? (
                        <button
                          onClick={() => handleRestoreUser(selectedUser.id)}
                          disabled={actionLoading === selectedUser.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-lg hover:bg-green-500/30 text-sm disabled:opacity-50"
                          title="Restaurar usuario"
                        >
                          <RotateCcw className="w-4 h-4" />
                          {actionLoading === selectedUser.id ? 'Restaurando...' : 'Restaurar'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(selectedUser.id)}
                          disabled={actionLoading === selectedUser.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 text-sm disabled:opacity-50"
                          title="Eliminar usuario (soft delete)"
                        >
                          <Trash2 className="w-4 h-4" />
                          {actionLoading === selectedUser.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Información Básica</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ID</p>
                      <p className="font-mono text-sm">{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <p>{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Rol</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Privy ID</p>
                      <p className="font-mono text-sm">{selectedUser.privyId || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Wallet Addresses */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Direcciones de Wallet</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">EOA Address</p>
                      <p className="font-mono text-sm break-all">{selectedUser.eoaAddress}</p>
                    </div>
                    {selectedUser.smartWalletAddress && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Smart Wallet Address</p>
                        <p className="font-mono text-sm break-all">{selectedUser.smartWalletAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile */}
                {selectedUser.profile && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Perfil</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                        <p>{selectedUser.profile.nombre} {selectedUser.profile.apellido}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                        <p>{selectedUser.profile.telefono}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fecha de Nacimiento</p>
                        <p>{formatDate(selectedUser.profile.fechaNacimiento)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Ubicación</p>
                        <p>{selectedUser.profile.ciudad}, {selectedUser.profile.pais}</p>
                      </div>
                      {selectedUser.profile.bio && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground mb-1">Biografía</p>
                          <p>{selectedUser.profile.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Patient Profile */}
                {selectedUser.patientProfile && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Perfil de Paciente</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Tipo de Atención</p>
                        <p>{selectedUser.patientProfile.tipoAtencion}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Preferencia de Asignación</p>
                        <p>{selectedUser.patientProfile.preferenciaAsignacion}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Problemática</p>
                        <p>{selectedUser.patientProfile.problematica}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PSM Profile */}
                {selectedUser.psmProfile && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Perfil de PSM</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Cédula Profesional</p>
                        <p>{selectedUser.psmProfile.cedulaProfesional}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Experiencia</p>
                        <p>{selectedUser.psmProfile.experienciaAnios} años</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-1">Formación Académica</p>
                        <p>{selectedUser.psmProfile.formacionAcademica}</p>
                      </div>
                      {selectedUser.psmProfile.biografia && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground mb-1">Biografía</p>
                          <p>{selectedUser.psmProfile.biografia}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-1">Especialidades</p>
                        <p>{selectedUser.psmProfile.especialidades}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Fechas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Creado</p>
                      <p>{formatDate(selectedUser.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Actualizado</p>
                      <p>{formatDate(selectedUser.updatedAt)}</p>
                    </div>
                    {selectedUser.deletedAt && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-1">Eliminado el</p>
                        <p className="text-sm text-red-400">{formatDate(selectedUser.deletedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  )
}

