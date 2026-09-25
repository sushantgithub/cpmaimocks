import { describe, expect, it } from 'vitest'
import {
  firstUnansweredQuestionIndex,
  mergeQuizResumePosition,
  resolveQuizResumeQuestionIndex,
} from './quiz-resume'

describe('quiz resume position', () => {
  it('resumes at the first unanswered question', () => {
    expect(
      firstUnansweredQuestionIndex(['A', 'B', 'C', null, null]),
    ).toBe(3)
  })

  it('does not reopen an already-answered saved position', () => {
    expect(
      resolveQuizResumeQuestionIndex(0, ['A', null, null, null]),
    ).toBe(1)
  })

  it('returns the earliest unanswered question even if a later position was saved', () => {
    expect(
      resolveQuizResumeQuestionIndex(3, ['A', null, 'C', null, null]),
    ).toBe(1)
  })

  it('ignores invalid saved positions and resumes safely', () => {
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
