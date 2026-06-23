'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { authFetch } from '@/lib/auth/client'
import {
  AtSign,
  ExternalLink,
  RefreshCw,
  Search,
  Wallet,
  Hash,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface MnsUser {
  id: string
  email: string
  role: string
  nombre: string | null
  eoaAddress: string
  smartWalletAddress: string | null
  motusName: string | null
  motusNameDisplay: string | null
  mnsTxHash: string | null
  mnsRegisteredAt: string | null
  mnsExplorerUrl: string | null
  profileNftTxHash: string | null
  profileNftTokenURI: string | null
  registrationCompleted: boolean
  onboardingStatus: string
}

interface MnsResponse {
  summary: {
    totalUsers: number
    withMotusName: number
    withoutMotusName: number
    withMnsTxHash: number
  }
  users: MnsUser[]
}

export default function AdminMnsPage() {
  const [data, setData] = useState<MnsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'with' | 'without'>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/mns')
      if (res.ok) {
        setData(await res.json())
      }
    } catch (e) {
      console.error('Error loading MNS debug data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const filteredUsers = (data?.users ?? []).filter((user) => {
    if (filter === 'with' && !user.motusName) return false
    if (filter === 'without' && user.motusName) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      user.email.toLowerCase().includes(q) ||
      (user.motusName?.toLowerCase().includes(q) ?? false) ||
      user.eoaAddress.toLowerCase().includes(q) ||
      (user.smartWalletAddress?.toLowerCase().includes(q) ?? false) ||
      (user.nombre?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <GradientText as="h1" className="text-3xl font-bold mb-2">
            MNS Debug
          </GradientText>
          <p className="text-muted-foreground">
            Motus Name Service — dominios y transacciones por usuario
          </p>
        </div>
        <button
          onClick={() => void fetchData()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total usuarios', value: data.summary.totalUsers },
            { label: 'Con .motus', value: data.summary.withMotusName },
            { label: 'Sin .motus', value: data.summary.withoutMotusName },
            { label: 'Con tx MNS', value: data.summary.withMnsTxHash }
          ].map((stat) => (
            <GlassCard key={stat.label} className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por email, nombre, wallet o dominio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
          >
            <option value="all">Todos</option>
            <option value="with">Solo con MNS</option>
            <option value="without">Sin MNS</option>
          </select>
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard className="p-8 animate-pulse">
          <div className="h-6 bg-white/10 rounded w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded" />
            ))}
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <GlassCard className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {user.motusName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {user.motusNameDisplay}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground text-sm">
                          <XCircle className="w-3.5 h-3.5" />
                          Sin dominio
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-white/10">{user.role}</span>
                    </div>
                    <p className="font-medium truncate">{user.nombre || user.email}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono truncate">
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      <span title={user.eoaAddress}>{user.eoaAddress}</span>
                    </div>
                    {user.smartWalletAddress && user.smartWalletAddress !== user.eoaAddress && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono truncate">
                        <Wallet className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        <span title={user.smartWalletAddress}>SW: {user.smartWalletAddress}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-sm space-y-2 lg:text-right shrink-0">
                    {user.mnsTxHash && (
                      <div className="flex items-center gap-2 lg:justify-end">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs truncate max-w-[200px]" title={user.mnsTxHash}>
                          {user.mnsTxHash.slice(0, 10)}...{user.mnsTxHash.slice(-8)}
                        </span>
                        {user.mnsExplorerUrl && (
                          <a
                            href={user.mnsExplorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-mauve-400 hover:text-mauve-300"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                    {user.mnsRegisteredAt && (
                      <p className="text-xs text-muted-foreground">
                        Registrado: {new Date(user.mnsRegisteredAt).toLocaleString('es-MX')}
                      </p>
                    )}
                    {user.profileNftTxHash && (
                      <p className="text-xs text-muted-foreground font-mono">
                        NFT tx: {user.profileNftTxHash.slice(0, 10)}...
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Onboarding: {user.onboardingStatus}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}

          {filteredUsers.length === 0 && (
            <GlassCard className="p-8 text-center text-muted-foreground">
              <AtSign className="w-10 h-10 mx-auto mb-3 opacity-50" />
              No hay usuarios que coincidan con el filtro
            </GlassCard>
          )}
        </div>
      )}
    </div>
  )
}
