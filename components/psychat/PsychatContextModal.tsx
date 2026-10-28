'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Copy, Check, CheckCircle2, XCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CTAButton } from '@/components/ui/CTAButton'
import { GradientText } from '@/components/ui/GradientText'
import { cn } from '@/lib/utils'
import {
  psychatContextModeLabels,
  psychatContextModeShort,
  type PsychatContextMode,
} from '@/lib/psychat-context/constants'
import {
  defaultPsychatContextSettings,
  readPsychatContextSettings,
  writePsychatContextSettings,
  type PsychatContextSettings,
} from '@/lib/psychat-context/settings'
import { checkRootRouterProxyHealth } from '@/lib/psychat-context/proxy-health'
import { authFetch } from '@/lib/auth/client'
import { rootRouterProxyStartScript } from '@/lib/psychat-context/rootrouter-cli-copy'
import { alternatePsychatProxyUrl } from '@/lib/psychat-context/proxy-port'

type Capabilities = {
  sessionEnclaveEnabled?: boolean
  sessionEnclaveUrl?: string
  alwaysOnEnclaveEnabled?: boolean
  defaultLocalProxyUrl?: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved: (settings: PsychatContextSettings) => void
}

export function PsychatContextModal({ open, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<PsychatContextSettings>(() => defaultPsychatContextSettings())
  const [caps, setCaps] = useState<Capabilities>({})
  const [proxyOk, setProxyOk] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [bridgeSnippet, setBridgeSnippet] = useState<string | null>(null)
  const [bridgePanel, setBridgePanel] = useState<'ok' | 'auth' | 'error' | null>(null)
  const [proxyStartScript, setProxyStartScript] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(readPsychatContextSettings())
    void fetch('/api/psychat/context-capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Capabilities | null) => setCaps(d ?? {}))
      .catch(() => undefined)
  }, [open])

  useEffect(() => {
    if (!open) return
    setProxyStartScript(
      rootRouterProxyStartScript(window.location.origin, draft.localProxyUrl)
    )
  }, [open, draft.localProxyUrl])

  const testProxy = useCallback(async () => {
    setChecking(true)
    setProxyOk(null)
    try {
      const url =
        draft.mode === 'session_enclave' && draft.sessionEnclaveUrl.trim()
          ? draft.sessionEnclaveUrl
          : draft.localProxyUrl
      const ok = await checkRootRouterProxyHealth(url)
      setProxyOk(ok)
    } finally {
      setChecking(false)
    }
  }, [draft])

  const loadBridgeSnippet = async () => {
    setBridgeSnippet(null)
    setBridgePanel(null)
    const res = await authFetch('/api/psychat/proxy-bridge', { method: 'POST' })
    const data = (await res.json().catch(() => ({}))) as {
      upstreamOrigin?: string
      error?: string
    }
    if (res.status === 401) {
      setBridgePanel('auth')
      return
    }
    if (!res.ok) {
      setBridgePanel('error')
      setBridgeSnippet(data.error || 'No se pudo leer la URL del Hub.')
      return
    }
    setBridgePanel('ok')
    setBridgeSnippet(
      `URL del Hub (upstream del proxy):\n${data.upstreamOrigin ?? window.location.origin}\n\nEl proxy reenvía ahí cada mensaje. Psychat pone el token del Hub automáticamente — no lo copies a la terminal; solo ROOTROUTER_UPSTREAM_ORIGIN en el script.`
    )
  }

  const copyProxyScript = async () => {
    if (!proxyStartScript) return
    await navigator.clipboard.writeText(proxyStartScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const save = () => {
    writePsychatContextSettings(draft)
    onSaved(draft)
    onClose()
  }

  const copySnippet = async () => {
    if (!bridgeSnippet) return
    await navigator.clipboard.writeText(bridgeSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) return null

  const modes: PsychatContextMode[] = [
    'hub_default',
    'local_rootrouter',
    ...(caps.sessionEnclaveEnabled ? (['session_enclave'] as const) : []),
    ...(caps.alwaysOnEnclaveEnabled ? (['always_on_enclave'] as const) : []),
  ]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 hover:bg-white/10"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <GradientText as="h2" className="text-xl font-semibold pr-8">
          Memoria de contexto (Psychat)
        </GradientText>
        <p className="mt-2 text-sm text-muted-foreground">
          <strong className="text-foreground">Estándar (Hub)</strong> para la mayoría.{' '}
          <strong className="text-foreground">Memoria local</strong>: Psychat en el navegador + un comando en tu
          terminal; el contexto largo vive en tu PC (<code className="text-xs">store.json</code>).
        </p>

        <fieldset className="mt-4 space-y-3">
          {modes.map((mode) => (
            <label
              key={mode}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm',
                draft.mode === mode ? 'border-mauve-400/40 bg-white/[0.04]' : 'border-white/10'
              )}
            >
              <input
                type="radio"
                name="context-mode"
                className="mt-1"
                checked={draft.mode === mode}
                onChange={() => setDraft((d) => ({ ...d, mode }))}
              />
              <span>
                <span className="font-medium text-foreground">{psychatContextModeLabels[mode]}</span>
                <span className="mt-1 block text-muted-foreground">{psychatContextModeShort[mode]}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {draft.mode === 'local_rootrouter' ? (
          <div className="mt-4 space-y-3 text-sm">
            <label className="block">
              <span className="text-muted-foreground">URL del proxy RootRouter</span>
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                value={draft.localProxyUrl}
                onChange={(e) => {
                  const localProxyUrl = e.target.value
                  setDraft((d) => ({ ...d, localProxyUrl }))
                  setProxyOk(null)
                }}
                placeholder="http://127.0.0.1:8787"
              />
            </label>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>En una terminal, arranca el proxy (comando abajo).</li>
              <li>Comprueba con «Probar conexión».</li>
              <li>Guarda y chatea en Psychat con privacidad estándar (TEE).</li>
            </ol>
            {proxyStartScript ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-2">
                <p className="text-[11px] text-muted-foreground">
                  Pega en terminal y déjalo corriendo. Node 20+. El puerto debe coincidir con la URL de arriba. Si ves{' '}
                  <code className="text-xs">EADDRINUSE</code> en 8787, usa el botón de puerto alternativo abajo.
                </p>
                <pre className="mt-2 whitespace-pre-wrap text-[11px] text-muted-foreground">{proxyStartScript}</pre>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs underline"
                  onClick={() => void copyProxyScript()}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copiar comando del proxy
                </button>
              </div>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              Desde motusdao-hub también puedes usar{' '}
              <code className="text-xs">HUB_ORIGIN=… ./scripts/psychat-rootrouter-proxy.example.sh</code>
            </p>
            <div className="flex flex-wrap gap-2">
              <CTAButton variant="secondary" size="sm" onClick={() => void testProxy()} disabled={checking}>
                {checking ? 'Comprobando…' : 'Probar conexión'}
              </CTAButton>
              <CTAButton variant="secondary" size="sm" onClick={() => void loadBridgeSnippet()}>
                URL del Hub para el proxy
              </CTAButton>
            </div>
            {proxyOk === true ? (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  <strong className="text-emerald-100">Conexión OK.</strong> El proxy responde en{' '}
                  <code className="text-[11px]">{draft.localProxyUrl.replace(/\/$/, '')}</code>
                </span>
              </div>
            ) : null}
            {proxyOk === false ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>
                    <strong className="text-red-100">Sin conexión.</strong> ¿Proxy encendido y misma URL/puerto que en
                    la terminal?
                  </span>
                </div>
                <button
                  type="button"
                  className="underline text-mauve-300"
                  onClick={() => {
                    const next = alternatePsychatProxyUrl(draft.localProxyUrl)
                    setDraft((d) => ({ ...d, localProxyUrl: next }))
                    setProxyOk(null)
                  }}
                >
                  Puerto ocupado — probar 8790 (o volver a 8787)
                </button>
              </div>
            ) : null}
            {bridgePanel === 'auth' ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <span>
                  <strong>Falta sesión del Hub.</strong> Cierra este modal, firma el mensaje SIWE en Psychat (recuadro
                  amarillo) y vuelve a pulsar «URL del Hub para el proxy». No es un error del proxy local.
                </span>
              </div>
            ) : null}
            {bridgePanel === 'ok' && bridgeSnippet ? (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2">
                <pre className="whitespace-pre-wrap text-[11px] text-emerald-100/90">{bridgeSnippet}</pre>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs underline text-emerald-200"
                  onClick={() => void copySnippet()}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copiar URL
                </button>
              </div>
            ) : null}
            {bridgePanel === 'error' && bridgeSnippet ? (
              <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-2">
                <pre className="whitespace-pre-wrap text-[11px] text-red-200">{bridgeSnippet}</pre>
              </div>
            ) : null}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.acknowledgedLocalSetup}
                onChange={(e) => setDraft((d) => ({ ...d, acknowledgedLocalSetup: e.target.checked }))}
              />
              <span>Entiendo que store.json queda en mi equipo en texto claro para el proxy.</span>
            </label>
          </div>
        ) : null}

        {draft.mode === 'session_enclave' ? (
          <div className="mt-4 text-sm text-muted-foreground space-y-2">
            <p>
              URL del enclave:{' '}
              <code className="text-xs">{caps.sessionEnclaveUrl || draft.sessionEnclaveUrl || '—'}</code>
            </p>
            <p className="text-xs">Requiere attestation del build RootRouter publicado antes de enviar (fase 2).</p>
          </div>
        ) : null}

        <a
          href="/psychat/memoria-contexto"
          className="mt-4 inline-flex items-center gap-1 text-xs text-mauve-400 underline"
        >
          Guía paso a paso (simple)
        </a>

        <div className="mt-6 flex justify-end gap-2">
          <CTAButton variant="secondary" onClick={onClose}>
            Cancelar
          </CTAButton>
          <CTAButton
            onClick={save}
            disabled={
              draft.mode === 'local_rootrouter' &&
              !draft.acknowledgedLocalSetup
            }
          >
            Guardar
          </CTAButton>
        </div>
      </GlassCard>
    </div>
  )
}
