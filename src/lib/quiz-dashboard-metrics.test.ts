import { describe, expect, it } from 'vitest'
import { dashboardQuizMetrics } from './quiz-dashboard-metrics'
import type { QuizSummary } from './quizzes'

function quizWithSlots(
  slots: Array<{
    completed: boolean
    questionCount: number
    answeredCount: number
    masteredCount: number
  }>,
): QuizSummary {
  return {
    key: 'domain:test',
    title: 'Test Domain',
    description: null,
    certificationId: 'cert-1',
    certificationName: 'CPMAI',
    total: 60,
    answered: 0,
    wrong: 0,
    mastered: false,
    locked: false,
    activeAttemptId: null,
    premiumAccess: true,
    quizCount: slots.length,
    completedQuizzes: slots.filter((slot) => slot.completed).length,
    mixedReviewAvailable: false,
    slots: slots.map((slot, index) => ({
      number: index + 1,
      questionCount: slot.questionCount,
      completed: slot.completed,
      activeAttemptId: null,
      activeRetryAttemptId: null,
      latestAttemptId: null,
      latestScore: null,
      bestScore: null,
      latestIncorrect: 0,
      answeredCount: slot.answeredCount,
      masteredCount: slot.masteredCount,
      attemptCount: 0,
      history: [],
      lockReason: null,
    })),
  }
}

describe('dashboard quiz metrics', () => {
  it('credits all 30 mastered questions when three 10-question quizzes are completed', () => {
    const summary = quizWithSlots([
      { completed: true, questionCount: 10, answeredCount: 10, masteredCount: 10 },
      { completed: true, questionCount: 10, answeredCount: 10, masteredCount: 10 },
      { completed: true, questionCount: 10, answeredCount: 10, masteredCount: 10 },
      { completed: false, questionCount: 10, answeredCount: 0, masteredCount: 0 },
      { completed: false, questionCount: 10, answeredCount: 0, masteredCount: 0 },
      { completed: false, questionCount: 10, answeredCount: 0, masteredCount: 0 },
    ])

    expect(dashboardQuizMetrics([summary])).toEqual({
      completedQuizzes: 3,
      quizCount: 6,
      questionsAttempted: 30,
      questionsMastered: 30,
      accuracy: 100,
    })
  })

  it('uses canonical slot progress rather than stale aggregate pool counts', () => {
    const summary = quizWithSlots([
      { completed: true, questionCount: 10, answeredCount: 10, masteredCount: 10 },
      { completed: true, questionCount: 10, answeredCount: 10, masteredCount: 10 },
      { completed: true, questionCount: 10, answeredCount: 10, masteredCount: 10 },
    ])

    // Simulate the old aggregate becoming stale because three canonical
    // question IDs are no longer in the current published pool.
    summary.answered = 27
    summary.wrong = 0

    expect(dashboardQuizMetrics([summary]).questionsMastered).toBe(30)
    expect(dashboardQuizMetrics([summary]).questionsAttempted).toBe(30)
  })

  it('includes partial progress from the next incomplete quiz', () => {
    const summary = quizWithSlots([
      { completed: true, questionCount: 10, answeredCount: 10, masteredCount: 10 },
      { completed: true, questionCount: 10, answeredCount: 10, masteredCount: 10 },
      { completed: false, questionCount: 10, answeredCount: 6, masteredCount: 4 },
    ])

    expect(dashboardQuizMetrics([summary])).toEqual({
      completedQuizzes: 2,
      quizCount: 3,
      questionsAttempted: 26,
      questionsMastered: 24,
      accuracy: 92,
    })
  })
})
