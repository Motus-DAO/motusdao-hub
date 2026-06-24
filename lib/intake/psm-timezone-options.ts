/** Curated IANA timezones for PSM intake — grouped by país, human-readable labels. */

export type PsmTimezoneOption = {
  value: string
  country: string
  city: string
}

export const PSM_TIMEZONES: PsmTimezoneOption[] = [
  // México
  { value: 'America/Mexico_City', country: 'mexico', city: 'Ciudad de México y centro' },
  { value: 'America/Cancun', country: 'mexico', city: 'Quintana Roo (Cancún)' },
  { value: 'America/Mazatlan', country: 'mexico', city: 'Pacífico — Sinaloa, Nayarit' },
  { value: 'America/Tijuana', country: 'mexico', city: 'Pacífico — Baja California' },

  // Colombia
  { value: 'America/Bogota', country: 'colombia', city: 'Bogotá y todo el país' },

  // Argentina
  { value: 'America/Argentina/Buenos_Aires', country: 'argentina', city: 'Buenos Aires' },
  { value: 'America/Argentina/Cordoba', country: 'argentina', city: 'Córdoba y centro' },
  { value: 'America/Argentina/Mendoza', country: 'argentina', city: 'Mendoza y oeste' },

  // Chile
  { value: 'America/Santiago', country: 'chile', city: 'Santiago y continental' },
  { value: 'Pacific/Easter', country: 'chile', city: 'Isla de Pascua' },

  // Perú
  { value: 'America/Lima', country: 'peru', city: 'Lima y todo el país' },

  // Venezuela
  { value: 'America/Caracas', country: 'venezuela', city: 'Caracas y todo el país' },

  // Ecuador
  { value: 'America/Guayaquil', country: 'ecuador', city: 'Guayaquil y continental' },
  { value: 'Pacific/Galapagos', country: 'ecuador', city: 'Galápagos' },

  // Bolivia
  { value: 'America/La_Paz', country: 'bolivia', city: 'La Paz y todo el país' },

  // Paraguay
  { value: 'America/Asuncion', country: 'paraguay', city: 'Asunción y todo el país' },

  // Uruguay
  { value: 'America/Montevideo', country: 'uruguay', city: 'Montevideo y todo el país' },

  // España
  { value: 'Europe/Madrid', country: 'espana', city: 'Península (Madrid, Barcelona…)' },
  { value: 'Atlantic/Canary', country: 'espana', city: 'Islas Canarias' },

  // Otros / fuera de la región (diaspora, remoto)
  { value: 'America/New_York', country: 'otros', city: 'Estados Unidos — Este (Nueva York)' },
  { value: 'America/Chicago', country: 'otros', city: 'Estados Unidos — Centro (Chicago)' },
  { value: 'America/Denver', country: 'otros', city: 'Estados Unidos — Montaña (Denver)' },
  { value: 'America/Los_Angeles', country: 'otros', city: 'Estados Unidos — Pacífico (Los Ángeles)' },
  { value: 'America/Toronto', country: 'otros', city: 'Canadá — Este (Toronto)' },
  { value: 'Europe/London', country: 'otros', city: 'Reino Unido (Londres)' },
  { value: 'Europe/Paris', country: 'otros', city: 'Francia / CET (París)' },
  { value: 'America/Sao_Paulo', country: 'otros', city: 'Brasil (São Paulo)' },
]

const TIMEZONE_VALUE_SET = new Set(PSM_TIMEZONES.map((tz) => tz.value))

const COUNTRY_LABELS: Record<string, string> = {
  mexico: 'México',
  colombia: 'Colombia',
  argentina: 'Argentina',
  chile: 'Chile',
  peru: 'Perú',
  venezuela: 'Venezuela',
  ecuador: 'Ecuador',
  bolivia: 'Bolivia',
  paraguay: 'Paraguay',
  uruguay: 'Uruguay',
  espana: 'España',
  otros: 'Otros países',
}

/** UTC offset label, e.g. "UTC-6" — safe on server (returns empty). */
export function formatTimezoneOffset(tz: string, at = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('es', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(at)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

export function getTimezoneDisplayLabel(value: string): string {
  const option = PSM_TIMEZONES.find((tz) => tz.value === value)
  if (!option) return value
  const offset = formatTimezoneOffset(value)
  const country = COUNTRY_LABELS[option.country] ?? option.country
  return offset
    ? `${country} — ${option.city} (${offset})`
    : `${country} — ${option.city}`
}

export function getPsmTimezoneGroups() {
  const order = [
    'mexico',
    'colombia',
    'argentina',
    'chile',
    'peru',
    'venezuela',
    'ecuador',
    'bolivia',
    'paraguay',
    'uruguay',
    'espana',
    'otros',
  ]

  return order
    .map((country) => ({
      country,
      label: COUNTRY_LABELS[country] ?? country,
      options: PSM_TIMEZONES.filter((tz) => tz.country === country).map((tz) => ({
        value: tz.value,
        label: tz.city,
        offset: formatTimezoneOffset(tz.value),
      })),
    }))
    .filter((group) => group.options.length > 0)
}

export function isKnownPsmTimezone(value: string | undefined): boolean {
  return Boolean(value && TIMEZONE_VALUE_SET.has(value))
}

export function resolvePsmTimezoneDefault(input: {
  timezone?: string
  pais?: string
  browserTimezone?: string
}): string {
  if (input.timezone && TIMEZONE_VALUE_SET.has(input.timezone)) {
    return input.timezone
  }

  if (input.browserTimezone && TIMEZONE_VALUE_SET.has(input.browserTimezone)) {
    return input.browserTimezone
  }

  if (input.pais) {
    const forCountry = PSM_TIMEZONES.find((tz) => tz.country === input.pais)
    if (forCountry) return forCountry.value
  }

  return 'America/Mexico_City'
}
