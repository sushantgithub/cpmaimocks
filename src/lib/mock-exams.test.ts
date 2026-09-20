import { describe, expect, it } from 'vitest'
import { isFullMockExam } from './mock-exams'

describe('isFullMockExam', () => {
  it('accepts a timed exam that serves its full pool', () => {
    expect(isFullMockExam({
      questionCount: 120,
      questionsPerAttempt: null,
      timeLimitMinutes: 180,
    })).toBe(true)
  })

  it('rejects a sampled domain learning mock', () => {
    expect(isFullMockExam({
      questionCount: 60,
      questionsPerAttempt: 10,
      timeLimitMinutes: 0,
    })).toBe(false)
  })

  it('rejects timed sampled pools so they do not appear as full mocks', () => {
    expect(isFullMockExam({
      questionCount: 60,
      questionsPerAttempt: 10,
      timeLimitMinutes: 60,
    })).toBe(false)
  })
})
