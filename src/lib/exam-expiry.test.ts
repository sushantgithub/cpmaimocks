import { describe, expect, it } from 'vitest'
import { isTimedExamExpired } from '@/lib/exam-expiry'

describe('isTimedExamExpired', () => {
  const startedAt = new Date('2026-09-26T05:00:00Z')

  it('expires exactly at the server deadline', () => {
    expect(isTimedExamExpired(startedAt, 160, new Date('2026-09-26T07:40:00Z'))).toBe(true)
  })

  it('does not expire before the deadline', () => {
    expect(isTimedExamExpired(startedAt, 160, new Date('2026-09-26T07:39:59Z'))).toBe(false)
  })

  it('does not expire an untimed assessment', () => {
    expect(isTimedExamExpired(startedAt, 0, new Date('2026-09-27T07:40:00Z'))).toBe(false)
  })
})
