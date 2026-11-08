# Agent tick en el VPS

> Propósito: liberar las sesiones del escrow que ya están `Settled` y cuya ventana de
> disputa venció. Corre cada **2 minutos** desde el VPS.

## Dónde

En **`vps-motusdao`** (el box de Jitsi privado/clínico), no en `vps-brahma` (Jitsi abierto
y metaverso). El agente mueve dinero: trátalo como producción y mantenlo en la infra de
MotusDAO. Si quieres probar sin tocar el box clínico, puedes usar `vps-brahma` y migrar
después; el comando es el mismo.

El VPS solo necesita salida HTTPS a `app.motusdao.org`; no abre puertos ni guarda la llave
del agente.
>
> La llave del agente (`AGENT_PRIVATE_KEY`) **no** vive en el VPS: se queda en Vercel.
> El VPS solo guarda `CRON_SECRET`, que autentica la llamada al endpoint.

## Qué hace

```
POST https://app.motusdao.org/api/agent/tick
Authorization: Bearer $CRON_SECRET
```

El endpoint lee `SessionCreated` desde el bloque de deploy, revisa el estado de cada
sesión y llama `release(id)` cuando corresponde. La tx se firma en Vercel con la wallet
del agente y lleva el sufijo ERC-8021.

## Instalación (un comando)

```bash
read -rsp "Pega tu CRON_SECRET de Vercel: " MOTUS_CRON_SECRET; echo
install -m 600 /dev/null "$HOME/.motus-agent.env"
printf 'export CRON_SECRET=%q\n' "$MOTUS_CRON_SECRET" > "$HOME/.motus-agent.env"
unset MOTUS_CRON_SECRET
( crontab -l 2>/dev/null | grep -v 'motus-agent-tick'; \
  echo '*/2 * * * * . "$HOME/.motus-agent.env" && curl -fsS -X POST https://app.motusdao.org/api/agent/tick -H "Authorization: Bearer $CRON_SECRET" >> "$HOME/motus-agent.log" 2>&1 # motus-agent-tick' ) | crontab -
. "$HOME/.motus-agent.env" && curl -fsS -X POST https://app.motusdao.org/api/agent/tick -H "Authorization: Bearer $CRON_SECRET"; echo
```

Qué hace, en orden:

1. Lee el secreto sin mostrarlo.
2. Lo guarda en `~/.motus-agent.env` con permisos `600`.
3. Reemplaza (sin duplicar) la línea de cron marcada `# motus-agent-tick`.
4. Ejecuta el tick una vez y muestra el JSON de respuesta.

## Verificar

```bash
crontab -l | grep motus-agent-tick
tail -f "$HOME/motus-agent.log"
```

Respuesta esperada del tick:

```json
{ "checked": 1, "released": 0, "txs": [], "errors": [] }
```

## Rotar el secreto

1. Genera uno nuevo en Vercel (`CRON_SECRET`) y redespliega.
2. Corre de nuevo el comando de instalación con el valor nuevo.

## Rollback

```bash
crontab -l 2>/dev/null | grep -v 'motus-agent-tick' | crontab -
rm -f "$HOME/.motus-agent.env"
```

El escrow y las sesiones no se tocan: solo se deja de disparar el tick.

## Notas

- El cron del usuario persiste al reiniciar el VPS.
- Si el VPS está caído, no hay ticks; al volver, el siguiente ciclo libera lo pendiente
  (el worker es idempotente).
- El log crece; para demo está bien. En producción, rota con `logrotate`.
- El worker escanea los últimos `ESCROW_SCAN_BLOCKS` (4,500 por defecto, ≈6 horas de
  Celo). Si el VPS está caído más tiempo, las sesiones viejas no se liberan solas: se
  pueden liberar a mano o subir el valor (el RPC topa en 5,000 bloques por consulta).
