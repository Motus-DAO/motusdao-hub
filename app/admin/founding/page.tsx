'use client'

import { useCallback, useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { authFetch } from '@/lib/auth/client'
import { readJsonResponse } from '@/lib/fetch-json'

type FoundingRole = 'user' | 'psm'

type AdminEntry = {
  id: string
  position: number
  tier: string
  discountPercent: number
  displayName: string
  email: string
  status: string
  stripePromotionCode: string | null
  mnsLabel: string
  createdAt: string
}

type AdminPayload = {
  cap: number
  kpis: {
    signups: number
    capRemaining: number
    codeSent: number
    redeemed: number
  }
  entries: AdminEntry[]
}

export default function AdminFoundingPage() {
  const [role, setRole] = useState<FoundingRole>('user')
  const [data, setData] = useState<AdminPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setActionError(null)
    try {
      const response = await authFetch(`/api/admin/founding/waitlist?role=${role}`)
      const json = await readJsonResponse<AdminPayload & { error?: string }>(response)
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar.')
      setData(json)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    void load()
  }, [load])

  const runAction = async (id: string, path: string, body?: object) => {
    setActionError(null)
    const response = await authFetch(`/api/admin/founding/waitlist/${id}/${path}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await readJsonResponse<{ error?: string }>(response)
    if (!response.ok) {
      setActionError(json.error || 'Acción fallida')
      return
    }
    void load()
  }

  const removeEntry = async (id: string) => {
    if (!window.confirm('¿Hard delete con audit?')) return
    setActionError(null)
    const response = await authFetch(`/api/admin/founding/waitlist/${id}`, { method: 'DELETE' })
    const json = await readJsonResponse<{ error?: string }>(response)
    if (!response.ok) {
      setActionError(json.error || 'No se pudo borrar')
      return
    }
    void load()
  }

  return (
    <div className="space-y-6">
      <GradientText as="h1" className="text-2xl font-bold">
        Founding allowlist
      </GradientText>

      <div className="flex gap-2">
        <CTAButton
          type="button"
          size="sm"
          variant={role === 'user' ? 'primary' : 'secondary'}
          onClick={() => setRole('user')}
        >
          Usuarios
        </CTAButton>
        <CTAButton
          type="button"
          size="sm"
          variant={role === 'psm' ? 'primary' : 'secondary'}
          onClick={() => setRole('psm')}
        >
          PSM
        </CTAButton>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {actionError ? <p className="text-sm text-red-400">{actionError}</p> : null}

      {data ? (
        <>
          <GlassCard className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
            <div>Inscritos: {data.kpis.signups}</div>
            <div>Cap restante: {data.kpis.capRemaining}</div>
            <div>Códigos enviados: {data.kpis.codeSent}</div>
            <div>Redimidos: {data.kpis.redeemed}</div>
          </GlassCard>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-border bg-foreground/5">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Tier</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Código</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((row) => (
                  <tr key={row.id} className="border-b border-border/40">
                    <td className="p-2">{row.position}</td>
                    <td className="p-2">
                      {row.displayName}
                      <br />
                      <span className="text-muted-foreground">{row.mnsLabel}.motus</span>
                    </td>
                    <td className="p-2 font-mono">{row.email}</td>
                    <td className="p-2">
                      {row.tier} ({row.discountPercent}%)
                    </td>
                    <td className="p-2">{row.status}</td>
                    <td className="p-2 font-mono">{row.stripePromotionCode ?? '—'}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2 py-1 hover:bg-foreground/5"
                          onClick={() => void runAction(row.id, 'stripe-code')}
                        >
                          Stripe
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2 py-1 hover:bg-foreground/5"
                          onClick={() => void runAction(row.id, 'send-code')}
                        >
                          Email
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2 py-1 hover:bg-foreground/5"
                          onClick={() => void runAction(row.id, 'send-code', { skipEmail: true })}
                        >
                          Marcar enviado
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2 py-1 hover:bg-foreground/5"
                          onClick={() => void runAction(row.id, 'redeemed')}
                        >
                          Redimido
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-500/40 px-2 py-1 text-red-400 hover:bg-red-500/10"
                          onClick={() => void removeEntry(row.id)}
                        >
                          Borrar
                        </button>
                        {row.stripePromotionCode ? (
                          <button
                            type="button"
                            className="rounded-lg border border-border px-2 py-1"
                            onClick={() => void navigator.clipboard.writeText(row.stripePromotionCode!)}
                          >
                            Copiar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}