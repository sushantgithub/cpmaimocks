import { describe, expect, it } from 'vitest'
import { freeQuizAttemptState, readQuizAttemptConfig } from './quiz-entitlement'

describe('quiz entitlement helpers', () => {
  it('reads only valid quiz attempt metadata', () => {
    expect(readQuizAttemptConfig({
      quizKey: 'domain:abc_123',
      quizTitle: 'Responsible AI',
      accessTier: 'FREE',
    })).toEqual({
      quizKey: 'domain:abc_123',
      quizTitle: 'Responsible AI',
      accessTier: 'FREE',
    })

    expect(readQuizAttemptConfig({ quizKey: 'not-a-quiz' })).toBeNull()
    expect(readQuizAttemptConfig(null)).toBeNull()
  })

  it('resumes the one active free sitting instead of granting another', () => {
    expect(freeQuizAttemptState([
      { id: 'a1', status: 'IN_PROGRESS' },
    ])).toEqual({ locked: false, activeAttemptId: 'a1' })
  })

  it('locks the free quiz after a sitting is completed or abandoned', () => {
    expect(freeQuizAttemptState([
      { id: 'old', status: 'COMPLETED' },
      { id: 'duplicate', status: 'IN_PROGRESS' },
    ])).toEqual({ locked: true, activeAttemptId: null })

    expect(freeQuizAttemptState([
      { id: 'old', status: 'ABANDONED' },
    ])).toEqual({ locked: true, activeAttemptId: null })
  })

  it('allows a first free sitting when no quiz attempt exists', () => {
    expect(freeQuizAttemptState([])).toEqual({ locked: false, activeAttemptId: null })
  })
})
