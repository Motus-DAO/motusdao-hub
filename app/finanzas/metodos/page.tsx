import { redirect } from 'next/navigation'

/** Métodos lives inside Resumen; keep old links working. */
export default function MetodosPage() {
  redirect('/finanzas')
}
