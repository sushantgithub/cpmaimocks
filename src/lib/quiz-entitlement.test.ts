import { describe, expect, it } from 'vitest'
import {
  fixedQuizQuestionSet,
  freeQuizAttemptState,
  questionCountForQuiz,
  quizCountForQuestions,
  readQuizAttemptConfig,
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
