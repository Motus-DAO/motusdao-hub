'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  ImageIcon,
  Loader2,
  Plus,
  Power,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import { slugifyCourseTitle } from '@/lib/academy/slug'
import { authFetch } from '@/lib/auth/client'
import { isStorageMediaRef, parsePdfResources, fromStorageRef, type PdfResource } from '@/lib/academy/media'
import { videoEmbedUrl } from '@/lib/academy/markdown'
import {
  deleteLessonPdf,
  fetchLessonMediaUrl,
  removeLessonVideo,
  uploadLessonImage,
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
}

type LessonForm = {
  title: string
  slug: string
  summary: string
  contentMDX: string
  duration: string
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

function moduleForm(module?: CourseModule): ModuleForm {
  return {
    title: module?.title || '',
    summary: module?.summary || '',
  }
}

function lessonForm(lesson?: Lesson): LessonForm {
  return {
    title: lesson?.title || '',
    slug: lesson?.slug || '',
    summary: lesson?.summary || '',
    contentMDX: lesson?.contentMDX || '',
    duration: lesson?.duration == null ? '' : String(lesson.duration),
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

type PendingLessonImageCardProps = {
  file: File
  disabled?: boolean
  onRemove: () => void
}

function PendingLessonImageCard({ file, disabled, onRemove }: PendingLessonImageCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <li className="rounded-lg border border-white/10 bg-white/5 p-2">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/20">
        {previewUrl ? (
          <img src={previewUrl} alt={file.name} className="h-36 w-full object-contain" />
        ) : (
          <div className="flex h-36 items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{file.name}</p>
          <p className="text-xs text-emerald-300">Seleccionada · se subirá al guardar</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="shrink-0 text-xs text-muted-foreground hover:text-red-300 disabled:opacity-50"
        >
          Quitar
        </button>
      </div>
    </li>
  )
}

type LessonImageUploadPreviewProps = {
  previewUrl: string
  name: string
  uploading: boolean
  uploaded: boolean
}

function LessonImageUploadPreview({
  previewUrl,
  name,
  uploading,
  uploaded,
}: LessonImageUploadPreviewProps) {
  return (
    <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      {uploaded ? (
        <label className="flex cursor-default items-center gap-2 text-sm text-emerald-300">
          <input type="checkbox" checked readOnly className="h-4 w-4 accent-emerald-500" aria-hidden />
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Imagen subida e insertada en el Markdown
        </label>
      ) : (
        <p className="text-sm text-muted-foreground">Subiendo imagen…</p>
      )}
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/20">
        <img src={previewUrl} alt={name} className="h-40 w-full object-contain" />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground">{name}</p>
    </div>
  )
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
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-dialog-title"
        className="w-full max-w-2xl rounded-lg border border-white/10 bg-background p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 id="module-dialog-title" className="text-xl font-semibold">
              {editing ? 'Editar módulo' : 'Nuevo módulo'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Los campos marcados con * son obligatorios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Cerrar formulario"
          >
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
    </div>,
    document.body,
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
  onUploadImage: (file: File) => void
  onDeletePdf: (resourceId: string) => void
  onPreviewPdf: (storagePath: string) => void
  pendingVideoFile: File | null
  pendingPdfFiles: File[]
  pendingImageFiles: File[]
  onSetPendingVideoFile: (file: File | null) => void
  onAddPendingPdfFile: (file: File) => void
  onAddPendingImageFile: (file: File) => void
  onRemovePendingPdfFile: (index: number) => void
  onRemovePendingImageFile: (index: number) => void
  onTitleChange: (title: string) => void
  lastUploadedImage: { imageUrl: string; name: string } | null
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
  onUploadImage,
  onDeletePdf,
  onPreviewPdf,
  pendingVideoFile,
  pendingPdfFiles,
  pendingImageFiles,
  onSetPendingVideoFile,
  onAddPendingPdfFile,
  onAddPendingImageFile,
  onRemovePendingPdfFile,
  onRemovePendingImageFile,
  onTitleChange,
  lastUploadedImage,
}: LessonDialogProps) {
  const [activeImagePreview, setActiveImagePreview] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    return () => {
      if (activeImagePreview?.url.startsWith('blob:')) {
        URL.revokeObjectURL(activeImagePreview.url)
      }
    }
  }, [activeImagePreview])

  useEffect(() => {
    if (lastUploadedImage && activeImagePreview?.url.startsWith('blob:')) {
      URL.revokeObjectURL(activeImagePreview.url)
      setActiveImagePreview(null)
    }
  }, [lastUploadedImage, activeImagePreview])

  const hasUploadedVideo = Boolean(form.videoUrl.trim())
  const hasStorageVideo = isStorageMediaRef(form.videoUrl.trim())
  const mediaDisabled = saving || uploading
  const videoEmbed = !hasStorageVideo ? videoEmbedUrl(form.videoUrl.trim()) : null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-dialog-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-background p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 id="lesson-dialog-title" className="text-xl font-semibold">
              {editing ? 'Editar lección' : 'Nueva lección'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Los campos marcados con * son obligatorios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mediaDisabled}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Cerrar formulario"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Título *
              <input required maxLength={200} value={form.title} onChange={(event) => onTitleChange(event.target.value)} className={fieldClass} />
              {!editing && (
                <span className="block text-xs font-normal text-muted-foreground">
                  El slug se genera automáticamente con este título y podrás editarlo después.
                </span>
              )}
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Slug *
              <input
                required
                maxLength={200}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={form.slug}
                onChange={(event) => onChange({ ...form, slug: event.target.value })}
                placeholder="nombre-de-leccion"
                className={fieldClass}
                readOnly={!editing}
                title={editing ? undefined : 'Se genera automáticamente a partir del título'}
              />
              {!editing && (
                <span className="block text-xs font-normal text-muted-foreground">
                  Se genera automáticamente del título.
                </span>
              )}
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
          <div className="grid gap-4 sm:grid-cols-1">
            <label className="space-y-1.5 text-sm font-medium">
              Duración (minutos)
              <input type="number" min="0" step="1" value={form.duration} onChange={(event) => onChange({ ...form, duration: event.target.value })} className={fieldClass} />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            URL de video (opcional)
            <input
              type="url"
              maxLength={2000}
              value={form.videoUrl}
              onChange={(event) => onChange({ ...form, videoUrl: event.target.value })}
              placeholder="https://youtube.com/... o sube un archivo abajo"
              className={fieldClass}
              disabled={hasStorageVideo}
            />
            {hasStorageVideo && (
              <p className="text-xs font-normal text-muted-foreground">
                Este campo se bloquea porque hay un archivo de video subido. Quita el video para usar URL externa.
              </p>
            )}
          </label>

          {!hasStorageVideo && form.videoUrl.trim() && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-muted-foreground">Vista previa del enlace</p>
              {videoEmbed?.type === 'iframe' ? (
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <iframe
                    src={videoEmbed.src}
                    title="Vista previa del video"
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <video src={form.videoUrl.trim()} controls className="max-h-56 w-full rounded-lg border border-white/10 bg-black/30" preload="metadata" />
              )}
            </div>
          )}

          {editing && lessonId && hasUploadedVideo ? (
            <LessonVideoPreview
              lessonId={lessonId}
              videoUrl={form.videoUrl}
              uploading={uploading}
              disabled={mediaDisabled}
              onReplace={onUploadVideo}
              onRemove={onRemoveVideo}
            />
          ) : (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium">Subir video (MP4/WebM, máx. 100MB)</p>
              {!editing && pendingVideoFile && (
                <p className="text-xs text-emerald-300">Archivo seleccionado: {pendingVideoFile.name}</p>
              )}
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
                    if (file) {
                      if (editing) onUploadVideo(file)
                      else onSetPendingVideoFile(file)
                    }
                    event.target.value = ''
                  }}
                />
              </label>
              {!editing && pendingVideoFile && (
                <button
                  type="button"
                  onClick={() => onSetPendingVideoFile(null)}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  Quitar video seleccionado
                </button>
              )}
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">Recursos PDF</p>
            {editing && pdfResources.length > 0 && (
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
            {!editing && pendingPdfFiles.length > 0 && (
              <ul className="space-y-2">
                {pendingPdfFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => onRemovePendingPdfFile(index)}
                      className="text-muted-foreground hover:text-red-300"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
              <Upload className="h-4 w-4" />
              {uploading ? 'Subiendo…' : editing ? (pdfResources.length > 0 ? 'Añadir otro PDF' : 'Añadir PDF') : 'Seleccionar PDF'}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={mediaDisabled}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    if (editing) onUploadPdf(file)
                    else onAddPendingPdfFile(file)
                  }
                  event.target.value = ''
                }}
              />
            </label>
            {!editing && (
              <p className="text-xs text-muted-foreground">
                Los archivos se subirán automáticamente al guardar la lección.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Imágenes para contenido</p>
              {!editing && pendingImageFiles.length > 0 && (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                  {pendingImageFiles.length} seleccionada{pendingImageFiles.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {editing && lastUploadedImage && (
              <LessonImageUploadPreview
                previewUrl={lastUploadedImage.imageUrl}
                name={lastUploadedImage.name}
                uploading={false}
                uploaded
              />
            )}

            {editing && activeImagePreview && (
              <LessonImageUploadPreview
                previewUrl={activeImagePreview.url}
                name={activeImagePreview.name}
                uploading={uploading}
                uploaded={false}
              />
            )}

            {!editing && pendingImageFiles.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {pendingImageFiles.map((file, index) => (
                  <PendingLessonImageCard
                    key={`${file.name}-${index}`}
                    file={file}
                    disabled={mediaDisabled}
                    onRemove={() => onRemovePendingImageFile(index)}
                  />
                ))}
              </ul>
            )}

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
              <ImageIcon className="h-4 w-4" />
              {uploading ? 'Subiendo…' : editing ? 'Subir imagen e insertar en Markdown' : 'Seleccionar imagen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={mediaDisabled}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    if (editing) {
                      if (activeImagePreview?.url.startsWith('blob:')) {
                        URL.revokeObjectURL(activeImagePreview.url)
                      }
                      setActiveImagePreview({ url: URL.createObjectURL(file), name: file.name })
                      onUploadImage(file)
                    } else {
                      onAddPendingImageFile(file)
                    }
                  }
                  event.target.value = ''
                }}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {editing
                ? 'La URL se inserta automáticamente en el Markdown de la lección.'
                : 'Las imágenes se subirán al guardar y sus URLs se insertarán en el Markdown.'}
            </p>
          </div>
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
            <CTAButton type="button" variant="ghost" onClick={onClose} disabled={mediaDisabled}>
              Cancelar
            </CTAButton>
            <CTAButton type="submit" disabled={mediaDisabled} className="gap-2">
              {mediaDisabled && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear lección'}
            </CTAButton>
          </div>
        </form>
      </div>
      </div>
    </div>,
    document.body,
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
  const [pendingLessonVideoFile, setPendingLessonVideoFile] = useState<File | null>(null)
  const [pendingLessonPdfFiles, setPendingLessonPdfFiles] = useState<File[]>([])
  const [pendingLessonImageFiles, setPendingLessonImageFiles] = useState<File[]>([])
  const [lastUploadedLessonImage, setLastUploadedLessonImage] = useState<{
    imageUrl: string
    name: string
  } | null>(null)
  const hasDialogOpen = moduleEditor !== undefined || Boolean(lessonModuleId)

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

  useEffect(() => {
    if (!hasDialogOpen) return

    const shell = document.querySelector<HTMLElement>('[data-app-shell-scroll]')
    const targets = [document.body, shell].filter((el): el is HTMLElement => Boolean(el))
    const previous = targets.map((el) => ({
      el,
      overflow: el.style.overflow,
      paddingRight: el.style.paddingRight,
    }))
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    for (const el of targets) {
      el.style.overflow = 'hidden'
      if (scrollbarWidth > 0 && el === document.body) {
        el.style.paddingRight = `${scrollbarWidth}px`
      }
    }

    return () => {
      for (const entry of previous) {
        entry.el.style.overflow = entry.overflow
        entry.el.style.paddingRight = entry.paddingRight
      }
    }
  }, [hasDialogOpen])

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
    setModuleDraft(moduleForm(undefined))
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
    setLessonDraft(lessonForm(undefined))
    setPendingLessonVideoFile(null)
    setPendingLessonPdfFiles([])
    setPendingLessonImageFiles([])
    setLastUploadedLessonImage(null)
    setError(null)
  }

  const openEditLesson = (moduleId: string, lesson: Lesson) => {
    setLessonModuleId(moduleId)
    setLessonEditor(lesson)
    setLessonDraft(lessonForm(lesson))
    setLessonPdfResources(parsePdfResources(lesson.pdfResources))
    setPendingLessonVideoFile(null)
    setPendingLessonPdfFiles([])
    setPendingLessonImageFiles([])
    setLastUploadedLessonImage(null)
    setError(null)
  }

  const closeLessonEditor = () => {
    if (!saving && !mediaUploading) {
      setLessonModuleId(null)
      setLessonEditor(null)
      setLessonPdfResources([])
      setPendingLessonVideoFile(null)
      setPendingLessonPdfFiles([])
      setPendingLessonImageFiles([])
      setLastUploadedLessonImage(null)
    }
  }

  const handleLessonTitleChange = (title: string) => {
    setLessonDraft((current) => {
      if (lessonEditor) return { ...current, title }
      return { ...current, title, slug: slugifyCourseTitle(title) }
    })
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

  const appendMarkdownImage = (imageUrl: string, altText = 'Imagen'): void => {
    setLessonDraft((current) => {
      const trimmed = current.contentMDX.trimEnd()
      const separator = trimmed.length > 0 ? '\n\n' : ''
      return {
        ...current,
        contentMDX: `${trimmed}${separator}![${altText}](${imageUrl})`,
      }
    })
  }

  const handleUploadImage = async (file: File) => {
    if (!lessonEditor) return
    setLastUploadedLessonImage(null)
    setMediaUploading(true)
    setError(null)
    try {
      const result = await uploadLessonImage(lessonEditor.id, file)
      appendMarkdownImage(result.imageUrl, file.name.replace(/\.[^.]+$/, '') || 'Imagen')
      setLastUploadedLessonImage({ imageUrl: result.imageUrl, name: file.name })
      showNotice('Imagen subida e insertada en el contenido')
      await fetchStructure()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen')
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
      const creating = !lessonEditor
      const response = await authFetch(
        lessonEditor ? `/api/admin/lessons/${lessonEditor.id}` : `/api/admin/modules/${lessonModuleId}/lessons`,
        {
          method: lessonEditor ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: lessonDraft.title,
            slug: lessonDraft.slug,
            summary: lessonDraft.summary,
            contentMDX: lessonDraft.contentMDX,
            duration: lessonDraft.duration === '' ? undefined : Number(lessonDraft.duration),
            isPublished: lessonDraft.isPublished,
            isFreePreview: lessonDraft.isFreePreview,
            videoUrl: lessonDraft.videoUrl,
          }),
        }
      )
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo guardar la lección'))
      const body = (await response.json().catch(() => ({}))) as { lesson?: Lesson }
      const createdLessonId = creating ? body.lesson?.id : null
      let createdWithWarnings = false

      if (creating && createdLessonId) {
        const uploadWarnings: string[] = []
        if (pendingLessonVideoFile) {
          try {
            setMediaUploading(true)
            await uploadLessonVideo(createdLessonId, pendingLessonVideoFile)
          } catch {
            uploadWarnings.push('No se pudo subir el video')
          }
        }
        for (const file of pendingLessonPdfFiles) {
          try {
            setMediaUploading(true)
            await uploadLessonPdf(createdLessonId, file, file.name)
          } catch {
            uploadWarnings.push(`No se pudo subir el PDF "${file.name}"`)
          }
        }
        if (pendingLessonImageFiles.length > 0) {
          const uploadedImageUrls: string[] = []
          for (const file of pendingLessonImageFiles) {
            try {
              setMediaUploading(true)
              const uploaded = await uploadLessonImage(createdLessonId, file)
              uploadedImageUrls.push(uploaded.imageUrl)
            } catch {
              uploadWarnings.push(`No se pudo subir la imagen "${file.name}"`)
            }
          }
          if (uploadedImageUrls.length > 0) {
            const imageMarkdown = uploadedImageUrls
              .map((url, index) => `![Imagen ${index + 1}](${url})`)
              .join('\n\n')
            const mergedContent = [lessonDraft.contentMDX.trim(), imageMarkdown]
              .filter((chunk) => chunk.length > 0)
              .join('\n\n')
            const updateResponse = await authFetch(`/api/admin/lessons/${createdLessonId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contentMDX: mergedContent }),
            })
            if (!updateResponse.ok) {
              uploadWarnings.push('No se pudo insertar la URL de imagen en el contenido')
            }
          }
        }

        if (uploadWarnings.length > 0) {
          createdWithWarnings = true
          setNotice(`Lección creada con avisos: ${uploadWarnings.join(' · ')}`)
        }
      }
      const editing = Boolean(lessonEditor)
      setLessonModuleId(null)
      setLessonEditor(null)
      setPendingLessonVideoFile(null)
      setPendingLessonPdfFiles([])
      setPendingLessonImageFiles([])
      setLessonPdfResources([])
      if (!creating) {
        showNotice(editing ? 'Lección actualizada' : 'Lección creada')
      } else if (!createdWithWarnings) {
        showNotice('Lección creada')
      }
      await fetchStructure()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la lección')
    } finally {
      setMediaUploading(false)
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
          onUploadImage={(file) => void handleUploadImage(file)}
          onDeletePdf={(resourceId) => void handleDeletePdf(resourceId)}
          onPreviewPdf={(storagePath) => void handlePreviewPdf(storagePath)}
          pendingVideoFile={pendingLessonVideoFile}
          pendingPdfFiles={pendingLessonPdfFiles}
          pendingImageFiles={pendingLessonImageFiles}
          onSetPendingVideoFile={setPendingLessonVideoFile}
          onAddPendingPdfFile={(file) => setPendingLessonPdfFiles((current) => [...current, file])}
          onAddPendingImageFile={(file) => setPendingLessonImageFiles((current) => [...current, file])}
          onRemovePendingPdfFile={(index) =>
            setPendingLessonPdfFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
          }
          onRemovePendingImageFile={(index) =>
            setPendingLessonImageFiles((current) =>
              current.filter((_, currentIndex) => currentIndex !== index)
            )
          }
          onTitleChange={handleLessonTitleChange}
          lastUploadedImage={lastUploadedLessonImage}
        />
      )}
    </div>
  )
}
