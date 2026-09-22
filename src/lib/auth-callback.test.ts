import { describe, expect, it } from 'vitest'
import { shouldBypassGoogleCallback } from './auth-callback'

describe('shouldBypassGoogleCallback', () => {
  it('bypasses a replayed Google callback when a session already exists', () => {
    expect(shouldBypassGoogleCallback('/api/auth/callback/google', true)).toBe(true)
  })

  it('allows the first Google callback when there is no session yet', () => {
    expect(shouldBypassGoogleCallback('/api/auth/callback/google', false)).toBe(false)
  })

  it('does not bypass other auth routes', () => {
    expect(shouldBypassGoogleCallback('/api/auth/session', true)).toBe(false)
  })
})
