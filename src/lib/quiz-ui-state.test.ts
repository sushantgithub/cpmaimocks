import { describe, expect, it } from 'vitest'
import {
  initialExpandedQuizSlotKeys,
  quizSlotExpansionKey,
} from './quiz-ui-state'

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
