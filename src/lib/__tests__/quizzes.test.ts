import { describe, expect, it } from 'vitest'
import {
  fixedQuizQuestionSet,
  questionCountForQuiz,
  quizCountForQuestions,
} from '@/lib/quiz-entitlement'

describe('fixed domain quiz slots', () => {
  it('splits a 60-question domain into six 10-question quizzes', () => {
    expect(quizCountForQuestions(60)).toBe(6)
    expect(questionCountForQuiz(60, 1)).toBe(10)
    expect(questionCountForQuiz(60, 6)).toBe(10)
  })

  it('keeps the same assigned questions on a retake', () => {
    const pool = ['q1', 'q2', 'q3', 'q4', 'q5']
    expect(fixedQuizQuestionSet(['q2', 'q1'], pool, ['q4'], 3)).toEqual([
      'q2',
      'q1',
      'q3',
    ])
  })

  it('uses unassigned questions for a new quiz before allowing overlap', () => {
    const pool = ['q1', 'q2', 'q3', 'q4', 'q5']
    expect(fixedQuizQuestionSet([], pool, ['q1', 'q2'], 2)).toEqual(['q3', 'q4'])
  })

  it('handles a final partial quiz without exceeding the pool', () => {
    expect(quizCountForQuestions(25)).toBe(3)
    expect(questionCountForQuiz(25, 1)).toBe(10)
    expect(questionCountForQuiz(25, 2)).toBe(10)
    expect(questionCountForQuiz(25, 3)).toBe(5)

    expect(quizCountForQuestions(64)).toBe(7)
    expect(questionCountForQuiz(64, 7)).toBe(4)
  })
})
