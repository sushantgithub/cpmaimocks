import { describe, expect, it } from 'vitest'
import { hasRemainingFreeQuizSession } from './free-quiz-access'

describe('hasRemainingFreeQuizSession', () => {
  it('returns true when at least one quiz still has a free sitting available', () => {
    expect(hasRemainingFreeQuizSession([
      { locked: true, mastered: false },
      { locked: false, mastered: false },
    ])).toBe(true)
  })

  it('returns false when every available quiz is locked or already mastered', () => {
    expect(hasRemainingFreeQuizSession([
      { locked: true, mastered: false },
      { locked: false, mastered: true },
    ])).toBe(false)
  })

  it('returns false when there are no published quizzes', () => {
    expect(hasRemainingFreeQuizSession([])).toBe(false)
  })
})
