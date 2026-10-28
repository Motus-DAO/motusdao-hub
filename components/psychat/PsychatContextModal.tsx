'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
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
  const [proxyStartScript, setProxyStartScript] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(readPsychatContextSettings())
    setProxyStartScript(rootRouterProxyStartScript(window.location.origin))
    void fetch('/api/psychat/context-capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Capabilities | null) => setCaps(d ?? {}))
      .catch(() => undefined)
  }, [open])

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
    const res = await authFetch('/api/psychat/proxy-bridge', { method: 'POST' })
    const data = (await res.json().catch(() => ({}))) as {
      upstreamOrigin?: string
      error?: string
    }
    if (!res.ok) {
      setBridgeSnippet(data.error || 'Inicia sesión en el Hub.')
      return
    }
    setBridgeSnippet(
      `# Solo necesitas esto en el proxy (ver script abajo):\nROOTROUTER_UPSTREAM_ORIGIN=${data.upstreamOrigin ?? window.location.origin}\n\nPsychat envía el token del Hub en cada mensaje; no lo pegues en RootRouter.`
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
                onChange={(e) => setDraft((d) => ({ ...d, localProxyUrl: e.target.value }))}
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
                  Pega en terminal y déjalo corriendo. Node 20+. La URL del Hub se ajusta sola según dónde abriste
                  Psychat. Comprueba con «Probar conexión».
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
                Ver upstream del Hub
              </CTAButton>
            </div>
            {proxyOk === true ? (
              <p className="text-emerald-400 text-xs">Proxy accesible desde este navegador.</p>
            ) : null}
            {proxyOk === false ? (
              <p className="text-amber-300 text-xs">
                No hubo respuesta. ¿Está corriendo el proxy? Revisa CORS y que uses 127.0.0.1, no localhost remoto.
              </p>
            ) : null}
            {bridgeSnippet ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-2">
                <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground">{bridgeSnippet}</pre>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs underline"
                  onClick={() => void copySnippet()}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copiar
                </button>
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
