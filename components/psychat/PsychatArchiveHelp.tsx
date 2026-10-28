import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { GradientText } from '@/components/ui/GradientText'
import { CTAButton } from '@/components/ui/CTAButton'
import { psychatCopy } from '@/lib/psychat-archive/constants'

type Props = {
  /** Show primary CTA to recover page */
  showRecoverCta?: boolean
}

export function PsychatArchiveHelp({ showRecoverCta = true }: Props) {
  return (
    <div className="space-y-6 text-sm text-muted-foreground">
      <GlassCard className="p-6 space-y-3 border-mauve-500/20">
        <GradientText as="h2" className="text-xl font-semibold">
          ¿Qué es “guardar en Motus”?
        </GradientText>
        <p>{psychatCopy.notAnotherWebsite}</p>
        <p>
          Técnicamente la copia vive en almacenamiento en la nube de la plataforma, pero{' '}
          <strong className="text-foreground">cifrada</strong>: para ti es “mi respaldo en la
          cuenta con la que entré al Hub”, no una carpeta que vea el equipo ni tu colega
          psicólogo/a.
        </p>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          ¿Qué pasa cuando chateo en Psychat?
        </GradientText>
        <p>
          Por defecto el chat vive en tu navegador mientras usas la página. Motus{' '}
          <strong className="text-foreground">no guarda</strong> ese hilo en tu cuenta si no
          activas la opción de copia cifrada. Cada mensaje que envías al asistente sigue yendo al
          proveedor de IA que elegiste (con el consentimiento de procesamiento que ya aceptaste).
        </p>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          Si activo “Guardar copia cifrada”
        </GradientText>
        <p>
          Estás pidiendo que Motus guarde una{' '}
          <strong className="text-foreground">copia de respaldo</strong> de la conversación en tu
          cuenta, pero <em>cerrada con candado</em>: primero tu navegador la cifra y solo después la
          envía a la plataforma.
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>
            Necesitas una <strong className="text-foreground">segunda firma</strong> de wallet
            (distinta a la de la bitácora) para crear la llave del archivo.
          </li>
          <li>
            Mientras chateas, la copia se puede{' '}
            <strong className="text-foreground">actualizar sola</strong> o con “Guardar copia
            ahora”.
          </li>
          <li>
            Solo guardamos <strong className="text-foreground">una copia por cuenta</strong>: cada
            guardado reemplaza la anterior con el chat completo hasta ese momento (no es un
            historial de versiones).
          </li>
        </ul>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          ¿Dónde se guarda?
        </GradientText>
        <p>
          En <strong className="text-foreground">tu cuenta Motus Hub</strong>, como{' '}
          <strong className="text-foreground">texto ilegible</strong> (cifrado). Es como un sobre
          cerrado: la plataforma guarda el sobre, pero no tiene la llave para abrirlo.
        </p>
        <p>
          Queda <strong className="text-foreground">cifrado</strong>: nadie — ni Motus ni tú — puede leer
          el contenido hasta que lo <strong className="text-foreground">descifres</strong> de nuevo con
          tu wallet (la firma de desbloqueo del archivo Psychat).
        </p>
        <p>
          Opcionalmente puedes bajar un archivo <strong className="text-foreground">.json</strong>{' '}
          (“Exportar”): el mismo sobre, pero en tu computadora, USB o nube personal (Drive, etc.).
        </p>
        <p>
          Para <strong className="text-foreground">ver otra vez</strong> una copia en el chat, usa la{' '}
          <strong className="text-foreground">barra lateral izquierda</strong> en Psychat: nuevo chat,
          copia en tu cuenta, o un `.json`.
        </p>
      </GlassCard>

      <GlassCard className="p-6 space-y-3 border-emerald-400/20">
        <GradientText as="h2" className="text-xl font-semibold">
          ¿Quién puede leerlo?
        </GradientText>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong className="text-foreground">Sé dueño de tus datos.</strong> Solo tú puedes leer esta
            copia, con la misma wallet y la firma de desbloqueo del archivo Psychat. No basta con “entrar”
            al Hub: hace falta esa firma distinta a la bitácora.
          </li>
        </ul>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          ¿Quién no puede leerlo?
        </GradientText>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong className="text-foreground">Motus</strong> (equipo, admin, soporte): no ven el
            texto del chat; solo que hay un bloque cifrado. Pueden anotar en auditoría que guardaste o
            actualizaste (fecha, acción), <strong className="text-foreground">sin</strong> el contenido.
          </li>
          <li>
            <strong className="text-foreground">Tu psicólogo/a en el Hub</strong>: no recibe esta copia
            sola. No es expediente clínico ni lo de una sesión humana contigo.
          </li>
        </ul>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          ¿Cómo lo borro?
        </GradientText>
        <p>
          Desmarca “Guardar copia cifrada” en Psychat. Eso apaga la función y{' '}
          <strong className="text-foreground">elimina la copia de tu cuenta Motus</strong>. El chat
          que ves en pantalla no desaparece; solo deja de existir el respaldo cifrado en la app.
        </p>
        <p>
          Si además exportaste un `.json`, ese archivo sigue donde lo hayas guardado hasta que tú
          lo borres — Motus no puede borrar copias en tu Drive o tu disco.
        </p>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          En tu cuenta Motus vs archivo .json
        </GradientText>
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-2 pr-2 font-medium text-foreground">Copia en tu cuenta</th>
              <th className="py-2 font-medium text-foreground">Export .json</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-2">Útil si cambias de dispositivo con la misma cuenta.</td>
              <td className="py-2">Útil si borraste la copia en la app o quieres backup fuera del Hub.</td>
            </tr>
            <tr>
              <td className="py-2 pr-2">La borras desactivando la casilla.</td>
              <td className="py-2">La borras tú donde la guardaste.</td>
            </tr>
          </tbody>
        </table>
        {showRecoverCta && (
          <>
            <p>
              Si tienes un `.json` y quieres volver a dejarlo en tu cuenta o abrirlo en el chat:{' '}
              <Link href="/psychat/archivo/recuperar" className="text-mauve-400 underline">
                Recuperar copia
              </Link>
              .
            </p>
            <CTAButton asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <Link href="/psychat/archivo/recuperar">Ir a recuperar copia</Link>
            </CTAButton>
          </>
        )}
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <GradientText as="h2" className="text-xl font-semibold">
          Qué no es esto
        </GradientText>
        <ul className="list-disc list-inside space-y-2">
          <li>No es tu bitácora personal (otra llave, otro propósito).</li>
          <li>
            No es entrenamiento de modelos de IA — eso es otro consentimiento:{' '}
            <Link href="/contribuir-entrenamiento" className="text-mauve-400 underline">
              copia legible para entrenamiento
            </Link>
            .
          </li>
          <li>No sustituye atención humana ni emergencias.</li>
        </ul>
      </GlassCard>
    </div>
  )
}
