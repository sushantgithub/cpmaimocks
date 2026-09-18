import { describe, it, expect } from 'vitest'
import { generateToken, normalizeEmail, isValidEmail } from '@/lib/tokens'

describe('generateToken', () => {
  it('produces long, URL-safe, unique tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()))
    expect(tokens.size).toBe(200)
    for (const token of Array.from(tokens)) {
      expect(token.length).toBeGreaterThanOrEqual(40)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })
})

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com')
  })

  it('returns an empty string for anything that is not a string', () => {
    expect(normalizeEmail(undefined)).toBe('')
    expect(normalizeEmail(42)).toBe('')
    expect(normalizeEmail({ email: 'x' })).toBe('')
  })
})

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('someone@example.com')).toBe(true)
    expect(isValidEmail('first.last+tag@sub.example.co.in')).toBe(true)
  })

  it('rejects malformed addresses', () => {
    expect(isValidEmail('no-at-sign')).toBe(false)
    expect(isValidEmail('missing@tld')).toBe(false)
    expect(isValidEmail('spaces in@example.com')).toBe(false)
    expect(isValidEmail('a@' + 'b'.repeat(260) + '.com')).toBe(false)
  })
})
