import { getAddress, isAddress, verifyMessage } from 'viem'

export const FOUNDING_FAUCET_PURPOSE = 'motus-founding-faucet'
const PROOF_MAX_AGE_MS = 10 * 60 * 1000

export function checksumFaucetAddress(value: string) {
  if (!isAddress(value)) {
    throw new Error('Invalid wallet address')
  }
  return getAddress(value)
}

export function buildFoundingFaucetMessage(address: string, issuedAt: string) {
  const checksum = checksumFaucetAddress(address)
  return [
    'app.motusdao.org wants you to sign in with your Ethereum account:',
    checksum,
    '',
    'Claim CELO for Motus Name Service registration.',
    '',
    `Purpose: ${FOUNDING_FAUCET_PURPOSE}`,
    'URI: https://app.motusdao.org',
    'Version: 1',
    'Chain ID: 42220',
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

export function verifyFoundingFaucetProof(input: {
  address: string
  signature: string
  issuedAt: string
}) {
  const address = checksumFaucetAddress(input.address)
  const issued = Date.parse(input.issuedAt)
  if (!Number.isFinite(issued)) {
    throw new Error('Invalid wallet proof timestamp')
  }
  if (Math.abs(Date.now() - issued) > PROOF_MAX_AGE_MS) {
    throw new Error('Wallet proof expired. Connect again.')
  }

  const ok = verifyMessage({
    address,
    message: buildFoundingFaucetMessage(address, input.issuedAt),
    signature: input.signature as `0x${string}`,
  })
  if (!ok) {
    throw new Error('Wallet signature mismatch')
  }

  return { address }
}