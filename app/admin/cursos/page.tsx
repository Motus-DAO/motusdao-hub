'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react'
import { authFetch } from '@/lib/auth/client'
import { CTAButton } from '@/components/ui/CTAButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'

type Difficulty = 'beginner' | 'intermediate' | 'advanced'

type Course = {
  id: string
  title: string
  slug: string
  summary: string
  description: string | null
  category: string | null
  difficulty: Difficulty | null
  priceAmount: string | number | null
  priceCurrency: string
  isPublished: boolean
  updatedAt: string
}

type CourseForm = {
  title: string
  slug: string
  summary: string
  description: string
  category: string
  difficulty: Difficulty
  priceAmount: string
  priceCurrency: string
  isPublished: boolean
}

const emptyForm: CourseForm = {
  title: '',
  slug: '',
  summary: '',
  description: '',
  category: 'General',
  difficulty: 'beginner',
  priceAmount: '',
  priceCurrency: 'MXN',
  isPublished: false,
}

const fieldClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-mauve-500 focus:ring-2 focus:ring-mauve-500/30'

function formatPrice(course: Course) {
  const amount = Number(course.priceAmount || 0)
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: course.priceCurrency || 'MXN',
  }).format(amount)
}

function formFromCourse(course: Course): CourseForm {
  return {
    title: course.title,
    slug: course.slug,
    summary: course.summary,
    description: course.description || '',
    category: course.category || '',
    difficulty: course.difficulty || 'beginner',
    priceAmount: course.priceAmount == null ? '' : String(course.priceAmount),
    priceCurrency: course.priceCurrency || 'MXN',
    isPublished: course.isPublished,
  }
}

async function apiError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string }
  return body.error || fallback
}

