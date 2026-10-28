'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Section } from '@/components/ui/Section'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Heart,
  Smile,
  Frown,
  Meh,
  TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { useSiweSession } from '@/lib/auth/use-siwe-session'
import { fetchAppSession } from '@/lib/auth/client'
import { SiweSessionBanner } from '@/components/auth/SiweSessionBanner'
import { useWallet } from '@/lib/wallet'
import { useSafeNotesKey } from '@/lib/safe-notes/use-safe-notes-key'
import {
  deleteBitacoraEntry,
  hydrateBitacoraEntries,
  saveBitacoraEntry,
  type BitacoraEntryView,
} from '@/lib/safe-notes/client-bitacora'
import { Lock, ShieldAlert } from 'lucide-react'

type JournalEntry = BitacoraEntryView

const moodIcons = {
  happy: Smile,
  sad: Frown,
  anxious: TrendingUp,
  calm: Heart,
  neutral: Meh
}

const moodColors = {
  happy: 'text-yellow-500',
  sad: 'text-blue-500',
  anxious: 'text-red-500',
  calm: 'text-green-500',
  neutral: 'text-gray-500'
}

// Bitácora uses SIWE user id + wallet-derived encryption key (slice 7).

export default function BitacoraPage() {
  const { ready, authenticated, login } = useWallet()
  const {
    isSessionReady,
    sessionState,
  } = useSiweSession()
  const {
    eoaAddress,
    state: keyState,
    unlockError,
    unlock,
    getKey,
    isUnlocked,
  } = useSafeNotesKey()

  const [userId, setUserId] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [formData, setFormData] = useState({
    content: '',
    mood: 'neutral',
    tags: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionState === 'loading') return

    if (sessionState !== 'ready') {
      setUserId(null)
      setSessionError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    void fetchAppSession().then((session) => {
      if (!session.authenticated || !session.userId) {
        setSessionError('Inicia sesión con tu wallet para usar la bitácora.')
        setUserId(null)
      } else {
        setSessionError(null)
        setUserId(session.userId)
      }
      setIsLoading(false)
    })
  }, [sessionState])

  const loadEntries = useCallback(async () => {
    const key = getKey()
    if (!userId || !eoaAddress || !key) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const hydrated = await hydrateBitacoraEntries(userId, eoaAddress, key)
      setEntries(hydrated)
    } catch (error) {
      console.error('Failed to load entries:', error)
      setLoadError('No se pudieron descifrar las entradas.')
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [userId, eoaAddress, getKey])

  useEffect(() => {
    if (isUnlocked && userId) {
      void loadEntries()
    }
  }, [isUnlocked, userId, loadEntries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const key = getKey()
    if (!userId || !eoaAddress || !key) return
    setIsSubmitting(true)

    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      const saved = await saveBitacoraEntry(userId, eoaAddress, key, {
        id: editingEntry?.id,
        content: formData.content,
        mood: formData.mood,
        tags,
      })

      const newEntry: JournalEntry = {
        id: saved.id,
        content: formData.content,
        mood: formData.mood,
        tags,
        createdAt: editingEntry?.createdAt ?? saved.createdAt,
      }

      if (editingEntry) {
        setEntries(prev => prev.map(entry =>
          entry.id === editingEntry.id ? newEntry : entry
        ))
        setEditingEntry(null)
      } else {
        setEntries(prev => [newEntry, ...prev])
      }

      setFormData({ content: '', mood: 'neutral', tags: '' })
      setShowForm(false)
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('No se pudo guardar la entrada. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setFormData({
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags.join(', ')
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta entrada?')) return

    try {
      await deleteBitacoraEntry(id)
      setEntries(prev => prev.filter(entry => entry.id !== id))
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Ocurrió un error inesperado. Intenta nuevamente.')
    }
  }

  const getMoodStats = () => {
    const stats = entries.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return stats
  }

  const moodStats = getMoodStats()

  if (sessionState === 'loading' || (isSessionReady && isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-mauve-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando bitácora...</p>
        </div>
      </div>
    )
  }

  if (sessionState === 'no_wallet' || (!authenticated && ready)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <GlassCard className="p-8 max-w-lg w-full space-y-4">
          <ShieldAlert className="w-12 h-12 text-mauve-400 mx-auto" />
          <p className="text-center text-muted-foreground">
            Conecta tu wallet para abrir tu bitácora personal.
          </p>
          <CTAButton className="w-full" size="lg" disabled={!ready} onClick={() => void login()}>
            Conectar wallet
          </CTAButton>
        </GlassCard>
      </div>
    )
  }

  if (sessionState === 'needs_signature') {
    return (
      <div className="min-h-screen bg-background">
        <Section>
          <div className="container mx-auto px-6 max-w-xl py-16 space-y-6">
            <GradientText as="h1" className="text-2xl font-bold text-center">
              Mi Bitácora
            </GradientText>
            <p className="text-sm text-muted-foreground text-center">
              Antes de desbloquear el diario cifrado, verifica tu wallet con SIWE (no cuesta gas).
            </p>
            <SiweSessionBanner compact />
          </div>
        </Section>
      </div>
    )
  }

  if (sessionError || !userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <GlassCard className="p-8 max-w-lg text-center">
          <ShieldAlert className="w-12 h-12 text-mauve-400 mx-auto mb-4" />
          <p className="text-muted-foreground">{sessionError ?? 'Sesión requerida'}</p>
        </GlassCard>
      </div>
    )
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background">
        <Section>
          <div className="container mx-auto px-6 max-w-2xl py-16">
            <GlassCard className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <Lock className="w-8 h-8 text-mauve-400" />
                <GradientText as="h1" className="text-2xl font-bold">
                  Desbloquea tu bitácora
                </GradientText>
              </div>
              <PrivacyNotice />
              <p className="text-sm text-muted-foreground">
                Firma un mensaje aparte (no es tu inicio de sesión). La clave queda solo en este
                dispositivo hasta que cierres la pestaña o cambies de wallet.
              </p>
              {unlockError && (
                <p className="text-sm text-red-400">{unlockError}</p>
              )}
              <CTAButton
                size="lg"
                glow
                disabled={keyState === 'unlocking' || !eoaAddress}
                onClick={() => void unlock()}
              >
                {keyState === 'unlocking' ? 'Esperando firma…' : 'Firmar y desbloquear'}
              </CTAButton>
            </GlassCard>
          </div>
        </Section>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <GlassCard className="p-8 max-w-lg text-center space-y-4">
          <p className="text-muted-foreground">{loadError}</p>
          <CTAButton onClick={() => void loadEntries()}>Reintentar</CTAButton>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Section>
        <div className="container mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <GradientText as="h1" className="text-4xl md:text-5xl font-bold">
                  Mi Bitácora
                </GradientText>
                <p className="text-muted-foreground">Diario personal cifrado — no es tu expediente clínico</p>
              </div>
            </div>
            <div className="max-w-3xl mx-auto mb-8">
              <PrivacyNotice compact />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Add Entry Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-6"
              >
                <CTAButton
                  onClick={() => setShowForm(true)}
                  size="lg"
                  glow
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nueva Entrada
                </CTAButton>
              </motion.div>

              {/* Journal Form */}
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-8"
                >
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold mb-4">
                      {editingEntry ? 'Editar Entrada' : 'Nueva Entrada'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          ¿Cómo te sientes hoy?
                        </label>
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Escribe sobre tu día, tus pensamientos, emociones..."
                          className="w-full p-3 glass border border-white/15 rounded-xl focus-ring smooth-transition resize-none"
                          rows={4}
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Estado de ánimo
                        </label>
                        <div className="flex space-x-4">
                          {Object.entries(moodIcons).map(([mood, Icon]) => (
                            <button
                              key={mood}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, mood }))}
                              disabled={isSubmitting}
                              className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${
                                formData.mood === mood
                                  ? 'border-mauve-500 bg-mauve-500/20'
                                  : 'border-white/10 hover:border-white/20'
                              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <Icon className={`w-5 h-5 ${moodColors[mood as keyof typeof moodColors]}`} />
                              <span className="capitalize">{mood}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Etiquetas (separadas por comas)
                        </label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="trabajo, familia, ejercicio..."
                          className="w-full p-3 glass border border-white/15 rounded-xl focus-ring smooth-transition"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="flex space-x-4">
                        <CTAButton 
                          type="submit" 
                          size="lg"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Guardando...' : editingEntry ? 'Actualizar' : 'Guardar'} Entrada
                        </CTAButton>
                        <CTAButton
                          type="button"
                          variant="secondary"
                          size="lg"
                          onClick={() => {
                            setShowForm(false)
                            setEditingEntry(null)
                            setFormData({ content: '', mood: 'neutral', tags: '' })
                          }}
                          disabled={isSubmitting}
                        >
                          Cancelar
                        </CTAButton>
                      </div>
                    </form>
                  </GlassCard>
                </motion.div>
              )}

              {/* Journal Entries */}
              <div className="space-y-6">
                {entries.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  >
                    <GlassCard className="p-8 text-center">
                      <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No hay entradas aún</h3>
                      <p className="text-muted-foreground mb-4">
                        Comienza escribiendo tu primera entrada en la bitácora
                      </p>
                      <CTAButton onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear primera entrada
                      </CTAButton>
                    </GlassCard>
                  </motion.div>
                ) : (
                  entries.map((entry, index) => {
                    const MoodIcon = moodIcons[entry.mood as keyof typeof moodIcons]
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                      >
                        <GlassCard className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                entry.mood === 'happy' ? 'bg-yellow-500/20' :
                                entry.mood === 'sad' ? 'bg-blue-500/20' :
                                entry.mood === 'anxious' ? 'bg-red-500/20' :
                                entry.mood === 'calm' ? 'bg-green-500/20' :
                                'bg-gray-500/20'
                              }`}>
                                <MoodIcon className={`w-5 h-5 ${moodColors[entry.mood as keyof typeof moodColors]}`} />
                              </div>
                              <div>
                                <h3 className="font-semibold capitalize">{entry.mood}</h3>
                                <p className="text-sm text-muted-foreground flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  {entry.createdAt.toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(entry)}
                                className="p-2 hover:bg-white/15 rounded-xl transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-2 hover:bg-red-500/20 rounded-xl transition-colors text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <p className="text-foreground mb-4 leading-relaxed">
                            {entry.content}
                          </p>

                          {entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {entry.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-3 py-1 bg-mauve-500/20 text-mauve-400 text-sm rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </GlassCard>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="space-y-6"
              >
                {/* Mood Stats */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-mauve-500" />
                    Estadísticas de Humor
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(moodStats).map(([mood, count]) => {
                      const MoodIcon = moodIcons[mood as keyof typeof moodIcons]
                      const percentage = (count / entries.length) * 100
                      return (
                        <div key={mood} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MoodIcon className={`w-4 h-4 ${moodColors[mood as keyof typeof moodColors]}`} />
                            <span className="text-sm capitalize">{mood}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-mauve transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-8 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </GlassCard>

                {/* Quick Stats */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Resumen</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de entradas</span>
                      <span className="font-semibold">{entries.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Este mes</span>
                      <span className="font-semibold">
                        {entries.filter(entry => {
                          const now = new Date()
                          const entryDate = new Date(entry.createdAt)
                          return entryDate.getMonth() === now.getMonth() && 
                                 entryDate.getFullYear() === now.getFullYear()
                        }).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Promedio por semana</span>
                      <span className="font-semibold">
                        {Math.round(entries.length / 4)}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

function PrivacyNotice({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 text-sm text-muted-foreground ${
        compact ? 'p-4' : 'p-5 space-y-3'
      }`}
    >
      <p>
        <strong className="text-foreground font-medium">Bitácora personal.</strong> No sustituye
        una nota clínica ni un expediente (NOM-004). Tu psicólogo asignado{' '}
        <strong className="text-foreground font-medium">no puede leer</strong> estas entradas.
      </p>
      {!compact && (
        <p>
          Motus guarda texto cifrado; solo tu wallet puede abrirlo. Si pierdes acceso a la wallet o
          rechazas la firma de desbloqueo, <strong className="text-foreground font-medium">no hay
          recuperación</strong> del contenido.
        </p>
      )}
    </div>
  )
}
