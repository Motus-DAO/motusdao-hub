'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Plus,
  Power,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import { authFetch } from '@/lib/auth/client'
import { isStorageMediaRef, parsePdfResources, fromStorageRef, type PdfResource } from '@/lib/academy/media'
import { videoEmbedUrl } from '@/lib/academy/markdown'
import {
  deleteLessonPdf,
  fetchLessonMediaUrl,
  removeLessonVideo,
  uploadLessonPdf,
  uploadLessonVideo,
} from '@/lib/academy/media-client'
import { CTAButton } from '@/components/ui/CTAButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'

type CourseHeader = {
  id: string
  title: string
  slug: string
  isPublished: boolean
}

type Lesson = {
  id: string
  moduleId: string | null
  title: string
  slug: string
  summary: string | null
  contentMDX: string | null
  duration: number | null
  order: number
  isPublished: boolean
  isFreePreview: boolean
  videoUrl: string | null
  pdfResources?: unknown
  updatedAt: string
}

type CourseModule = {
  id: string
  courseId: string
  title: string
  summary: string | null
  order: number
  updatedAt: string
  lessons: Lesson[]
}

type ModuleForm = {
  title: string
  summary: string
  order: string
}

type LessonForm = {
  title: string
  slug: string
  summary: string
  contentMDX: string
  duration: string
  order: string
  isPublished: boolean
  isFreePreview: boolean
  videoUrl: string
}

const fieldClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-mauve-500 focus:ring-2 focus:ring-mauve-500/30'

async function apiError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string }
  return body.error || fallback
}

function moduleForm(module?: CourseModule, order = 0): ModuleForm {
  return {
    title: module?.title || '',
    summary: module?.summary || '',
    order: String(module?.order ?? order),
  }
}

function lessonForm(lesson?: Lesson, order = 0): LessonForm {
  return {
    title: lesson?.title || '',
    slug: lesson?.slug || '',
    summary: lesson?.summary || '',
    contentMDX: lesson?.contentMDX || '',
    duration: lesson?.duration == null ? '' : String(lesson.duration),
    order: String(lesson?.order ?? order),
    isPublished: lesson?.isPublished ?? false,
    isFreePreview: lesson?.isFreePreview ?? false,
    videoUrl: lesson?.videoUrl || '',
  }
}

type LessonVideoPreviewProps = {
  lessonId: string
  videoUrl: string
  uploading: boolean
  disabled: boolean
  onReplace: (file: File) => void
  onRemove: () => void
}

