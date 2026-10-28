import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { VENICE_HOME_URL, VENICE_PRIVACY_URL } from '@/lib/ai-consent-copy'

export function PsychatInferencePrivacyHelp() {
  return (
    <div className="space-y-6 text-sm text-muted-foreground">
      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          Cómo responde Psychat cuando escribes
        </GradientText>
        <p>
          Psychat es un chat con un <strong className="text-foreground">modelo de lenguaje (LLM)</strong>{' '}
          configurado en el Hub. Motus <strong className="text-foreground">no inventa</strong> la respuesta en
          tu navegador: tu mensaje viaja a nuestros servicios y de ahí al{' '}
          <strong className="text-foreground">proveedor de IA</strong> (por ejemplo Venice u OpenAI, según
          la configuración del entorno).
        </p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Entras con wallet y confirmas la sesión del Hub.</li>
          <li>
            Aceptas el procesamiento de IA (casilla bajo el chat): autorizas que el proveedor use lo que
            escribes <em>en ese envío</em>.
          </li>
          <li>
            El Hub comprueba crédito de IA y consentimiento, y llama al modelo (inferencia).
          </li>
          <li>La respuesta vuelve a tu pantalla; el hilo sigue en el navegador mientras uses la página.</li>
        </ol>
        <p>
          Esto es <strong className="text-foreground">distinto</strong> de la “copia cifrada” más arriba: la
          inferencia ocurre para contestarte; la copia opcional es solo un respaldo que tú activas aparte.
        </p>
        <p>
          <Link href="/psychat" className="text-mauve-400 underline">
            Volver a Psychat
          </Link>{' '}
          · En el chat, abre <strong className="text-foreground">Ajustes avanzados</strong> para cambiar el
          modo de privacidad.
        </p>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <GradientText as="h2" className="text-xl font-semibold">
          Dos modos de privacidad al enviar mensajes
        </GradientText>
        <p>
          Tú eliges (radios en Ajustes avanzados) cómo viaja el texto hacia el proveedor. Ambos modos pueden
          usar modelos alojados en infraestructura del proveedor; la diferencia es{' '}
          <strong className="text-foreground">quién puede leer tu mensaje en el camino</strong>.
        </p>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-2">
          <p className="font-medium text-foreground">Privacidad estándar (TEE)</p>
          <p>
            El mensaje sale <strong className="text-foreground">legible</strong> desde el Hub hacia el servicio
            de IA en ese momento, para poder enrutarlo y procesarlo. El proveedor puede ejecutar el modelo
            dentro de un <strong className="text-foreground">TEE</strong> (Trusted Execution Environment): un
            entorno aislado en el servidor del proveedor, pensado para que el procesamiento ocurra con
            protecciones de hardware/software.
          </p>
          <p>
            <strong className="text-foreground">Motus Hub</strong> puede ver el texto necesario para enviar la
            consulta (como dice la casilla de consentimiento). No es anonimato total ni cifrado de extremo a
            extremo en el envío.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/[0.06] p-4 space-y-2">
          <p className="font-medium text-foreground">Privacidad reforzada (E2EE)</p>
          <p>
            Tu navegador <strong className="text-foreground">cifra</strong> el diálogo antes de mandarlo al Hub.
            Motus reenvía <em>bloques cifrados</em> al proveedor (Venice) junto con claves públicas del
            enclave; <strong className="text-foreground">Motus no descifra</strong> el contenido de tus
            mensajes en ese trayecto. La respuesta también puede venir cifrada y solo tu navegador la abre.
          </p>
          <p>
            Antes del primer envío en este modo, el Hub pide una{' '}
            <strong className="text-foreground">attestation</strong> (prueba) del enclave del proveedor para
            reducir el riesgo de hablar con un entorno falsificado. Solo está disponible con proveedor Venice
            y modelos compatibles (nombres que suelen empezar por <code className="text-xs">e2ee-</code>).
          </p>
          <p className="text-xs">
            Tecnología: cifrado de extremo a extremo en el canal Hub ↔ enclave (E2EE), distinto de la llave de
            la copia archivada en tu cuenta.
          </p>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          Qué ve cada parte (resumen)
        </GradientText>
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-2 pr-2 font-medium text-foreground" />
              <th className="py-2 px-1 font-medium text-foreground">Modo estándar (TEE)</th>
              <th className="py-2 pl-1 font-medium text-foreground">Modo reforzado (E2EE)</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-2 font-medium text-foreground">Tú (navegador)</td>
              <td className="py-2 px-1">Lees y escribes en claro en pantalla.</td>
              <td className="py-2 pl-1">Cifras envíos; descifras respuestas.</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-2 font-medium text-foreground">Motus Hub</td>
              <td className="py-2 px-1">Puede procesar el texto para llamar al modelo.</td>
              <td className="py-2 pl-1">Relay cifrado; no lee el cuerpo del mensaje en tránsito.</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-2 font-medium text-foreground">Proveedor de IA</td>
              <td className="py-2 px-1">Recibe y procesa la consulta (a menudo en TEE).</td>
              <td className="py-2 pl-1">Procesa dentro del enclave; descifra allí para inferir.</td>
            </tr>
            <tr>
              <td className="py-2 pr-2 font-medium text-foreground">Copia archivada (opcional)</td>
              <td className="py-2 px-1" colSpan={2}>
                Independiente del modo TEE/E2EE. Otra casilla, otra firma de wallet, cifrado en tu cuenta
                Motus.
              </td>
            </tr>
          </tbody>
        </table>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          Límites honestos
        </GradientText>
        <ul className="list-disc list-inside space-y-2">
          <li>
            Ningún modo sustituye <strong className="text-foreground">emergencias</strong> ni la relación con
            un profesional humano en el Hub.
          </li>
          <li>
            El proveedor de IA tiene sus propias políticas de retención y uso; revisa su documentación (
            <a href={VENICE_HOME_URL} className="text-mauve-400 underline" target="_blank" rel="noreferrer">
              Venice
            </a>
            ,{' '}
            <a href={VENICE_PRIVACY_URL} className="text-mauve-400 underline" target="_blank" rel="noreferrer">
              privacidad Venice
            </a>
            ).
          </li>
          <li>
            El crédito de IA (saldo diario o comprado) limita cuántas inferencias puedes hacer; eso no cambia
            quién cifra la copia archivada.
          </li>
          <li>
            Como profesional (PSM), usa Psychat como apoyo de supervisión, no como expediente del paciente ni
            como canal clínico oficial.
          </li>
        </ul>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          Segunda salida: resumen para tu profesional
        </GradientText>
        <p>
          Distinto de la copia cifrada de Psychat o la bitácora: tú{' '}
          <strong className="text-foreground">escribes un resumen</strong> y lo compartes con tu
          psicólogo/a emparejado. Va en un sobre FHIR (<code className="text-xs">DocumentReference</code>
          ) para interoperabilidad, pero el Hub lo guarda como texto legible solo para ese match — no
          es expediente clínico.
        </p>
        <Link href="/compartir-resumen" className="text-mauve-400 underline text-sm">
          Ir a compartir resumen →
        </Link>
      </GlassCard>
    </div>
  )
}
