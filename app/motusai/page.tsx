import { redirect } from 'next/navigation'

/** Legacy product path — Psychat lives at /psychat. */
export default function MotusAILegacyRedirectPage() {
  redirect('/psychat')
}
