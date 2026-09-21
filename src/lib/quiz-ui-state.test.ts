import { describe, expect, it } from 'vitest'
import {
  initialExpandedQuizSlotKeys,
  quizSlotExpansionKey,
  quizSlotStatusLabel,
} from './quiz-ui-state'

describe('quiz slot status labels', () => {
  const base = {
    completed: false,
    attemptCount: 0,
    activeAttemptId: null,
    activeRetryAttemptId: null,
    lockReason: null,
    number: 1,
    premiumAccess: true,
  }

  it('uses a positive learning label after an unsuccessful full attempt', () => {
    expect(quizSlotStatusLabel({ ...base, attemptCount: 4 })).toBe('Keep Practicing')
  })

  it('does not show a redundant status badge for active incomplete sessions', () => {
    expect(quizSlotStatusLabel({ ...base, activeAttemptId: 'attempt-1' })).toBeNull()
    expect(quizSlotStatusLabel({
      ...base,
      attemptCount: 2,
      activeRetryAttemptId: 'retry-1',
    })).toBeNull()
  })

  it('keeps Completed authoritative even if a stale or later attempt is active', () => {
    expect(quizSlotStatusLabel({
      ...base,
      completed: true,
      attemptCount: 3,
      activeAttemptId: 'retake-1',
    })).toBe('Completed')
    expect(quizSlotStatusLabel({
      ...base,
      completed: true,
      attemptCount: 3,
      activeRetryAttemptId: 'legacy-retry-1',
    })).toBe('Completed')
  })

  it('keeps completed, free and available states distinct', () => {
    expect(quizSlotStatusLabel({ ...base, completed: true, attemptCount: 1 })).toBe('Completed')
    expect(quizSlotStatusLabel({ ...base, premiumAccess: false })).toBe('Free')
    expect(quizSlotStatusLabel({ ...base, number: 2 })).toBe('Available')
  })
})

describe('quiz slot expansion state', () => {
  it('keeps completed quizzes collapsed and expands the next actionable quiz', () => {
    expect(initialExpandedQuizSlotKeys([
      {
        key: 'domain:ai',
        slots: [
          {
            number: 1,
            completed: true,
            lockReason: null,
            activeAttemptId: null,
            activeRetryAttemptId: null,
          },
          {
            number: 2,
            completed: false,
            lockReason: null,
            activeAttemptId: null,
            activeRetryAttemptId: null,
          },
          {
            number: 3,
            completed: false,
            lockReason: 'PREVIOUS',
            activeAttemptId: null,
            activeRetryAttemptId: null,
          },
        ],
      },
    ])).toEqual([quizSlotExpansionKey('domain:ai', 2)])
  })

  it('expands an active full quiz ahead of any other available quiz', () => {
    expect(initialExpandedQuizSlotKeys([
      {
        key: 'domain:ai',
        slots: [
          {
            number: 1,
            completed: true,
            lockReason: null,
            activeAttemptId: 'attempt-1',
            activeRetryAttemptId: null,
          },
          {
            number: 2,
            completed: false,
            lockReason: null,
            activeAttemptId: null,
            activeRetryAttemptId: null,
          },
        ],
      },
    ])).toEqual([quizSlotExpansionKey('domain:ai', 1)])
  })

  it('expands active mistake practice but leaves fully locked domains collapsed', () => {
    expect(initialExpandedQuizSlotKeys([
      {
        key: 'domain:ai',
        slots: [
          {
            number: 1,
            completed: true,
            lockReason: null,
            activeAttemptId: null,
            activeRetryAttemptId: 'retry-1',
          },
        ],
      },
      {
        key: 'domain:locked',
        slots: [
          {
            number: 1,
            completed: false,
            lockReason: 'SUBSCRIPTION',
            activeAttemptId: null,
            activeRetryAttemptId: null,
          },
        ],
      },
    ])).toEqual([quizSlotExpansionKey('domain:ai', 1)])
  })
})
