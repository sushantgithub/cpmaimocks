import { describe, expect, it } from 'vitest'
import { newestMockAttemptsFirst } from '@/lib/mock-attempt-history'

describe('newestMockAttemptsFirst', () => {
  it('shows the latest attempt first without mutating the input', () => {
    const attempts = [
      { id: 'attempt-3', startedAt: new Date('2026-09-25T10:00:00Z') },
      { id: 'attempt-4', startedAt: new Date('2026-09-25T11:00:00Z') },
      { id: 'attempt-5', startedAt: new Date('2026-09-25T12:00:00Z') },
    ]

    expect(newestMockAttemptsFirst(attempts).map((attempt) => attempt.id)).toEqual([
      'attempt-5',
      'attempt-4',
      'attempt-3',
    ])
    expect(attempts.map((attempt) => attempt.id)).toEqual([
      'attempt-3',
      'attempt-4',
      'attempt-5',
    ])
  })
})
