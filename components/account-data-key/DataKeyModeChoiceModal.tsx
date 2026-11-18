'use client'

import { DATA_KEY_MODE_COPY, type DataKeyMode } from '@/lib/account-data-key/constants'
import { CTAButton } from '@/components/ui/CTAButton'

type Props = {
  open: boolean
  onChoose: (mode: DataKeyMode) => void
  onDismiss?: () => void
  busy?: boolean
}

export function DataKeyModeChoiceModal({ open, onChoose, onDismiss, busy }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-labelledby="data-key-mode-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-xl"
      >
        <h2 id="data-key-mode-title" className="text-lg font-semibold text-foreground">
          ¿Cómo quieres cifrar tu bitácora y archivo Psychat?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Es la misma preferencia para ambos: desbloqueas una vez y aplica a los dos.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(['account', 'wallet'] as const).map((mode) => {
            const meta = DATA_KEY_MODE_COPY[mode]
            const isWallet = mode === 'wallet'
            return (
              <button
                key={mode}
                type="button"
                disabled={busy}
                onClick={() => onChoose(mode)}
                className={
                  'rounded-xl border p-4 text-left transition hover:border-mauve-400/50 ' +
                  (isWallet
                    ? 'border-amber-400/40 bg-amber-500/5'
                    : 'border-emerald-400/35 bg-emerald-500/5')
                }
              >
                <p className="text-sm font-medium text-foreground">{meta.title}</p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{meta.body}</p>
              </button>
            )
          })}
        </div>

        {onDismiss ? (
          <DismissFooter busy={busy} onDismiss={onDismiss} />
        ) : null}
      </div>
    </div>
  )
}

function DismissFooter({ busy, onDismiss }: { busy?: boolean; onDismiss: () => void }) {
  return (
    <div className="mt-4 flex justify-end">
      <CTAButton type="button" variant="ghost" size="sm" disabled={busy} onClick={onDismiss}>
        Ahora no
      </CTAButton>
    </div>
  )
}