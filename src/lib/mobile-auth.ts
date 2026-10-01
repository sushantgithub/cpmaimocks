import { createHmac, timingSafeEqual } from 'crypto'
import { authSecretForEnvironment } from '@/lib/environment-safety'

const MOBILE_AUDIENCE = 'certmocks-android'
const MOBILE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

export interface MobileAuthPayload {
  sub: string
  email: string
  name: string | null
  role: string
  aud: string
  iat: number
  exp: number
}

function secret() {
  const value = authSecretForEnvironment()
  if (!value) throw new Error('AUTH_SECRET is not configured')
  return value
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(unsigned: string) {
  return createHmac('sha256', secret()).update(unsigned).digest('base64url')
}

export function issueMobileToken(user: {
  id: string
  email: string
  name?: string | null
  role: string
}) {
  const now = Math.floor(Date.now() / 1000)
  const payload: MobileAuthPayload = {
    sub: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    aud: MOBILE_AUDIENCE,
    iat: now,
    exp: now + MOBILE_TOKEN_TTL_SECONDS,
  }

  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const body = encode(payload)
  const unsigned = `${header}.${body}`
  return {
    token: `${unsigned}.${sign(unsigned)}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  }
}

export function verifyMobileToken(token: string): MobileAuthPayload | null {
  const [header, body, signature, ...extra] = token.split('.')
  if (!header || !body || !signature || extra.length > 0) return null

  const unsigned = `${header}.${body}`
  const expected = Buffer.from(sign(unsigned))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as {
      alg?: string
      typ?: string
    }
    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') return null

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as MobileAuthPayload
    const now = Math.floor(Date.now() / 1000)

    if (
      !payload.sub ||
      !payload.email ||
      payload.aud !== MOBILE_AUDIENCE ||
      !Number.isFinite(payload.iat) ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