export default function AdminCursosPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await authFetch('/api/admin/courses')
      if (!response.ok) throw new Error(await apiError(response, 'No se pudieron cargar los cursos'))
      const data = (await response.json()) as { courses?: Course[] }
      setCourses(data.courses || [])
    } catch (fetchError) {
      setCourses([])
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar los cursos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCourses()
  }, [fetchCourses])

  const openCreate = () => {
    setEditingCourse(null)
    setForm(emptyForm)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (course: Course) => {
    setEditingCourse(course)
    setForm(formFromCourse(course))
    setError(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (saving) return
    setDialogOpen(false)
    setEditingCourse(null)
  }

  const updateForm = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    const payload = {
      ...form,
      priceAmount: form.priceAmount === '' ? undefined : Number(form.priceAmount),
    }

    try {
      const response = await authFetch(
        editingCourse ? `/api/admin/courses/${editingCourse.id}` : '/api/admin/courses',
        {
          method: editingCourse ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        throw new Error(await apiError(response, 'No se pudo guardar el curso'))
      }

      setDialogOpen(false)
      setEditingCourse(null)
      setNotice(editingCourse ? 'Curso actualizado correctamente' : 'Curso creado correctamente')
      await fetchCourses()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar el curso')
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async (course: Course) => {
    setActionId(course.id)
    setError(null)
    setNotice(null)
    try {
      const response = await authFetch(`/api/admin/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !course.isPublished }),
      })
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo cambiar la publicación'))
      setNotice(course.isPublished ? 'Curso movido a borrador' : 'Curso publicado')
      await fetchCourses()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'No se pudo cambiar la publicación')
    } finally {
      setActionId(null)
    }
  }

  const deleteCourse = async (course: Course) => {
    const confirmed = window.confirm(
      `¿Eliminar "${course.title}"? También se eliminarán sus módulos, lecciones e inscripciones. Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    setActionId(course.id)
    setError(null)
    setNotice(null)
    try {
      const response = await authFetch(`/api/admin/courses/${course.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo eliminar el curso'))
      setNotice('Curso eliminado correctamente')
      await fetchCourses()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el curso')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <GradientText as="h1" className="mb-2 text-3xl font-bold sm:text-4xl">
            Gestión de Cursos
          </GradientText>
          <p className="text-muted-foreground">Crea, edita y publica los cursos de la Academia.</p>
        </div>
        <CTAButton onClick={openCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Nuevo curso
        </CTAButton>
      </motion.div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}

      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando cursos...
          </div>
        ) : courses.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-mauve-400" />
            <p className="font-medium">Aún no hay cursos</p>
            <p className="mt-1 text-sm text-muted-foreground">Crea el primer curso para comenzar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 font-medium">Curso</th>
                  <th className="px-5 py-4 font-medium">Slug</th>
                  <th className="px-5 py-4 font-medium">Estado</th>
                  <th className="px-5 py-4 font-medium">Precio</th>
                  <th className="px-5 py-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {courses.map((course) => {
                  const busy = actionId === course.id
                  return (
                    <tr key={course.id} className="transition-colors hover:bg-white/5">
                      <td className="px-5 py-4">
                        <p className="font-medium">{course.title}</p>
                        <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">{course.summary}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{course.slug}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            course.isPublished
                              ? 'border-green-500/30 bg-green-500/10 text-green-300'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {course.isPublished ? 'Publicado' : 'Borrador'}
                        </span>
                      </td>
                      <td className="px-5 py-4">{formatPrice(course)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/admin/cursos/${course.id}`}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-mauve-300 transition hover:bg-mauve-500/10"
                          >
                            <BookOpen className="h-4 w-4" />
                            Editar contenido
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(course)}
                            disabled={busy}
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground disabled:opacity-50"
                            aria-label={`Editar ${course.title}`}
                            title="Editar"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void togglePublished(course)}
                            disabled={busy}
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-mauve-300 disabled:opacity-50"
                            aria-label={`${course.isPublished ? 'Despublicar' : 'Publicar'} ${course.title}`}
                            title={course.isPublished ? 'Despublicar' : 'Publicar'}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteCourse(course)}
                            disabled={busy}
                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                            aria-label={`Eliminar ${course.title}`}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {dialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-dialog-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-background p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 id="course-dialog-title" className="text-xl font-semibold">
                  {editingCourse ? 'Editar curso' : 'Nuevo curso'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Los campos marcados con * son obligatorios.</p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                aria-label="Cerrar formulario"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  Título *
                  <input required maxLength={200} value={form.title} onChange={(event) => updateForm('title', event.target.value)} className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Slug *
                  <input required maxLength={200} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => updateForm('slug', event.target.value)} placeholder="nombre-del-curso" className={fieldClass} />
                </label>
              </div>

              <label className="block space-y-1.5 text-sm font-medium">
                Resumen *
                <textarea required maxLength={500} rows={3} value={form.summary} onChange={(event) => updateForm('summary', event.target.value)} className={`${fieldClass} resize-y`} />
              </label>

              <label className="block space-y-1.5 text-sm font-medium">
                Descripción
                <textarea maxLength={5000} rows={5} value={form.description} onChange={(event) => updateForm('description', event.target.value)} className={`${fieldClass} resize-y`} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  Categoría
                  <input maxLength={100} value={form.category} onChange={(event) => updateForm('category', event.target.value)} className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Dificultad
                  <select value={form.difficulty} onChange={(event) => updateForm('difficulty', event.target.value as Difficulty)} className={fieldClass}>
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <label className="space-y-1.5 text-sm font-medium">
                  Precio
                  <input type="number" min="0" step="0.01" value={form.priceAmount} onChange={(event) => updateForm('priceAmount', event.target.value)} placeholder="0.00" className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Moneda
                  <input required minLength={3} maxLength={3} value={form.priceCurrency} onChange={(event) => updateForm('priceCurrency', event.target.value.toUpperCase())} className={fieldClass} />
                </label>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium">Publicar curso</span>
                  <span className="block text-xs text-muted-foreground">Desactívalo para guardar como borrador.</span>
                </span>
                <input type="checkbox" checked={form.isPublished} onChange={(event) => updateForm('isPublished', event.target.checked)} className="h-5 w-5 accent-mauve-500" />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <CTAButton type="button" variant="ghost" onClick={closeDialog} disabled={saving}>Cancelar</CTAButton>
                <CTAButton type="submit" disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingCourse ? 'Guardar cambios' : 'Crear curso'}
                </CTAButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
