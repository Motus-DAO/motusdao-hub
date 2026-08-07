'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader,
  X,
} from 'lucide-react'
import { CTAButton } from '@/components/ui/CTAButton'
import type { RipioRampFlow } from '@/lib/ripio/ramps-widget'
import {
  MOCK_RIPIO,
  buildMockRedirectParams,
  computeMockQuote,
  readRipioMockSession,
  writeRipioMockSession,
  type RipioMockSession,
} from '@/lib/ripio/ramps-mock-session'

type OrderStatus = 'idle' | 'PENDING' | 'PROCESSING' | 'COMPLETED'

type OnrampStep =
  | 'intro'
  | 'terms'
  | 'kyc'
  | 'deposit_account'
  | 'quote'
  | 'payment'
  | 'order_status'
  | 'success'

type OfframpStep =
  | 'intro'
  | 'terms'
  | 'kyc'
  | 'fiat_account'
  | 'session'
  | 'amount'
  | 'send_crypto'
  | 'order_status'
  | 'success'

type RipioRampsMockPanelProps = {
  flow: RipioRampFlow
  address: string
  onClose: () => void
}

const ONRAMP_LABELS: Record<OnrampStep, string> = {
  intro: 'Inicio',
  terms: 'Términos',
  kyc: 'KYC',
  deposit_account: 'Cuenta depósito',
  quote: 'Cotización',
  payment: 'Pago SPEI',
  order_status: 'Estado',
  success: 'Listo',
}

const OFFRAMP_LABELS: Record<OfframpStep, string> = {
  intro: 'Inicio',
  terms: 'Términos',
  kyc: 'KYC',
  fiat_account: 'Cuenta banco',
  session: 'Sesión',
  amount: 'Monto',
  send_crypto: 'Enviar cripto',
  order_status: 'Estado',
  success: 'Listo',
}

