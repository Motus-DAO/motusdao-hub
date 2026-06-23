import { Prisma } from '@prisma/client'

/** Coerce JSONB, Prisma Json, or legacy TEXT JSON into a string array. */
export function asStringArray(value: unknown): string[] {
  if (value == null) return []
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
    } catch {
      return []
    }
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return []
}

/** Coerce JSONB, Prisma Json, or legacy TEXT JSON into a plain object. */
export function asJsonObject(value: unknown): Record<string, unknown> {
  if (value == null) return {}
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/** Cast a value for Prisma JSON/JSONB columns. */
export function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}
