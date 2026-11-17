import { consumeAuthNonce } from '@/lib/auth/nonce'
import { AuthError } from '@/lib/auth/errors'
import { verifySiweLogin } from '@/lib/auth/verify-siwe'
import { normalizeLinkedWalletAddress } from '@/lib/auth/linked-wallets'

export async function verifySiweStepUp(params: {
  message: string
  signature: string
  expectedAddress?: string
}): Promise<string> {
  const { address, nonce } = await verifySiweLogin({
    message: params.message,
    signature: params.signature,
  })

  const nonceValid = await consumeAuthNonce(address, nonce)
  if (!nonceValid) {
    throw new AuthError(401, 'Invalid or expired nonce')
  }

  if (params.expectedAddress) {
    const expected = normalizeLinkedWalletAddress(params.expectedAddress)
    const actual = normalizeLinkedWalletAddress(address)
    if (expected !== actual) {
      throw new AuthError(403, 'La firma no corresponde a la wallet indicada')
    }
  }

  return normalizeLinkedWalletAddress(address)
}