export function RipioRampsMockPanel({
  flow,
  address,
  onClose,
}: RipioRampsMockPanelProps) {
  const isOnramp = flow === 'onramp'
  const walletKey = address.toLowerCase()

  const [session, setSession] = useState<RipioMockSession>(() =>
    readRipioMockSession(walletKey)
  )
  const [onStep, setOnStep] = useState<OnrampStep>('intro')
  const [offStep, setOffStep] = useState<OfframpStep>('intro')

  const [termsChecked, setTermsChecked] = useState(false)
  const [kycName, setKycName] = useState('')
  const [kycId, setKycId] = useState('')
  const [payoutClabe, setPayoutClabe] = useState('')
  const [fiatAccountStatus, setFiatAccountStatus] = useState<
    'idle' | 'processing' | 'enabled'
  >('idle')

  const [fiatAmount, setFiatAmount] = useState('500')
  const [cryptoAmount, setCryptoAmount] = useState('25')
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number>(
    MOCK_RIPIO.quoteTtlSeconds
  )
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle')
  const [redirectQuery, setRedirectQuery] = useState('')

  const quote = useMemo(() => {
    const n = parseFloat(fiatAmount)
    if (!Number.isFinite(n) || n <= 0) return null
    return computeMockQuote(n)
  }, [fiatAmount])

  const resolvedCryptoOff = useMemo(() => {
    const n = parseFloat(cryptoAmount)
    if (!Number.isFinite(n) || n <= 0) return null
    const fiat = n * MOCK_RIPIO.mxnToUsdcRate
    const fee = fiat * (MOCK_RIPIO.feePercent / 100)
    return { crypto: n, fiat: Math.round(fiat), fee: Math.round(fee) }
  }, [cryptoAmount])

  const getFirstIncompleteStep = useCallback(
    (s: RipioMockSession): OnrampStep | OfframpStep => {
      if (!s.termsAccepted) return 'intro'
      if (!s.kycCompleted) return 'kyc'
      return isOnramp ? 'deposit_account' : 'fiat_account'
    },
    [isOnramp]
  )

  useEffect(() => {
    const stored = readRipioMockSession(walletKey)
    setSession(stored)
    setKycName(stored.kycName)
    setPayoutClabe(stored.payoutClabe || MOCK_RIPIO.mockClabe)
    setTermsChecked(stored.termsAccepted)
    const first = getFirstIncompleteStep(stored)
    if (isOnramp) setOnStep(first as OnrampStep)
    else setOffStep(first as OfframpStep)
    setOrderStatus('idle')
    setRedirectQuery('')
    setFiatAccountStatus(stored.payoutClabe ? 'enabled' : 'idle')
  }, [flow, address, walletKey, isOnramp, getFirstIncompleteStep])

  useEffect(() => {
    if (onStep !== 'quote' || !isOnramp) return
    setQuoteSecondsLeft(MOCK_RIPIO.quoteTtlSeconds)
    const id = setInterval(() => {
      setQuoteSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [onStep, isOnramp])

  const persistSession = useCallback(
    (patch: Partial<RipioMockSession>) => {
      const next = writeRipioMockSession(walletKey, patch)
      setSession(next)
      return next
    },
    [walletKey]
  )

  const runOrderSimulation = useCallback(async () => {
    setOrderStatus('PENDING')
    await wait(700)
    setOrderStatus('PROCESSING')
    await wait(900)
    setOrderStatus('COMPLETED')
  }, [])

  const goSuccess = useCallback(
    (action: 'onramp' | 'offramp', fiat: number, crypto: number) => {
      setRedirectQuery(
        buildMockRedirectParams({
          action,
          address,
          fiatAmount: fiat,
          cryptoAmount: crypto,
          sessionId: 'motus-mock-session',
        })
      )
      if (isOnramp) setOnStep('success')
      else setOffStep('success')
    },
    [address, isOnramp]
  )

  const step = isOnramp ? onStep : offStep
  const stepLabels = isOnramp ? ONRAMP_LABELS : OFFRAMP_LABELS
  const stepKeys = Object.keys(stepLabels)
  const stepIndex = stepKeys.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ripio-mock-title"
        className="glass-card-strong max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/12 p-6"
      >
        <MockHeader
          title={
            isOnramp ? 'On-ramp Ripio (mock)' : 'Off-ramp Ripio (mock)'
          }
          onClose={onClose}
        />

        <Stepper
          labels={Object.values(stepLabels)}
          currentIndex={stepIndex}
        />

        {isOnramp ? (
          <OnrampBody
            step={onStep}
            address={address}
            session={session}
            termsChecked={termsChecked}
            kycName={kycName}
            kycId={kycId}
            fiatAmount={fiatAmount}
            quote={quote}
            quoteSecondsLeft={quoteSecondsLeft}
            orderStatus={orderStatus}
            redirectQuery={redirectQuery}
            onTermsChecked={setTermsChecked}
            onKycName={setKycName}
            onKycId={setKycId}
            onFiatAmount={setFiatAmount}
            onAcceptTerms={() => {
              persistSession({ termsAccepted: true })
              setOnStep('kyc')
            }}
            onCompleteKyc={() => {
              if (!kycName.trim()) return
              persistSession({
                kycCompleted: true,
                kycName: kycName.trim(),
              })
              setOnStep('deposit_account')
            }}
            onDepositReady={() => setOnStep('quote')}
            onQuoteContinue={() => setOnStep('payment')}
            onSimulatePayment={async () => {
              setOnStep('order_status')
              await runOrderSimulation()
              if (quote) goSuccess('onramp', quote.fiatAmount, quote.cryptoAmount)
            }}
            onIntroNext={() =>
              setOnStep(session.termsAccepted ? 'kyc' : 'terms')
            }
            onBack={() => setOnStep(prevOnrampStep(onStep))}
            onClose={onClose}
          />
        ) : (
          <OfframpBody
            step={offStep}
            address={address}
            session={session}
            termsChecked={termsChecked}
            kycName={kycName}
            kycId={kycId}
            payoutClabe={payoutClabe}
            fiatAccountStatus={fiatAccountStatus}
            cryptoAmount={cryptoAmount}
            resolved={resolvedCryptoOff}
            orderStatus={orderStatus}
            redirectQuery={redirectQuery}
            onTermsChecked={setTermsChecked}
            onKycName={setKycName}
            onKycId={setKycId}
            onPayoutClabe={setPayoutClabe}
            onCryptoAmount={setCryptoAmount}
            onAcceptTerms={() => {
              persistSession({ termsAccepted: true })
              setOffStep('kyc')
            }}
            onCompleteKyc={() => {
              if (!kycName.trim()) return
              persistSession({
                kycCompleted: true,
                kycName: kycName.trim(),
              })
              setOffStep('fiat_account')
            }}
            onRegisterFiatAccount={async () => {
              setFiatAccountStatus('processing')
              await wait(600)
              setFiatAccountStatus('enabled')
              persistSession({ payoutClabe: payoutClabe.trim() })
            }}
            onKycContinue={() => setOffStep('fiat_account')}
            onFiatAccountContinue={() => setOffStep('session')}
            onSessionContinue={() => setOffStep('amount')}
            onAmountContinue={() => setOffStep('send_crypto')}
            onSimulateSend={async () => {
              setOffStep('order_status')
              await runOrderSimulation()
              if (resolvedCryptoOff) {
                goSuccess(
                  'offramp',
                  resolvedCryptoOff.fiat,
                  resolvedCryptoOff.crypto
                )
              }
            }}
            onIntroNext={() =>
              setOffStep(session.termsAccepted ? 'kyc' : 'terms')
            }
            onBack={() => setOffStep(prevOfframpStep(offStep))}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

function MockHeader({
  title,
  onClose,
}: {
  title: string
  onClose: () => void
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-yellow-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Mock / Demo
        </p>
        <h3 id="ripio-mock-title" className="text-lg font-semibold">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Simula el Widget Ripio Ramps (MXN · Celo · USDC). Sin llaves partner
          no hay dinero real.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

function Stepper({
  labels,
  currentIndex,
}: {
  labels: string[]
  currentIndex: number
}) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto pb-1 text-[10px]">
      {labels.map((label, i) => (
        <span
          key={label}
          className={`shrink-0 rounded-full px-2 py-0.5 ${
            i === currentIndex
              ? 'bg-mauve-500/20 text-mauve-300'
              : i < currentIndex
                ? 'bg-green-500/10 text-green-400'
                : 'bg-white/5 text-muted-foreground'
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function ContextBlock({ address }: { address: string }) {
  return (
    <div className="mb-4 space-y-1 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
      <p>
        <span className="text-muted-foreground">País: </span>
        México ({MOCK_RIPIO.fiatCurrency})
      </p>
      <p>
        <span className="text-muted-foreground">Red / token: </span>
        {MOCK_RIPIO.network} · {MOCK_RIPIO.token}
      </p>
      <p>
        <span className="text-muted-foreground">Wallet: </span>
        <span className="break-all font-mono">{address}</span>
      </p>
    </div>
  )
}

type OnrampBodyProps = {
  step: OnrampStep
  address: string
  session: RipioMockSession
  termsChecked: boolean
  kycName: string
  kycId: string
  fiatAmount: string
  quote: ReturnType<typeof computeMockQuote> | null
  quoteSecondsLeft: number
  orderStatus: OrderStatus
  redirectQuery: string
  onTermsChecked: (v: boolean) => void
  onKycName: (v: string) => void
  onKycId: (v: string) => void
  onFiatAmount: (v: string) => void
  onAcceptTerms: () => void
  onCompleteKyc: () => void
  onDepositReady: () => void
  onQuoteContinue: () => void
  onSimulatePayment: () => void
  onIntroNext: () => void
  onBack: () => void
  onClose: () => void
}

function OnrampBody(props: OnrampBodyProps) {
  const { step, address, session, quote, orderStatus, redirectQuery } = props

  if (step === 'intro') {
    return (
      <>
        <ContextBlock address={address} />
        <p className="mb-4 text-sm text-muted-foreground">
          Flujo demo: orden única con cotización bloqueada → instrucciones SPEI →
          cripto a tu wallet en Celo.
        </p>
        {session.kycCompleted && (
          <p className="mb-3 text-xs text-green-400">
            KYC ya completado en esta sesión — se omitirán pasos repetidos.
          </p>
        )}
        <NavRow primaryLabel="Continuar" onPrimary={props.onIntroNext} />
      </>
    )
  }

  if (step === 'terms') {
    return (
      <>
        <p className="mb-3 text-sm">
          Acepta los Términos y Condiciones de Ripio para operar (mock).
        </p>
        <label className="mb-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={props.termsChecked}
            onChange={(e) => props.onTermsChecked(e.target.checked)}
            className="mt-1"
          />
          <span>
            Acepto los Términos y Condiciones de Ripio para compra de cripto
            con fiat en México.
          </span>
        </label>
        <NavRow
          primaryLabel="Aceptar y continuar"
          onPrimary={props.onAcceptTerms}
          onBack={props.onBack}
          primaryDisabled={!props.termsChecked}
        />
      </>
    )
  }

  if (step === 'kyc') {
    return (
      <>
        {session.kycCompleted ? (
          <p className="mb-3 text-sm text-green-400">
            KYC completado como {session.kycName}.
          </p>
        ) : (
          <>
            <Field
              label="Nombre completo"
              value={props.kycName}
              onChange={props.onKycName}
            />
            <Field
              label="CURP / identificación (demo)"
              value={props.kycId}
              onChange={props.onKycId}
              placeholder="XXXX000000XXXXXX00"
            />
          </>
        )}
        <NavRow
          primaryLabel={
            session.kycCompleted ? 'Continuar' : 'Enviar KYC (mock)'
          }
          onPrimary={
            session.kycCompleted
              ? props.onDepositReady
              : props.onCompleteKyc
          }
          onBack={props.onBack}
          primaryDisabled={!session.kycCompleted && !props.kycName.trim()}
        />
      </>
    )
  }

  if (step === 'deposit_account') {
    return (
      <>
        <p className="mb-3 text-sm text-muted-foreground">
          Cuenta CLABE de depósito habilitada para SPEI (simulado).
        </p>
        <dl className="mb-4 space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-mono">
          <Row label="CLABE" value={MOCK_RIPIO.mockDepositClabe} />
          <Row label="Estado" value="enabled" />
          <Row label="Método" value="bank_transfer (SPEI)" />
        </dl>
        <NavRow
          primaryLabel="Continuar a cotización"
          onPrimary={props.onDepositReady}
          onBack={props.onBack}
        />
      </>
    )
  }

  if (step === 'quote') {
    return (
      <>
        <Field
          label="Monto fiat (MXN)"
          value={props.fiatAmount}
          onChange={props.onFiatAmount}
          type="number"
        />
        {quote && (
          <div className="mb-4 rounded-xl border border-mauve-500/30 bg-mauve-500/5 p-3 text-sm">
            <p className="font-medium mb-2">Cotización bloqueada (mock)</p>
            <dl className="space-y-1 text-xs">
              <Row
                label="Recibes"
                value={`${quote.cryptoAmount} ${MOCK_RIPIO.token}`}
              />
              <Row label="Tipo de cambio" value={`1 USDC = ${quote.rate} MXN`} />
              <Row label="Comisión (~1%)" value={`${quote.fee.toFixed(2)} MXN`} />
              <Row
                label="Expira en"
                value={`${props.quoteSecondsLeft}s`}
              />
            </dl>
          </div>
        )}
        <NavRow
          primaryLabel="Confirmar cotización"
          onPrimary={props.onQuoteContinue}
          onBack={props.onBack}
          primaryDisabled={!quote || props.quoteSecondsLeft === 0}
        />
      </>
    )
  }

  if (step === 'payment') {
    return (
      <>
        <p className="mb-2 text-sm font-medium">Instrucciones de pago SPEI</p>
        <p className="mb-3 text-xs text-muted-foreground">
          En producción Ripio devuelve estas instrucciones tras crear la orden.
        </p>
        <dl className="mb-4 space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-mono">
          <Row label="CLABE" value={MOCK_RIPIO.mockDepositClabe} />
          <Row label="Beneficiario" value="Ripio Mock MX" />
          <Row label="Concepto" value="MOTUS-ONRAMP-DEMO" />
          <Row label="Monto" value={`${props.fiatAmount} MXN`} />
        </dl>
        <NavRow
          primaryLabel="Simular depósito SPEI"
          onPrimary={() => void props.onSimulatePayment()}
          onBack={props.onBack}
        />
      </>
    )
  }

  if (step === 'order_status') {
    return (
      <>
        <p className="mb-3 text-sm">Estado de la orden on-ramp</p>
        <StatusSteps status={orderStatus} />
        {orderStatus === 'COMPLETED' && (
          <p className="mt-3 text-xs text-green-400">
            Cripto enviada a {address.slice(0, 10)}…
          </p>
        )}
      </>
    )
  }

  if (step === 'success') {
    return (
      <SuccessScreen
        action="onramp"
        redirectQuery={redirectQuery}
        onClose={props.onClose}
      />
    )
  }

  return null
}

type OfframpBodyProps = {
  step: OfframpStep
  address: string
  session: RipioMockSession
  termsChecked: boolean
  kycName: string
  kycId: string
  payoutClabe: string
  fiatAccountStatus: 'idle' | 'processing' | 'enabled'
  cryptoAmount: string
  resolved: { crypto: number; fiat: number; fee: number } | null
  orderStatus: OrderStatus
  redirectQuery: string
  onTermsChecked: (v: boolean) => void
  onKycName: (v: string) => void
  onKycId: (v: string) => void
  onPayoutClabe: (v: string) => void
  onCryptoAmount: (v: string) => void
  onAcceptTerms: () => void
  onCompleteKyc: () => void
  onRegisterFiatAccount: () => void
  onFiatAccountContinue: () => void
  onKycContinue: () => void
  onSessionContinue: () => void
  onAmountContinue: () => void
  onSimulateSend: () => void
  onIntroNext: () => void
  onBack: () => void
  onClose: () => void
}

function OfframpBody(props: OfframpBodyProps) {
  const { step, address, session, orderStatus, redirectQuery, resolved } = props

  if (step === 'intro') {
    return (
      <>
        <ContextBlock address={address} />
        <p className="mb-4 text-sm text-muted-foreground">
          Flujo demo: sesión off-ramp reutilizable → envías USDC en Celo →
          recibes MXN en tu CLABE.
        </p>
        {session.kycCompleted && (
          <p className="mb-3 text-xs text-green-400">
            KYC ya completado en esta sesión.
          </p>
        )}
        <NavRow primaryLabel="Continuar" onPrimary={props.onIntroNext} />
      </>
    )
  }

  if (step === 'terms') {
    return (
      <>
        <p className="mb-3 text-sm">
          Acepta los Términos y Condiciones de Ripio (mock).
        </p>
        <label className="mb-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={props.termsChecked}
            onChange={(e) => props.onTermsChecked(e.target.checked)}
            className="mt-1"
          />
          <span>Acepto T&C para venta de cripto y retiro a cuenta bancaria.</span>
        </label>
        <NavRow
          primaryLabel="Aceptar y continuar"
          onPrimary={props.onAcceptTerms}
          onBack={props.onBack}
          primaryDisabled={!props.termsChecked}
        />
      </>
    )
  }

  if (step === 'kyc') {
    return (
      <>
        {session.kycCompleted ? (
          <p className="mb-3 text-sm text-green-400">
            KYC completado como {session.kycName}.
          </p>
        ) : (
          <>
            <Field
              label="Nombre completo"
              value={props.kycName}
              onChange={props.onKycName}
            />
            <Field
              label="CURP / identificación (demo)"
              value={props.kycId}
              onChange={props.onKycId}
            />
          </>
        )}
        <NavRow
          primaryLabel={
            session.kycCompleted ? 'Continuar' : 'Enviar KYC (mock)'
          }
          onPrimary={
            session.kycCompleted
              ? props.onKycContinue
              : props.onCompleteKyc
          }
          onBack={props.onBack}
          primaryDisabled={!session.kycCompleted && !props.kycName.trim()}
        />
      </>
    )
  }

  if (step === 'fiat_account') {
    return (
      <>
        <p className="mb-3 text-sm text-muted-foreground">
          Registra tu cuenta bancaria destino (CLABE) para recibir MXN.
        </p>
        <Field
          label="CLABE destino"
          value={props.payoutClabe}
          onChange={props.onPayoutClabe}
        />
        <p className="mb-3 text-xs">
          Estado:{' '}
          <span
            className={
              props.fiatAccountStatus === 'enabled'
                ? 'text-green-400'
                : props.fiatAccountStatus === 'processing'
                  ? 'text-yellow-400'
                  : 'text-muted-foreground'
            }
          >
            {props.fiatAccountStatus}
          </span>
        </p>
        {props.fiatAccountStatus !== 'enabled' ? (
          <NavRow
            primaryLabel={
              props.fiatAccountStatus === 'processing'
                ? 'Validando…'
                : 'Registrar cuenta (mock)'
            }
            onPrimary={() => void props.onRegisterFiatAccount()}
            onBack={props.onBack}
            primaryDisabled={props.fiatAccountStatus === 'processing'}
          />
        ) : (
          <NavRow
            primaryLabel="Continuar"
            onPrimary={props.onFiatAccountContinue}
            onBack={props.onBack}
          />
        )}
      </>
    )
  }

  if (step === 'session') {
    return (
      <>
        <p className="mb-3 text-sm font-medium">Sesión off-ramp (mock)</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Envía cripto a esta dirección Ripio en {MOCK_RIPIO.network}. La sesión
          no expira.
        </p>
        <dl className="mb-4 space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-mono">
          <Row label="Red" value={MOCK_RIPIO.network} />
          <Row label="Activo" value={MOCK_RIPIO.token} />
          <Row
            label="Depósito Ripio"
            value={MOCK_RIPIO.mockRipioCryptoDeposit}
          />
          <Row label="CLABE payout" value={props.payoutClabe || session.payoutClabe} />
        </dl>
        <NavRow
          primaryLabel="Continuar"
          onPrimary={props.onSessionContinue}
          onBack={props.onBack}
        />
      </>
    )
  }

  if (step === 'amount') {
    return (
      <>
        <Field
          label={`Monto a vender (${MOCK_RIPIO.token})`}
          value={props.cryptoAmount}
          onChange={props.onCryptoAmount}
          type="number"
        />
        {resolved && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
            <Row label="Recibes (est.)" value={`${resolved.fiat} MXN`} />
            <Row label="Comisión (~1%)" value={`${resolved.fee} MXN`} />
          </div>
        )}
        <NavRow
          primaryLabel="Continuar"
          onPrimary={props.onAmountContinue}
          onBack={props.onBack}
          primaryDisabled={!resolved}
        />
      </>
    )
  }

  if (step === 'send_crypto') {
    return (
      <>
        <p className="mb-3 text-sm">
          Simula el envío desde tu wallet WaaP hacia Ripio.
        </p>
        <dl className="mb-4 space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-mono">
          <Row label="Desde" value={address} />
          <Row label="Hacia" value={MOCK_RIPIO.mockRipioCryptoDeposit} />
          <Row label="Monto" value={`${props.cryptoAmount} ${MOCK_RIPIO.token}`} />
        </dl>
        <NavRow
          primaryLabel="Simular envío desde WaaP"
          onPrimary={() => void props.onSimulateSend()}
          onBack={props.onBack}
        />
      </>
    )
  }

  if (step === 'order_status') {
    return (
      <>
        <p className="mb-3 text-sm">Estado de la orden off-ramp</p>
        <StatusSteps status={orderStatus} />
        {orderStatus === 'COMPLETED' && resolved && (
          <p className="mt-3 text-xs text-green-400">
            {resolved.fiat} MXN enviados a CLABE …{props.payoutClabe.slice(-4)}
          </p>
        )}
      </>
    )
  }

  if (step === 'success') {
    return (
      <SuccessScreen
        action="offramp"
        redirectQuery={redirectQuery}
        onClose={props.onClose}
      />
    )
  }

  return null
}

function SuccessScreen({
  action,
  redirectQuery,
  onClose,
}: {
  action: 'onramp' | 'offramp'
  redirectQuery: string
  onClose: () => void
}) {
  const mockReturnUrl = `/pagos?${redirectQuery}`

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-green-400">
        <CheckCircle className="h-5 w-5" />
        <p className="font-medium">Operación completada (mock)</p>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        En producción Ripio mostraría «Volver al partner» y redirigiría con estos
        parámetros ({action}).
      </p>
      <pre className="mb-4 max-h-32 overflow-auto rounded-lg border border-white/10 bg-black/30 p-2 text-[10px] font-mono break-all">
        {mockReturnUrl}
      </pre>
      <NavRow primaryLabel="Volver a Motus (cerrar)" onPrimary={onClose} />
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-mauve-500"
      />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all text-right">{value}</dd>
    </div>
  )
}

function NavRow({
  primaryLabel,
  onPrimary,
  onBack,
  primaryDisabled,
}: {
  primaryLabel: string
  onPrimary: () => void
  onBack?: () => void
  primaryDisabled?: boolean
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {onBack && (
        <CTAButton type="button" size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Atrás
        </CTAButton>
      )}
      <CTAButton
        type="button"
        size="sm"
        onClick={onPrimary}
        disabled={primaryDisabled}
      >
        {primaryLabel}
        <ArrowRight className="ml-1 h-4 w-4" />
      </CTAButton>
    </div>
  )
}

function StatusSteps({ status }: { status: OrderStatus }) {
  const steps: Array<{ key: Exclude<OrderStatus, 'idle'>; label: string }> = [
    { key: 'PENDING', label: 'PENDING' },
    { key: 'PROCESSING', label: 'PROCESSING' },
    { key: 'COMPLETED', label: 'COMPLETED' },
  ]

  const order: Record<Exclude<OrderStatus, 'idle'>, number> = {
    PENDING: 1,
    PROCESSING: 2,
    COMPLETED: 3,
  }
  const current = status === 'idle' ? 0 : order[status]

  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step) => {
        const stepOrder = order[step.key]
        const reached = current >= stepOrder
        const active = status === step.key && status !== 'COMPLETED'
        const completed =
          status === 'COMPLETED' || (reached && stepOrder < current)
        return (
          <li
            key={step.key}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              active
                ? 'border-mauve-500/50 bg-mauve-500/10'
                : completed
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-white/10 text-muted-foreground'
            }`}
          >
            {completed ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : active ? (
              <Loader className="h-4 w-4 animate-spin text-mauve-400" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            <span className="font-mono">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function prevOnrampStep(step: OnrampStep): OnrampStep {
  const order: OnrampStep[] = [
    'intro',
    'terms',
    'kyc',
    'deposit_account',
    'quote',
    'payment',
    'order_status',
    'success',
  ]
  const i = order.indexOf(step)
  return i > 0 ? order[i - 1] : step
}

function prevOfframpStep(step: OfframpStep): OfframpStep {
  const order: OfframpStep[] = [
    'intro',
    'terms',
    'kyc',
    'fiat_account',
    'session',
    'amount',
    'send_crypto',
    'order_status',
    'success',
  ]
  const i = order.indexOf(step)
  return i > 0 ? order[i - 1] : step
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
