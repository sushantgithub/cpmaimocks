import { describe, expect, it } from 'vitest'
import {
  firstUnansweredQuestionIndex,
  mergeQuizResumePosition,
  resolveQuizResumeQuestionIndex,
} from './quiz-resume'

describe('quiz resume position', () => {
  it('falls back to the first unanswered question for legacy attempts', () => {
    expect(
      firstUnansweredQuestionIndex(['A', 'B', 'C', null, null]),
    ).toBe(3)
  })

  it('uses the exact saved question even when an earlier question was skipped', () => {
    expect(
      resolveQuizResumeQuestionIndex(3, ['A', null, 'C', null, null]),
    ).toBe(3)
  })

  it('ignores an invalid saved position and falls back safely', () => {
    expect(
      resolveQuizResumeQuestionIndex(99, ['A', 'B', null, null]),
    ).toBe(2)
    expect(
      resolveQuizResumeQuestionIndex(-1, ['A', null]),
    ).toBe(1)
  })

  it('opens the final question when every answer is already checked but submission is pending', () => {
    expect(
      resolveQuizResumeQuestionIndex(undefined, ['A', 'B', 'C']),
    ).toBe(2)
  })

  it('preserves existing quiz metadata while updating resume position', () => {
    expect(
      mergeQuizResumePosition(
        {
          quizKey: 'domain:abc',
          quizNumber: 3,
          questionIds: ['q1', 'q2'],
        },
        1,
      ),
    ).toEqual({
      quizKey: 'domain:abc',
      quizNumber: 3,
      questionIds: ['q1', 'q2'],
      resumeQuestionIndex: 1,
    })
  })
})
