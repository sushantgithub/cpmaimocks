import { describe, expect, it } from 'vitest'
import { activeAccountRole } from './session-access'

describe('activeAccountRole', () => {
  it('allows active user and admin accounts', () => {
    expect(activeAccountRole({ isActive: true, role: 'USER' })).toBe('USER')
    expect(activeAccountRole({ isActive: true, role: 'ADMIN' })).toBe('ADMIN')
  })

  it('rejects inactive and missing accounts', () => {
    expect(activeAccountRole({ isActive: false, role: 'USER' })).toBeNull()
    expect(activeAccountRole(null)).toBeNull()
  })
})
