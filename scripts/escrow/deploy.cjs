/**
 * Deploy TherapyEscrow to Celo and hand ownership to the cold owner.
 *
 * Usage:
 *   npx hardhat run scripts/escrow/deploy.cjs --network celo
 *   # loads AGENT_PRIVATE_KEY from .env.local via hardhat.config.cjs
 *
 * The signer is AGENT_PRIVATE_KEY (the agent hot wallet), read from the env.
 * It becomes the temporary owner, sets operator/oracle in the constructor and
 * immediately transfers ownership to ESCROW_OWNER. The owner key never leaves
 * the cold wallet.
 *
 * Env (defaults are the Motus production values):
 *   AGENT_PRIVATE_KEY   required — agent hot wallet
 *   ESCROW_OWNER        0x052E6A4080293e9B0e2629dC8b43854E758Ecb8f
 *   ESCROW_OPERATOR     0xb3C5EA7E583FBa073006c6C553239daC59e3d47B
 *   ESCROW_ORACLE       defaults to ESCROW_OPERATOR
 *   ESCROW_TREASURY     0xf229F3Dcea3D7cd3cA5ca41C4C50135D7b37F2b9
 *   ESCROW_FEE_BPS      1000 (10%, hard cap 2000)
 */
const { ethers } = require('hardhat')

const OWNER = process.env.ESCROW_OWNER || '0x052E6A4080293e9B0e2629dC8b43854E758Ecb8f'
const OPERATOR =
  process.env.ESCROW_OPERATOR || '0xb3C5EA7E583FBa073006c6C553239daC59e3d47B'
const ORACLE = process.env.ESCROW_ORACLE || OPERATOR
const TREASURY =
  process.env.ESCROW_TREASURY || '0xf229F3Dcea3D7cd3cA5ca41C4C50135D7b37F2b9'
const FEE_BPS = Number(process.env.ESCROW_FEE_BPS || '1000')

async function main() {
  const rawKey = process.env.AGENT_PRIVATE_KEY
  if (!rawKey) {
    throw new Error('AGENT_PRIVATE_KEY is required (add it to .env.local)')
  }

  const signer = new ethers.Wallet(
    rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`,
    ethers.provider
  )

  console.log('[escrow] deployer (agent)', signer.address)
  console.log('[escrow] config', {
    owner: OWNER,
    operator: OPERATOR,
    oracle: ORACLE,
    treasury: TREASURY,
    feeBps: FEE_BPS,
  })

  if (signer.address.toLowerCase() !== OPERATOR.toLowerCase()) {
    console.warn('[escrow] warning: deployer is not ESCROW_OPERATOR')
  }

  const Escrow = await ethers.getContractFactory('TherapyEscrow', signer)
  const escrow = await Escrow.deploy(TREASURY, FEE_BPS, OPERATOR, ORACLE)
  await escrow.waitForDeployment()

  const address = await escrow.getAddress()
  const deployTx = escrow.deploymentTransaction()
  console.log('[escrow] deployed', address)
  console.log('[escrow] deploy tx', deployTx ? deployTx.hash : 'unknown')

  const currentOwner = await escrow.owner()
  if (currentOwner.toLowerCase() !== OWNER.toLowerCase()) {
    console.log('[escrow] transferring ownership to', OWNER)
    const tx = await escrow.connect(signer).transferOwnership(OWNER)
    await tx.wait()
    console.log('[escrow] ownership tx', tx.hash)
  }

  console.log('[escrow] final', {
    address,
    owner: await escrow.owner(),
    operator: await escrow.operator(),
    oracle: await escrow.oracle(),
    treasury: await escrow.treasury(),
    feeBps: (await escrow.feeBps()).toString(),
  })
}

main().catch((error) => {
  console.error('[escrow] deploy failed', error)
  process.exitCode = 1
})
