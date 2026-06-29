import { randomBytes } from 'crypto'
import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).optional()

const courseFields = {
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
  summary: z.string().trim().min(1, 'El resumen es obligatorio').max(500),
  description: optionalText(5000),
  category: optionalText(100),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  priceAmount: z.coerce
    .number()
    .finite('El precio debe ser un número válido')
    .min(0, 'El precio no puede ser negativo')
    .max(9_999_999_999.99)
    .optional(),
  priceCurrency: z
    .string()
    .trim()
    .length(3, 'La moneda debe tener 3 caracteres')
    .transform((value) => value.toUpperCase())
    .optional(),
  isPublished: z.boolean().optional(),
  imageUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .refine((value) => !value || value.startsWith('https://') || value.startsWith('http://'), {
      message: 'La URL de portada debe comenzar con http:// o https://',
    }),
}

export const createCourseSchema = z.object(courseFields).strict()

export const updateCourseSchema = z
  .object(courseFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Envía al menos un campo para actualizar',
  })

const processFingerprint = randomBytes(2).toString('hex')

/** Generates a lowercase alphanumeric CUID without adding a runtime dependency. */
export function cuid(): string {
  const timestamp = Date.now().toString(36)
  const entropy = randomBytes(8).toString('hex')
  return `c${timestamp}${processFingerprint}${entropy}`.slice(0, 25)
}
