import { z } from 'zod'
import { isValidLessonVideoUrl } from '@/lib/academy/media'

const optionalText = (max: number) => z.string().trim().max(max).optional()
const orderField = z.coerce.number().int().min(0, 'El orden no puede ser negativo').optional()

const moduleFields = {
  title: z.string().trim().min(1, 'El título es obligatorio').max(200),
  summary: optionalText(500),
  order: orderField,
}

export const createModuleSchema = z.object(moduleFields).strict()
export const updateModuleSchema = z
  .object(moduleFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  })

const lessonFields = {
  title: z.string().trim().min(1, 'El título es obligatorio').max(200),
  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'El slug solo puede contener letras minúsculas, números y guiones'
    ),
  summary: optionalText(500),
  contentMDX: optionalText(50_000),
  duration: z.coerce
    .number()
    .int('La duración debe ser un número entero')
    .min(0, 'La duración no puede ser negativa')
    .max(100_000)
    .optional(),
  order: orderField,
  isPublished: z.boolean().optional(),
  isFreePreview: z.boolean().optional(),
  videoUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => value === '' || isValidLessonVideoUrl(value), 'La URL de video no es válida')
    .optional(),
}

export const createLessonSchema = z.object(lessonFields).strict()
export const updateLessonSchema = z
  .object(lessonFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  })

function uniqueIds(message: string) {
  return z
    .array(z.string().min(1))
    .min(1, 'La lista no puede estar vacía')
    .refine((ids) => new Set(ids).size === ids.length, message)
}

export const reorderModulesSchema = z
  .object({ moduleIds: uniqueIds('Los módulos no pueden repetirse') })
  .strict()

export const reorderLessonsSchema = z
  .object({ lessonIds: uniqueIds('Las lecciones no pueden repetirse') })
  .strict()
