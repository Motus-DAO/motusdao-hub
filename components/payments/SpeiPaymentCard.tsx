'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Landmark, Loader } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { authFetch } from '@/lib/auth/client'
import { formatClabe } from '@/lib/spei'

type TransferView = {
  state: 'none' | 'reported' | 'confirmed' | 'rejected'
  amount: string | null
  currency: string
  reference: string | null
  reportedAt: string | null
  note: string | null
}

type SpeiAccount = {
  beneficiaryName: string
  bankName: string
  clabe: string
}

type PatientSession = {
  id: string
  counterpartName: string
  scheduledStart: string | null
  listedPrice: number | null
  listedCurrency: string
  account: SpeiAccount | null
  transfer: TransferView
}

type PsmSession = {
  id: string
  counterpartName: string
  scheduledStart: string | null
  listedPrice: number | null
  listedCurrency: string
  transfer: TransferView
}

type SpeiHome =
  | { role: 'psm'; profileMissing: boolean; account: SpeiAccount | null; sessions: PsmSession[] }
  | { role: 'usuario'; session: PatientSession | null }

const fieldClass =
  'w-full p-3 glass-card border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-mauve-500 focus:border-transparent'

function formatWhen(value: string | null): string {
  if (!value) return 'Sin horario'
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatMoney(amount: string | number, currency = 'MXN'): string {
  const numeric = typeof amount === 'number' ? amount : Number(amount)
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(numeric)
  } catch {
    return `${numeric.toFixed(2)} ${currency}`
  }
}

export function SpeiPaymentCard() {
  const [home, setHome] = useState<SpeiHome | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [bankName, setBankName] = useState('')
  const [clabe, setClabe] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await authFetch('/api/spei')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el pago')
      setHome(data)
      if (data.role === 'psm' && data.account) {
        setBeneficiaryName(data.account.beneficiaryName)
        setBankName(data.account.bankName)
        setClabe(data.account.clabe)
      }
      if (data.role === 'usuario' && data.session?.listedCurrency === 'MXN' && data.session.listedPrice) {
        setAmount(String(data.session.listedPrice))
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el pago')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveAccount() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await authFetch('/api/spei', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beneficiaryName, bankName, clabe }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar')
      setNotice('Cuenta guardada. Tu paciente la verá en su cita.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function postAction(sessionId: string, body: Record<string, string>) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await authFetch(`/api/spei/sessions/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar')
      setNotice(
        body.action === 'report'
          ? 'Aviso enviado. Tu profesional tiene que confirmar que le llegó.'
          : body.action === 'confirm'
            ? 'Confirmaste que recibiste la transferencia.'
            : 'Marcaste que esa transferencia no te llegó.'
      )
      setReference('')
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No se pudo registrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard className="p-8">
      <h3 className="text-2xl font-bold mb-2 flex items-center">
        <Landmark className="w-6 h-6 mr-3 text-mauve-500" />
        Pago de la sesión por SPEI
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        El dinero va directo a la cuenta del profesional. Motus no lo recibe: solo guarda el aviso del paciente y la confirmación de quien lo recibió.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-mauve-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {notice && <p className="text-sm text-green-400">{notice}</p>}

          {home?.role === 'psm' && (
            <PsmAccountForm
              profileMissing={home.profileMissing}
              beneficiaryName={beneficiaryName}
              bankName={bankName}
              clabe={clabe}
              saving={saving}
              onBeneficiaryName={setBeneficiaryName}
              onBankName={setBankName}
              onClabe={setClabe}
              onSave={() => void saveAccount()}
            />
          )}

          {home?.role === 'psm' && (
            <PsmSessionList
              sessions={home.sessions}
              saving={saving}
              onConfirm={(sessionId) => void postAction(sessionId, { action: 'confirm' })}
              onReject={(sessionId) => void postAction(sessionId, { action: 'reject' })}
            />
          )}

          {home?.role === 'usuario' && (
            <PatientTransfer
              session={home.session}
              amount={amount}
              reference={reference}
              saving={saving}
              copied={copied}
              onAmount={setAmount}
              onReference={setReference}
              onCopy={(value) => {
                void navigator.clipboard?.writeText(value).then(() => {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 2000)
                })
              }}
              onReport={(sessionId) => void postAction(sessionId, { action: 'report', amount, reference })}
            />
          )}
        </div>
      )}
    </GlassCard>
  )
}

