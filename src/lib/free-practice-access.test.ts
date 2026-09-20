import { describe, expect, it } from 'vitest'
import {
  FREE_PRACTICE_QUESTION_LIMIT,
  countFreePracticeUsage,
  getFreePracticeAccess,
  practiceAccessTier,
  practiceCertificationId,
} from './free-practice-access'

describe('free practice access', () => {
  it('provides 25 lifetime practice questions per certification', () => {
    expect(FREE_PRACTICE_QUESTION_LIMIT).toBe(25)
    expect(getFreePracticeAccess(0)).toEqual({ limit: 25, used: 0, remaining: 25 })
    expect(getFreePracticeAccess(20)).toEqual({ limit: 25, used: 20, remaining: 5 })
  })

  it('counts only attempts for the selected certification', () => {
    const attempts = [
      { totalQuestions: 10, practiceConfig: { certificationId: 'cpmai', accessTier: 'FREE' } },
      { totalQuestions: 5, practiceConfig: { certificationId: 'cpmai', accessTier: 'FREE', mode: 'RANDOM' } },
      { totalQuestions: 20, practiceConfig: { certificationId: 'pmp', accessTier: 'FREE' } },
    ]

    expect(countFreePracticeUsage(attempts, 'cpmai')).toBe(15)
    expect(countFreePracticeUsage(attempts, 'pmp')).toBe(20)
  })

  it('does not consume the free allowance for practice taken while premium', () => {
    const attempts = [
      { totalQuestions: 10, practiceConfig: { certificationId: 'cpmai', accessTier: 'FREE' } },
      { totalQuestions: 50, practiceConfig: { certificationId: 'cpmai', accessTier: 'PREMIUM' } },
    ]

    expect(countFreePracticeUsage(attempts, 'cpmai')).toBe(10)
    expect(practiceAccessTier(attempts[0].practiceConfig)).toBe('FREE')
    expect(practiceAccessTier(attempts[1].practiceConfig)).toBe('PREMIUM')
  })

  it('ignores malformed and legacy configs that predate the free allowance policy', () => {
    const attempts = [
      { totalQuestions: 10, practiceConfig: null },
      { totalQuestions: 10, practiceConfig: [] },
      { totalQuestions: 10, practiceConfig: { certificationId: 123 } },
      { totalQuestions: 5, practiceConfig: { certificationId: 'cpmai' } },
    ]

    expect(countFreePracticeUsage(attempts, 'cpmai')).toBe(0)
    expect(practiceCertificationId({ certificationId: 'cpmai' })).toBe('cpmai')
    expect(practiceCertificationId({})).toBeNull()
    expect(practiceAccessTier({})).toBeNull()
  })

  it('never reports negative remaining questions after the allowance is exhausted', () => {
    expect(getFreePracticeAccess(25)).toEqual({ limit: 25, used: 25, remaining: 0 })
    expect(getFreePracticeAccess(40)).toEqual({ limit: 25, used: 25, remaining: 0 })
  })
})
