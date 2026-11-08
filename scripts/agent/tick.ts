import { runAgentTick } from '../../lib/escrow/agent'

async function main() {
  const result = await runAgentTick()
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error('[agent:tick]', error)
  process.exitCode = 1
})
