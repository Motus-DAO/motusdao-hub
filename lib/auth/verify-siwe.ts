import { SiweMessage } from 'siwe'
import { getAddress, recoverMessageAddress, type Hex } from 'viem'
import { AuthError } from './errors'

export function normalizeSignature(signature: string): Hex {
  const trimmed = signature.trim()
  const withPrefix = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`
  return withPrefix as Hex
}

/**
 * Verify a SIWE login message + signature.
 * Uses viem recovery (works reliably with WaaP / personal_sign) instead of
 * the siwe package's ethers-based verifier, which can reject valid WaaP sigs.
 */
export async function verifySiweLogin(params: {
  message: string
  signature: string
  domain: string
}): Promise<{ address: string; nonce: string }> {
  const { message, signature, domain } = params

  let siweMessage: SiweMessage
  try {
    siweMessage = new SiweMessage(message)
  } catch {
    throw new AuthError(401, 'Invalid sign-in message format')
  }

  if (siweMessage.domain !== domain) {
    throw new AuthError(
      401,
      `Domain mismatch (expected ${domain}, message has ${siweMessage.domain})`
    )
  }

  if (!siweMessage.nonce) {
    throw new AuthError(401, 'Missing nonce in sign-in message')
  }

  const normalized = normalizeSignature(signature)

  let recovered: string
  try {
    recovered = await recoverMessageAddress({
      message,
      signature: normalized,
    })
  } catch {
    throw new AuthError(401, 'Invalid signature format')
  }

  if (getAddress(recovered) !== getAddress(siweMessage.address)) {
    throw new AuthError(401, 'Signature does not match wallet address')
  }

  return {
    address: getAddress(siweMessage.address),
    nonce: siweMessage.nonce,
  }
}
