/** Hard cap: hours in a calendar week (sanity check on the form). */
export const PSM_MAX_WEEKLY_THERAPY_HOURS = 168

/** Above this, show a human-capacity warning (value is still allowed). */
export const PSM_WEEKLY_HOURS_WARNING_THRESHOLD = 60

const WORK_DAYS_PER_WEEK = 5
const ASSUMED_SESSION_HOURS = 1

export type WeeklyTherapyHoursInsight = {
  hoursPerWorkDay: number
  approxSessionsPerWorkDay: number
  message: string
}

export function getWeeklyTherapyHoursInsight(hours: number): WeeklyTherapyHoursInsight | null {
  if (!Number.isFinite(hours) || hours <= PSM_WEEKLY_HOURS_WARNING_THRESHOLD) {
    return null
  }

  const hoursPerWorkDay = hours / WORK_DAYS_PER_WEEK
  const approxSessionsPerWorkDay = Math.round(hoursPerWorkDay / ASSUMED_SESSION_HOURS)

  const message =
    hours >= 120
      ? `Declaraste ${hours} h/semana (~${hoursPerWorkDay.toFixed(0)} h al día en ${WORK_DAYS_PER_WEEK} días, unas ${approxSessionsPerWorkDay} sesiones de ${ASSUMED_SESSION_HOURS} h). Eso implicaría atender a muchísimas personas cada día; no es humanamente sostenible ni compatible con una práctica clínica segura. Si fue un error de captura, corrige el número. Motus usará este dato para planificar derivaciones.`
      : `Declaraste ${hours} h/semana (~${hoursPerWorkDay.toFixed(1)} h/día en ${WORK_DAYS_PER_WEEK} días, unas ${approxSessionsPerWorkDay} sesiones de ${ASSUMED_SESSION_HOURS} h). Supera lo que la mayoría puede sostener con calidad, supervisión y descanso. Si es correcto para tu caso, puedes continuar; Motus lo tendrá en cuenta al asignar usuarios.`

  return { hoursPerWorkDay, approxSessionsPerWorkDay, message }
}