function LessonVideoPreview({
  lessonId,
  videoUrl,
  uploading,
  disabled,
  onReplace,
  onRemove,
}: LessonVideoPreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const embed = !isStorageMediaRef(videoUrl) ? videoEmbedUrl(videoUrl) : null

  useEffect(() => {
    if (!videoUrl) {
      setPreviewUrl(null)
      setPreviewError(null)
      return
    }

    if (!isStorageMediaRef(videoUrl)) {
      setPreviewUrl(videoUrl)
      setPreviewError(null)
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)

    fetchLessonMediaUrl(lessonId, fromStorageRef(videoUrl))
      .then((signedUrl) => {
        if (!cancelled) setPreviewUrl(signedUrl)
      })
      .catch((error) => {
        if (!cancelled) {
          setPreviewUrl(null)
          setPreviewError(error instanceof Error ? error.message : 'No se pudo cargar la vista previa')
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [lessonId, videoUrl])

  const playbackSrc = embed?.src ?? previewUrl

  return (
    <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <label className="flex cursor-default items-center gap-2 text-sm text-emerald-300">
        <input type="checkbox" checked readOnly className="h-4 w-4 accent-emerald-500" aria-hidden />
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Video subido correctamente
      </label>

      <div className="group relative overflow-hidden rounded-lg border border-white/10 bg-black/30">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
          title="Clic para cambiar el video"
        >
          {previewLoading || uploading ? (
            <div className="flex aspect-video items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-mauve-300" />
            </div>
          ) : embed?.type === 'iframe' && playbackSrc ? (
            <div className="aspect-video">
              <iframe
                src={playbackSrc}
                title="Vista previa del video"
                className="h-full w-full pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : playbackSrc ? (
            <video src={playbackSrc} controls className="max-h-56 w-full" preload="metadata" onClick={(event) => event.stopPropagation()} />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
              <Video className="h-8 w-8 text-mauve-300" />
              {previewError || 'Vista previa no disponible'}
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-xs text-white/80 opacity-0 transition group-hover:opacity-100">
            Clic para cambiar el video
          </span>
        </button>

        <button
          type="button"
          disabled={disabled || uploading}
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/70 p-1.5 text-white/80 hover:bg-red-500/80 hover:text-white disabled:opacity-50"
          aria-label="Quitar video"
          title="Quitar video"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onReplace(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}

type LessonPdfPreviewCardProps = {
  resource: PdfResource
  uploading: boolean
  disabled: boolean
  onPreview: () => void
  onRemove: () => void
}

function LessonPdfPreviewCard({ resource, uploading, disabled, onPreview, onRemove }: LessonPdfPreviewCardProps) {
  return (
    <div className="relative rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <label className="mb-2 flex cursor-default items-center gap-2 text-xs text-emerald-300">
        <input type="checkbox" checked readOnly className="h-3.5 w-3.5 accent-emerald-500" aria-hidden />
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        PDF subido correctamente
      </label>

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={onPreview}
        className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-left hover:bg-white/10 disabled:opacity-60"
        title="Clic para ver el PDF"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-mauve-500/15">
          <FileText className="h-6 w-6 text-mauve-300" />
        </div>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{resource.name}</span>
          <span className="block text-xs text-muted-foreground">Clic para abrir · reemplaza subiendo otro PDF</span>
        </span>
      </button>

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/70 p-1.5 text-white/80 hover:bg-red-500/80 hover:text-white disabled:opacity-50"
        aria-label={`Quitar ${resource.name}`}
        title="Quitar PDF"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

type ModuleDialogProps = {
  editing: CourseModule | null
  form: ModuleForm
  saving: boolean
  onChange: (form: ModuleForm) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function ModuleDialog({ editing, form, saving, onChange, onClose, onSubmit }: ModuleDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-dialog-title"
        className="w-full max-w-lg rounded-lg border border-white/10 bg-background p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 id="module-dialog-title" className="text-xl font-semibold">
              {editing ? 'Editar módulo' : 'Nuevo módulo'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Organiza un bloque de lecciones del curso.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10" aria-label="Cerrar formulario">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            Título *
            <input required maxLength={200} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} className={fieldClass} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Resumen
            <textarea rows={3} maxLength={500} value={form.summary} onChange={(event) => onChange({ ...form, summary: event.target.value })} className={`${fieldClass} resize-y`} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Orden
            <input required type="number" min="0" step="1" value={form.order} onChange={(event) => onChange({ ...form, order: event.target.value })} className={fieldClass} />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <CTAButton type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</CTAButton>
            <CTAButton type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear módulo'}
            </CTAButton>
          </div>
        </form>
      </div>
    </div>
  )
}

type LessonDialogProps = {
  editing: Lesson | null
  lessonId: string | null
  form: LessonForm
  saving: boolean
  uploading: boolean
  pdfResources: PdfResource[]
  onChange: (form: LessonForm) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUploadVideo: (file: File) => void
  onRemoveVideo: () => void
  onUploadPdf: (file: File) => void
  onDeletePdf: (resourceId: string) => void
  onPreviewPdf: (storagePath: string) => void
}

function LessonDialog({
  editing,
  lessonId,
  form,
  saving,
  uploading,
  pdfResources,
  onChange,
  onClose,
  onSubmit,
  onUploadVideo,
  onRemoveVideo,
  onUploadPdf,
  onDeletePdf,
  onPreviewPdf,
}: LessonDialogProps) {
  const hasUploadedVideo = Boolean(form.videoUrl.trim())
  const mediaDisabled = saving || uploading

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-dialog-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-background p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 id="lesson-dialog-title" className="text-xl font-semibold">
              {editing ? 'Editar lección' : 'Nueva lección'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">El contenido acepta Markdown.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10" aria-label="Cerrar formulario">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Título *
              <input required maxLength={200} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} className={fieldClass} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Slug *
              <input required maxLength={200} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => onChange({ ...form, slug: event.target.value })} placeholder="nombre-de-leccion" className={fieldClass} />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            Resumen
            <textarea rows={2} maxLength={500} value={form.summary} onChange={(event) => onChange({ ...form, summary: event.target.value })} className={`${fieldClass} resize-y`} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Contenido Markdown
            <textarea rows={10} maxLength={50000} value={form.contentMDX} onChange={(event) => onChange({ ...form, contentMDX: event.target.value })} className={`${fieldClass} resize-y font-mono`} placeholder="# Título de la lección" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Duración (minutos)
              <input type="number" min="0" step="1" value={form.duration} onChange={(event) => onChange({ ...form, duration: event.target.value })} className={fieldClass} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Orden
              <input required type="number" min="0" step="1" value={form.order} onChange={(event) => onChange({ ...form, order: event.target.value })} className={fieldClass} />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            URL de video (opcional)
            <input
              type="url"
              maxLength={2000}
              value={hasUploadedVideo ? '' : form.videoUrl}
              onChange={(event) => onChange({ ...form, videoUrl: event.target.value })}
              placeholder="https://youtube.com/... o sube un archivo abajo"
              className={fieldClass}
              disabled={hasUploadedVideo}
            />
          </label>

          {editing && lessonId && hasUploadedVideo ? (
            <LessonVideoPreview
              lessonId={lessonId}
              videoUrl={form.videoUrl}
              uploading={uploading}
              disabled={mediaDisabled}
              onReplace={onUploadVideo}
              onRemove={onRemoveVideo}
            />
          ) : editing ? (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium">Subir video (MP4/WebM, máx. 100MB)</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
                <Upload className="h-4 w-4" />
                {uploading ? 'Subiendo…' : 'Seleccionar video'}
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  disabled={mediaDisabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onUploadVideo(file)
                    event.target.value = ''
                  }}
                />
              </label>
            </div>
          ) : null}

          {editing && (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium">Recursos PDF</p>
              {pdfResources.length > 0 && (
                <ul className="space-y-3">
                  {pdfResources.map((resource) => (
                    <li key={resource.id}>
                      <LessonPdfPreviewCard
                        resource={resource}
                        uploading={uploading}
                        disabled={mediaDisabled}
                        onPreview={() => onPreviewPdf(resource.storagePath)}
                        onRemove={() => onDeletePdf(resource.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
                <Upload className="h-4 w-4" />
                {uploading ? 'Subiendo…' : pdfResources.length > 0 ? 'Añadir otro PDF' : 'Añadir PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={mediaDisabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onUploadPdf(file)
                    event.target.value = ''
                  }}
                />
              </label>
            </div>
          )}
          {!editing && (
            <p className="text-xs text-muted-foreground">
              Guarda la lección primero para subir video o PDF.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <span>
                <span className="block text-sm font-medium">Publicada</span>
                <span className="block text-xs text-muted-foreground">Visible en la API pública.</span>
              </span>
              <input type="checkbox" checked={form.isPublished} onChange={(event) => onChange({ ...form, isPublished: event.target.checked })} className="h-5 w-5 accent-mauve-500" />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <span>
                <span className="block text-sm font-medium">Vista previa gratis</span>
                <span className="block text-xs text-muted-foreground">Disponible sin inscripción.</span>
              </span>
              <input type="checkbox" checked={form.isFreePreview} onChange={(event) => onChange({ ...form, isFreePreview: event.target.checked })} className="h-5 w-5 accent-mauve-500" />
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <CTAButton type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</CTAButton>
            <CTAButton type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear lección'}
            </CTAButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCourseStructurePage() {
  const params = useParams<{ courseId: string }>()
  const courseId = params.courseId
  const [course, setCourse] = useState<CourseHeader | null>(null)
  const [modules, setModules] = useState<CourseModule[]>([])
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [moduleEditor, setModuleEditor] = useState<CourseModule | null | undefined>(undefined)
  const [moduleDraft, setModuleDraft] = useState<ModuleForm>(moduleForm())
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null)
  const [lessonEditor, setLessonEditor] = useState<Lesson | null>(null)
  const [lessonDraft, setLessonDraft] = useState<LessonForm>(lessonForm())
  const [mediaUploading, setMediaUploading] = useState(false)
  const [lessonPdfResources, setLessonPdfResources] = useState<PdfResource[]>([])

  const fetchStructure = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [courseResponse, modulesResponse] = await Promise.all([
        authFetch(`/api/admin/courses/${courseId}`),
        authFetch(`/api/admin/courses/${courseId}/modules`),
      ])
      if (!courseResponse.ok) throw new Error(await apiError(courseResponse, 'No se pudo cargar el curso'))
      if (!modulesResponse.ok) throw new Error(await apiError(modulesResponse, 'No se pudieron cargar los módulos'))

      const courseBody = (await courseResponse.json()) as { course: CourseHeader }
      const modulesBody = (await modulesResponse.json()) as { modules?: CourseModule[] }
      const nextModules = modulesBody.modules || []
      setCourse(courseBody.course)
      setModules(nextModules)
      setExpandedModules((current) => {
        const existing = current.filter((id) => nextModules.some((module) => module.id === id))
        return existing.length > 0 ? existing : nextModules.map((module) => module.id)
      })
    } catch (fetchError) {
      setCourse(null)
      setModules([])
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el editor')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void fetchStructure()
  }, [fetchStructure])

  const showNotice = (message: string) => {
    setError(null)
    setNotice(message)
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]
    )
  }

  const openNewModule = () => {
    setModuleEditor(null)
    setModuleDraft(moduleForm(undefined, modules.length))
    setError(null)
  }

  const openEditModule = (module: CourseModule) => {
    setModuleEditor(module)
    setModuleDraft(moduleForm(module))
    setError(null)
  }

  const closeModuleEditor = () => {
    if (!saving) setModuleEditor(undefined)
  }

  const submitModule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await authFetch(
        moduleEditor ? `/api/admin/modules/${moduleEditor.id}` : `/api/admin/courses/${courseId}/modules`,
        {
          method: moduleEditor ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: moduleDraft.title,
            summary: moduleDraft.summary,
            order: Number(moduleDraft.order),
          }),
        }
      )
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo guardar el módulo'))
      const editing = Boolean(moduleEditor)
      setModuleEditor(undefined)
      showNotice(editing ? 'Módulo actualizado' : 'Módulo creado')
      await fetchStructure()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar el módulo')
    } finally {
      setSaving(false)
    }
  }

  const deleteModule = async (module: CourseModule) => {
    if (!window.confirm(`¿Eliminar el módulo "${module.title}" y todas sus lecciones?`)) return
    setActionId(module.id)
    try {
      const response = await authFetch(`/api/admin/modules/${module.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo eliminar el módulo'))
      showNotice('Módulo y lecciones eliminados')
      await fetchStructure()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el módulo')
    } finally {
      setActionId(null)
    }
  }

  const moveModule = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= modules.length) return
    const reordered = [...modules]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setActionId(`module-order:${modules[index].id}`)
    try {
      const response = await authFetch(`/api/admin/courses/${courseId}/modules/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleIds: reordered.map((module) => module.id) }),
      })
      if (!response.ok) throw new Error(await apiError(response, 'No se pudieron reordenar los módulos'))
      const body = (await response.json()) as { modules: CourseModule[] }
      setModules(body.modules)
      showNotice('Orden de módulos actualizado')
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'No se pudieron reordenar los módulos')
    } finally {
      setActionId(null)
    }
  }

  const openNewLesson = (module: CourseModule) => {
    setLessonModuleId(module.id)
    setLessonEditor(null)
    setLessonDraft(lessonForm(undefined, module.lessons.length))
    setError(null)
  }

  const openEditLesson = (moduleId: string, lesson: Lesson) => {
    setLessonModuleId(moduleId)
    setLessonEditor(lesson)
    setLessonDraft(lessonForm(lesson))
    setLessonPdfResources(parsePdfResources(lesson.pdfResources))
    setError(null)
  }

  const closeLessonEditor = () => {
    if (!saving && !mediaUploading) {
      setLessonModuleId(null)
      setLessonEditor(null)
      setLessonPdfResources([])
    }
  }

  const handleUploadVideo = async (file: File) => {
    if (!lessonEditor) return
    setMediaUploading(true)
    setError(null)
    try {
      const result = await uploadLessonVideo(lessonEditor.id, file)
      setLessonDraft((current) => ({ ...current, videoUrl: result.videoUrl }))
      setLessonEditor((current) => (current ? { ...current, videoUrl: result.videoUrl } : current))
      showNotice('Video subido correctamente')
      await fetchStructure()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir el video')
    } finally {
      setMediaUploading(false)
    }
  }

  const handleUploadPdf = async (file: File) => {
    if (!lessonEditor) return
    setMediaUploading(true)
    setError(null)
    try {
      const result = await uploadLessonPdf(lessonEditor.id, file, file.name)
      setLessonPdfResources(result.pdfResources)
      showNotice('PDF añadido correctamente')
      await fetchStructure()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir el PDF')
    } finally {
      setMediaUploading(false)
    }
  }

  const handleRemoveVideo = async () => {
    if (!lessonEditor) return
    setMediaUploading(true)
    setError(null)
    try {
      if (isStorageMediaRef(lessonEditor.videoUrl || '')) {
        await removeLessonVideo(lessonEditor.id)
      } else {
        const response = await authFetch(`/api/admin/lessons/${lessonEditor.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: '' }),
        })
        if (!response.ok) throw new Error(await apiError(response, 'No se pudo quitar el video'))
      }
      setLessonDraft((current) => ({ ...current, videoUrl: '' }))
      setLessonEditor((current) => (current ? { ...current, videoUrl: null } : current))
      showNotice('Video eliminado')
      await fetchStructure()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'No se pudo quitar el video')
    } finally {
      setMediaUploading(false)
    }
  }

  const handleDeletePdf = async (resourceId: string) => {
    if (!lessonEditor) return
    setMediaUploading(true)
    setError(null)
    try {
      const result = await deleteLessonPdf(lessonEditor.id, resourceId)
      setLessonPdfResources(result.pdfResources)
      showNotice('PDF eliminado')
      await fetchStructure()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el PDF')
    } finally {
      setMediaUploading(false)
    }
  }

  const handlePreviewPdf = async (storagePath: string) => {
    if (!lessonEditor) return
    try {
      const signedUrl = await fetchLessonMediaUrl(lessonEditor.id, storagePath)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'No se pudo abrir el PDF')
    }
  }

  const submitLesson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!lessonModuleId) return
    setSaving(true)
    setError(null)
    try {
      const response = await authFetch(
        lessonEditor ? `/api/admin/lessons/${lessonEditor.id}` : `/api/admin/modules/${lessonModuleId}/lessons`,
        {
          method: lessonEditor ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...lessonDraft,
            duration: lessonDraft.duration === '' ? undefined : Number(lessonDraft.duration),
            order: Number(lessonDraft.order),
          }),
        }
      )
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo guardar la lección'))
      const editing = Boolean(lessonEditor)
      setLessonModuleId(null)
      setLessonEditor(null)
      showNotice(editing ? 'Lección actualizada' : 'Lección creada')
      await fetchStructure()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la lección')
    } finally {
      setSaving(false)
    }
  }

  const updateLesson = async (lesson: Lesson, changes: Partial<Lesson>, message: string) => {
    setActionId(lesson.id)
    setError(null)
    try {
      const response = await authFetch(`/api/admin/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo actualizar la lección'))
      showNotice(message)
      await fetchStructure()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la lección')
    } finally {
      setActionId(null)
    }
  }

  const deleteLesson = async (lesson: Lesson) => {
    if (!window.confirm(`¿Eliminar la lección "${lesson.title}"?`)) return
    setActionId(lesson.id)
    try {
      const response = await authFetch(`/api/admin/lessons/${lesson.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo eliminar la lección'))
      showNotice('Lección eliminada')
      await fetchStructure()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la lección')
    } finally {
      setActionId(null)
    }
  }

  const moveLesson = async (module: CourseModule, index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= module.lessons.length) return
    const reordered = [...module.lessons]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setActionId(`lesson-order:${module.lessons[index].id}`)
    try {
      const response = await authFetch(`/api/admin/modules/${module.id}/lessons/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonIds: reordered.map((lesson) => lesson.id) }),
      })
      if (!response.ok) throw new Error(await apiError(response, 'No se pudieron reordenar las lecciones'))
      const body = (await response.json()) as { lessons: Lesson[] }
      setModules((current) => current.map((item) => item.id === module.id ? { ...item, lessons: body.lessons } : item))
      showNotice('Orden de lecciones actualizado')
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'No se pudieron reordenar las lecciones')
    } finally {
      setActionId(null)
    }
  }

  if (loading && !course) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando editor...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Link href="/admin/cursos" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a cursos
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <GradientText as="h1" className="text-3xl font-bold sm:text-4xl">
                {course?.title || 'Editor de curso'}
              </GradientText>
              {course && (
                <span className={`rounded-full border px-2.5 py-1 text-xs ${course.isPublished ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                  {course.isPublished ? 'Publicado' : 'Borrador'}
                </span>
              )}
            </div>
            <p className="font-mono text-sm text-muted-foreground">{course?.slug}</p>
          </div>
          <CTAButton onClick={openNewModule} className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Nuevo módulo
          </CTAButton>
        </div>
      </motion.div>

      {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {notice && <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300"><CheckCircle2 className="h-4 w-4" />{notice}</div>}

      {!loading && modules.length === 0 ? (
        <GlassCard className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-mauve-400" />
          <p className="font-medium">Este curso todavía no tiene módulos</p>
          <p className="mt-1 text-sm text-muted-foreground">Crea un módulo para comenzar a organizar sus lecciones.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => {
            const expanded = expandedModules.includes(module.id)
            const moduleBusy = actionId === module.id || actionId === `module-order:${module.id}`
            return (
              <GlassCard key={module.id} className="overflow-hidden">
                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <button type="button" onClick={() => toggleModule(module.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    {expanded ? <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-mauve-400" /> : <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-mauve-400" />}
                    <span className="min-w-0">
                      <span className="block font-semibold">{moduleIndex + 1}. {module.title}</span>
                      <span className="mt-1 block truncate text-sm text-muted-foreground">{module.summary || 'Sin resumen'} · {module.lessons.length} lecciones</span>
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <button type="button" onClick={() => void moveModule(moduleIndex, -1)} disabled={moduleIndex === 0 || moduleBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 disabled:opacity-30" title="Subir módulo" aria-label={`Subir ${module.title}`}><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void moveModule(moduleIndex, 1)} disabled={moduleIndex === modules.length - 1 || moduleBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 disabled:opacity-30" title="Bajar módulo" aria-label={`Bajar ${module.title}`}><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => openEditModule(module)} disabled={moduleBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground" title="Editar módulo" aria-label={`Editar ${module.title}`}><Edit3 className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void deleteModule(module)} disabled={moduleBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-300" title="Eliminar módulo" aria-label={`Eliminar ${module.title}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-white/10">
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-medium">Lecciones</p>
                      <button type="button" onClick={() => openNewLesson(module)} className="inline-flex items-center gap-2 rounded-lg bg-mauve-500/10 px-3 py-2 text-xs font-medium text-mauve-300 transition hover:bg-mauve-500/20">
                        <Plus className="h-4 w-4" /> Nueva lección
                      </button>
                    </div>
                    {module.lessons.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">No hay lecciones en este módulo.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left text-sm">
                          <thead className="border-b border-white/10 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3 font-medium">Lección</th>
                              <th className="px-4 py-3 font-medium">Estado</th>
                              <th className="px-4 py-3 font-medium">Duración</th>
                              <th className="px-4 py-3 font-medium">Acceso</th>
                              <th className="px-4 py-3 text-right font-medium">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {module.lessons.map((lesson, lessonIndex) => {
                              const lessonBusy = actionId === lesson.id || actionId === `lesson-order:${lesson.id}`
                              return (
                                <tr key={lesson.id} className="hover:bg-white/[0.03]">
                                  <td className="px-4 py-3">
                                    <p className="font-medium">{lessonIndex + 1}. {lesson.title}</p>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">{lesson.slug}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full border px-2 py-1 text-xs ${lesson.isPublished ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                                      {lesson.isPublished ? 'Publicada' : 'Borrador'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{lesson.duration == null ? '—' : `${lesson.duration} min`}</span></td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    <span className="inline-flex items-center gap-2">{lesson.isFreePreview && <><Eye className="h-4 w-4 text-mauve-300" /> Gratis</>}{lesson.videoUrl && <Video className="h-4 w-4" />}{parsePdfResources(lesson.pdfResources).length > 0 && <FileText className="h-4 w-4 text-mauve-300" />}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1">
                                      <button type="button" onClick={() => void moveLesson(module, lessonIndex, -1)} disabled={lessonIndex === 0 || lessonBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 disabled:opacity-30" title="Subir lección" aria-label={`Subir ${lesson.title}`}><ArrowUp className="h-4 w-4" /></button>
                                      <button type="button" onClick={() => void moveLesson(module, lessonIndex, 1)} disabled={lessonIndex === module.lessons.length - 1 || lessonBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 disabled:opacity-30" title="Bajar lección" aria-label={`Bajar ${lesson.title}`}><ArrowDown className="h-4 w-4" /></button>
                                      <button type="button" onClick={() => void updateLesson(lesson, { isPublished: !lesson.isPublished }, lesson.isPublished ? 'Lección movida a borrador' : 'Lección publicada')} disabled={lessonBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-mauve-500/10 hover:text-mauve-300" title={lesson.isPublished ? 'Despublicar' : 'Publicar'} aria-label={`${lesson.isPublished ? 'Despublicar' : 'Publicar'} ${lesson.title}`}>{lessonBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}</button>
                                      <button type="button" onClick={() => openEditLesson(module.id, lesson)} disabled={lessonBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground" title="Editar lección" aria-label={`Editar ${lesson.title}`}><Edit3 className="h-4 w-4" /></button>
                                      <button type="button" onClick={() => void deleteLesson(lesson)} disabled={lessonBusy} className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-300" title="Eliminar lección" aria-label={`Eliminar ${lesson.title}`}><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      )}

      {moduleEditor !== undefined && <ModuleDialog editing={moduleEditor} form={moduleDraft} saving={saving} onChange={setModuleDraft} onClose={closeModuleEditor} onSubmit={submitModule} />}
      {lessonModuleId && (
        <LessonDialog
          editing={lessonEditor}
          lessonId={lessonEditor?.id ?? null}
          form={lessonDraft}
          saving={saving}
          uploading={mediaUploading}
          pdfResources={lessonPdfResources}
          onChange={setLessonDraft}
          onClose={closeLessonEditor}
          onSubmit={submitLesson}
          onUploadVideo={(file) => void handleUploadVideo(file)}
          onRemoveVideo={() => void handleRemoveVideo()}
          onUploadPdf={(file) => void handleUploadPdf(file)}
          onDeletePdf={(resourceId) => void handleDeletePdf(resourceId)}
          onPreviewPdf={(storagePath) => void handlePreviewPdf(storagePath)}
        />
      )}
    </div>
  )
}
