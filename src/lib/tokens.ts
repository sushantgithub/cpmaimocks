import { randomBytes } from 'crypto'

// Server-only: emailed verification and reset tokens must be unguessable
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function normalizeEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
