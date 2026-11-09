import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Mail,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { MOTUS_LEGAL_CONTACT_EMAIL } from '@/lib/legal/constants'

const LAST_UPDATED = '8 de noviembre de 2026'

function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

export default function PoliticasDePagoPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/finanzas"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pagos
        </Link>

        <div className="flex items-start gap-4">
          <span className="rounded-2xl bg-mauve-500/15 p-3 text-mauve-200">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-3xl font-bold">Política de pagos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cómo pagar dentro de Motus, qué protegemos y qué queda fuera.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Última actualización: {LAST_UPDATED}
            </p>
          </div>
        </div>

        <GlassCard className="mt-8 space-y-8 p-6 sm:p-8">
          <Section title="La regla principal">
            <p>
              <strong className="text-foreground">
                Paga únicamente desde la sesión en Motus.
              </strong>{' '}
              Usa la CLABE, el monto y la referencia que la app te muestra para esa
              sesión. La orden, el comprobante, la confirmación y el soporte viven
              en Motus; el riel bancario puede ser externo, pero la operación no.
            </p>
            <p>
              Si alguien te pide pagar por fuera, a otra cuenta, por WhatsApp o por
              otro medio, no pagues y repórtalo.
            </p>
          </Section>

          <Section title="Cómo se paga dentro de Motus">
            <ul className="space-y-3">
              <li className="flex gap-2">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-mauve-300" />
                <span>
                  <strong className="text-foreground">Wallet / escrow:</strong> pagas
                  en wMXN y el dinero queda en escrow hasta que la sesión se
                  confirma. Es la ruta con más protección.
                </span>
              </li>
              <li className="flex gap-2">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-mauve-300" />
                <span>
                  <strong className="text-foreground">Tarjeta:</strong> pagas en el
                  checkout de la sesión; el cargo lo procesa Stripe.
                </span>
              </li>
              <li className="flex gap-2">
                <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-mauve-300" />
                <span>
                  <strong className="text-foreground">SPEI:</strong> transfieres
                  desde tu banco a la CLABE del profesional que aparece en la
                  sesión, registras el comprobante y el profesional confirma. Es
                  una confirmación manual.
                </span>
              </li>
            </ul>
          </Section>

          <Section title="Lo que no está permitido">
            <ul className="list-disc space-y-1 pl-5">
              <li>Pedir o hacer pagos fuera de la sesión de Motus.</li>
              <li>
                Usar una CLABE distinta a la que muestra la app, o una que te
                compartan por mensaje, correo o red social.
              </li>
              <li>
                Compartir datos de contacto o cuentas para evitar la plataforma, la
                comisión o el escrow.
              </li>
              <li>Subir comprobantes falsos, alterados o de otra operación.</li>
              <li>Suplantar a otra persona o a un profesional.</li>
            </ul>
          </Section>

          <Section title="Qué protegemos y qué no">
            <div className="flex gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-300" />
              <p>
                <strong className="text-foreground">Dentro de Motus:</strong>{' '}
                conservamos la sesión, el comprobante y la confirmación; podemos
                mediar, revisar el caso y aplicar reembolsos o disputas cuando
                corresponda.
              </p>
            </div>
            <div className="mt-3 flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p>
                <strong className="text-foreground">Fuera de Motus:</strong> no
                podemos verificar el pago, la cuenta ni la entrega. No hay
                protección, reembolso ni disputa. Pagar fuera es bajo tu riesgo.
              </p>
            </div>
          </Section>

          <Section title="Profesionales">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                No solicitar pagos fuera de Motus ni compartir otra cuenta para
                cobrar una sesión.
              </li>
              <li>
                Usar la CLABE registrada en la app; la app la muestra al paciente
                en la sesión.
              </li>
              <li>
                La comisión de la plataforma se aplica a los pagos dentro de Motus.
                Evadirla es una violación de esta política.
              </li>
              <li>
                Confirmar solo transferencias que realmente recibieron y coincidan
                con el monto y la referencia.
              </li>
            </ul>
          </Section>

          <Section title="Pacientes">
            <ul className="list-disc space-y-1 pl-5">
              <li>Verificar el nombre del beneficiario y la CLABE en la sesión.</li>
              <li>No pagar a otra cuenta ni fuera de la sesión.</li>
              <li>Registrar el comprobante en Motus, no solo enviarlo por chat.</li>
              <li>
                Reportar cualquier solicitud de pago fuera de la app o de cambiar
                de cuenta.
              </li>
            </ul>
          </Section>

          <Section id="reportar" title="Cómo reportar">
            <p>
              Escríbenos a{' '}
              <a
                href={`mailto:${MOTUS_LEGAL_CONTACT_EMAIL}?subject=Pago%20fuera%20de%20Motus`}
                className="font-semibold text-mauve-300 underline"
              >
                {MOTUS_LEGAL_CONTACT_EMAIL}
              </a>{' '}
              con el asunto <strong className="text-foreground">“Pago fuera de Motus”</strong>.
              Incluye:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>El ID o enlace de la sesión.</li>
              <li>Qué te pidieron y por qué medio.</li>
              <li>Capturas, sin compartir números de tarjeta ni datos sensibles.</li>
            </ul>
            <p>
              Revisamos el caso y podemos suspender la cuenta del profesional si
              corresponde.
            </p>
          </Section>

          <Section title="Consecuencias">
            <p>
              Pagar o cobrar fuera de Motus puede resultar en la pérdida de
              protección, la cancelación de la sesión, la suspensión de la cuenta y
              las acciones que correspondan. Motus puede solicitar información
              adicional para revisar un pago.
            </p>
          </Section>

          <Section title="Cambios">
            <p>
              Podemos actualizar esta política para reflejar cambios en el producto
              o en la ley. La fecha de la parte superior indica la versión vigente.
            </p>
          </Section>

          <div className="flex items-start gap-2 border-t border-white/10 pt-4 text-xs text-muted-foreground">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Dudas o reportes: {' '}
              <a
                href={`mailto:${MOTUS_LEGAL_CONTACT_EMAIL}`}
                className="text-mauve-300 underline"
              >
                {MOTUS_LEGAL_CONTACT_EMAIL}
              </a>
              . Esta política complementa los Términos y el Aviso de Privacidad.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
