import { describe, expect, it } from 'vitest'
import {
  FREE_PRACTICE_QUESTION_LIMIT,
  countFreePracticeUsage,
  getFreePracticeAccess,
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
      { totalQuestions: 10, practiceConfig: { certificationId: 'cpmai' } },
      { totalQuestions: 5, practiceConfig: { certificationId: 'cpmai', mode: 'RANDOM' } },
      { totalQuestions: 20, practiceConfig: { certificationId: 'pmp' } },
    ]

    expect(countFreePracticeUsage(attempts, 'cpmai')).toBe(15)
    expect(countFreePracticeUsage(attempts, 'pmp')).toBe(20)
  })

  it('ignores malformed or legacy practice configs without a certification', () => {
    const attempts = [
      { totalQuestions: 10, practiceConfig: null },
      { totalQuestions: 10, practiceConfig: [] },
      { totalQuestions: 10, practiceConfig: { certificationId: 123 } },
      { totalQuestions: 5, practiceConfig: { certificationId: 'cpmai' } },
    ]

    expect(countFreePracticeUsage(attempts, 'cpmai')).toBe(5)
    expect(practiceCertificationId({ certificationId: 'cpmai' })).toBe('cpmai')
    expect(practiceCertificationId({})).toBeNull()
  })

  it('never reports negative remaining questions after the allowance is exhausted', () => {
    expect(getFreePracticeAccess(25)).toEqual({ limit: 25, used: 25, remaining: 0 })
    expect(getFreePracticeAccess(40)).toEqual({ limit: 25, used: 25, remaining: 0 })
  })
})
