import { describe, expect, it } from 'vitest'
import { adminAccessEndDate, isAdminTestAccess } from './admin-test-access'

describe('admin test access helpers', () => {
  it('recognizes only explicitly marked admin test access', () => {
    expect(isAdminTestAccess({ cancellationReason: 'ADMIN_TEST_ACCESS' })).toBe(true)
    expect(isAdminTestAccess({ cancellationReason: null })).toBe(false)
    expect(isAdminTestAccess({ cancellationReason: 'customer cancellation' })).toBe(false)
  })

  it('calculates a bounded UTC expiry', () => {
    const start = new Date('2026-09-20T12:00:00.000Z')
    expect(adminAccessEndDate(start, 30)?.toISOString()).toBe('2026-10-20T12:00:00.000Z')
    expect(adminAccessEndDate(start, 0)).toBeNull()
    expect(adminAccessEndDate(start, 3651)).toBeNull()
  })
})
