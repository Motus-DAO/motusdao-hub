import jwt from 'jsonwebtoken'

const PURPOSE = 'rootrouter-upstream'

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET environment variable is required in production')
  }
  return secret || 'dev-only-insecure-auth-secret'
}

export function createRootRouterBridgeToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: PURPOSE }, getAuthSecret(), { expiresIn: '15m' })
}

export function verifyRootRouterBridgeToken(token: string): string | null {
  try {
    const verified = jwt.verify(token, getAuthSecret()) as jwt.JwtPayload & {
      sub?: string
      purpose?: string
    }
    if (verified.purpose !== PURPOSE || !verified.sub) return null
    return verified.sub
  } catch {
    return null
  }
}
