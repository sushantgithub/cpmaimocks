import { describe, expect, it } from 'vitest'
import {
  fixedQuizQuestionSet,
  freeQuizAttemptState,
  questionCountForQuiz,
  quizCountForQuestions,
  readQuizAttemptConfig,
  previousQuizAllowsNext,
  isFullyAnsweredQuizAttempt,
  latestQuizVerdicts,
  countsAsFullQuizAttempt,
} from './quiz-entitlement'

describe('quiz entitlement helpers', () => {
  it('reads valid fixed-quiz metadata', () => {
    expect(readQuizAttemptConfig({
      quizKey: 'domain:abc_123',
      quizTitle: 'Responsible AI · Quiz 2',
      accessTier: 'PAID',
      quizNumber: 2,
      sessionKind: 'STANDARD',
      questionIds: ['q1', 'q2', 'q2'],
    })).toEqual({
      quizKey: 'domain:abc_123',
      quizTitle: 'Responsible AI · Quiz 2',
      accessTier: 'PAID',
      quizNumber: 2,
      sessionKind: 'STANDARD',
      questionIds: ['q1', 'q2'],
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

  it('splits sixty questions into six ten-question quizzes', () => {
    expect(quizCountForQuestions(60)).toBe(6)
    expect(questionCountForQuiz(60, 1)).toBe(10)
    expect(questionCountForQuiz(60, 6)).toBe(10)
    expect(quizCountForQuestions(64)).toBe(7)
    expect(questionCountForQuiz(64, 7)).toBe(4)
  })

  it('unlocks the next quiz only after the previous full quiz is completely answered', () => {
    const complete = isFullyAnsweredQuizAttempt({
      status: 'COMPLETED',
      totalQuestions: 10,
      unansweredCount: 0,
      answers: Array.from({ length: 10 }, (_, index) => ({
        questionId: 'q' + (index + 1),
        isCorrect: index < 8,
      })),
    })
    const incomplete = isFullyAnsweredQuizAttempt({
      status: 'COMPLETED',
      totalQuestions: 10,
      unansweredCount: 2,
      answers: Array.from({ length: 8 }, (_, index) => ({
        questionId: 'q' + (index + 1),
        isCorrect: index < 6,
      })),
    })

    expect(previousQuizAllowsNext(complete, false)).toBe(true)
    expect(previousQuizAllowsNext(incomplete, false)).toBe(false)
    expect(previousQuizAllowsNext(complete, true)).toBe(false)
  })

  it('treats a submitted quiz with unanswered questions as incomplete', () => {
    expect(isFullyAnsweredQuizAttempt({
      status: 'COMPLETED',
      totalQuestions: 10,
      unansweredCount: 2,
      answers: Array.from({ length: 8 }, (_, index) => ({
        questionId: 'q' + (index + 1),
        isCorrect: index < 3,
      })),
    })).toBe(false)

    expect(isFullyAnsweredQuizAttempt({
      status: 'COMPLETED',
      totalQuestions: 10,
      unansweredCount: 0,
      answers: Array.from({ length: 10 }, (_, index) => ({
        questionId: 'q' + (index + 1),
        isCorrect: index < 5,
      })),
    })).toBe(true)
  })

  it('uses the latest checked verdict per question across full quiz attempts', () => {
    const latest = latestQuizVerdicts([
      {
        answers: [
          { questionId: 'q1', isCorrect: false },
          { questionId: 'q2', isCorrect: true },
          { questionId: 'q3', isCorrect: false },
        ],
      },
      {
        answers: [
          { questionId: 'q1', isCorrect: true },
          { questionId: 'q2', isCorrect: false },
          { questionId: 'q3', isCorrect: null },
        ],
      },
    ])

    expect(Array.from(latest.entries())).toEqual([
      ['q1', true],
      ['q2', false],
      ['q3', false],
    ])
  })

  it('counts only STANDARD sessions as full quiz attempts', () => {
    expect(countsAsFullQuizAttempt('STANDARD')).toBe(true)
    expect(countsAsFullQuizAttempt('INCORRECT_RETRY')).toBe(false)
    expect(countsAsFullQuizAttempt('MIXED_REVIEW')).toBe(false)
  })

  it('reuses an assigned quiz set and fills only from unassigned questions', () => {
    const pool = ['q1', 'q2', 'q3', 'q4', 'q5']
    expect(fixedQuizQuestionSet(['q2', 'q1'], pool, ['q4'], 3)).toEqual([
      'q2',
      'q1',
      'q3',
    ])
    expect(fixedQuizQuestionSet([], pool, ['q1', 'q2'], 2)).toEqual(['q3', 'q4'])
  })
})