function PsmAccountForm(props: {
  profileMissing: boolean
  beneficiaryName: string
  bankName: string
  clabe: string
  saving: boolean
  onBeneficiaryName: (value: string) => void
  onBankName: (value: string) => void
  onClabe: (value: string) => void
  onSave: () => void
}) {
  if (props.profileMissing) {
    return <p className="text-sm text-muted-foreground">Completa tu perfil profesional para registrar la CLABE.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Esta cuenta se muestra solo a un paciente con cita agendada.
      </p>
      <label className="block text-sm font-medium">
        Titular
        <input className={`${fieldClass} mt-1`} value={props.beneficiaryName} onChange={(event) => props.onBeneficiaryName(event.target.value)} />
      </label>
      <label className="block text-sm font-medium">
        Banco
        <input className={`${fieldClass} mt-1`} value={props.bankName} onChange={(event) => props.onBankName(event.target.value)} />
      </label>
      <label className="block text-sm font-medium">
        CLABE
        <input
          className={`${fieldClass} mt-1 font-mono`}
          inputMode="numeric"
          autoComplete="off"
          value={props.clabe}
          onChange={(event) => props.onClabe(event.target.value)}
        />
      </label>
      <CTAButton type="button" size="sm" onClick={props.onSave} disabled={props.saving}>
        {props.saving ? 'Guardando...' : 'Guardar cuenta'}
      </CTAButton>
    </div>
  )
}

function PsmSessionList(props: {
  sessions: PsmSession[]
  saving: boolean
  onConfirm: (sessionId: string) => void
  onReject: (sessionId: string) => void
}) {
  if (props.sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">Cuando un paciente avise una transferencia, aparece aquí.</p>
  }

  return (
    <div className="space-y-3">
      {props.sessions.map((session) => (
        <div key={session.id} className="rounded-lg border border-white/10 p-4 space-y-2">
          <p className="font-medium">{session.counterpartName}</p>
          <p className="text-xs text-muted-foreground">{formatWhen(session.scheduledStart)}</p>
          <TransferStatus transfer={session.transfer} />
          {session.transfer.state === 'reported' && (
            <div className="flex flex-wrap gap-2 pt-2">
              <CTAButton type="button" size="sm" disabled={props.saving} onClick={() => props.onConfirm(session.id)}>
                Sí, ya la recibí
              </CTAButton>
              <CTAButton type="button" size="sm" variant="secondary" disabled={props.saving} onClick={() => props.onReject(session.id)}>
                No me llegó
              </CTAButton>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PatientTransfer(props: {
  session: PatientSession | null
  amount: string
  reference: string
  saving: boolean
  copied: boolean
  onAmount: (value: string) => void
  onReference: (value: string) => void
  onCopy: (value: string) => void
  onReport: (sessionId: string) => void
}) {
  if (!props.session) {
    return (
      <p className="text-sm text-muted-foreground">
        La cuenta de tu profesional aparece aquí cuando tienes una cita agendada.
      </p>
    )
  }

  const { account, transfer } = props.session
  const canReport = Boolean(account) && (transfer.state === 'none' || transfer.state === 'rejected')

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Cita con {props.session.counterpartName}
        <span className="text-muted-foreground"> · {formatWhen(props.session.scheduledStart)}</span>
      </p>
      {props.session.listedPrice != null && (
        <p className="text-xs text-muted-foreground">
          Honorario en el perfil: {formatMoney(props.session.listedPrice, props.session.listedCurrency)}
        </p>
      )}
      {!account ? (
        <p className="text-sm text-muted-foreground">
          Tu profesional todavía no registra su CLABE.
        </p>
      ) : (
        <div className="rounded-lg border border-white/10 p-4 space-y-2">
          <p className="text-sm">{account.beneficiaryName}</p>
          <p className="text-xs text-muted-foreground">{account.bankName}</p>
          <p className="font-mono text-sm">{formatClabe(account.clabe)}</p>
          <button type="button" className="inline-flex items-center text-xs text-mauve-400" onClick={() => props.onCopy(account.clabe)}>
            <Copy className="w-3.5 h-3.5 mr-1" />
            {props.copied ? 'CLABE copiada' : 'Copiar CLABE'}
          </button>
        </div>
      )}
      <TransferStatus transfer={transfer} />
      {canReport && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            Monto transferido (MXN)
            <input className={`${fieldClass} mt-1`} inputMode="decimal" value={props.amount} onChange={(event) => props.onAmount(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Clave de rastreo
            <input className={`${fieldClass} mt-1 font-mono`} value={props.reference} onChange={(event) => props.onReference(event.target.value)} />
          </label>
          <CTAButton type="button" size="sm" disabled={props.saving} onClick={() => props.onReport(props.session!.id)}>
            {props.saving ? 'Enviando...' : 'Ya transferí'}
          </CTAButton>
        </div>
      )}
    </div>
  )
}

function TransferStatus({ transfer }: { transfer: TransferView }) {
  if (transfer.state === 'none') return null
  if (transfer.state === 'reported') {
    return (
      <p className="text-sm text-amber-300">
        Aviso enviado: {transfer.amount ? formatMoney(transfer.amount) : 'monto'} · clave {transfer.reference}. Falta la confirmación.
      </p>
    )
  }
  if (transfer.state === 'confirmed') {
    return (
      <p className="text-sm text-green-400">
        Pago confirmado: {transfer.amount ? formatMoney(transfer.amount) : 'monto'} · clave {transfer.reference}.
      </p>
    )
  }
  return (
    <p className="text-sm text-red-300">
      El profesional no identificó esa transferencia{transfer.note ? `: ${transfer.note}` : ''}. Puedes registrar otra.
    </p>
  )
}
