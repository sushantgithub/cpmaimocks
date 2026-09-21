import type { QuizSummary } from './quizzes'

export interface DashboardQuizMetrics {
  completedQuizzes: number
  quizCount: number
  questionsAttempted: number
  questionsMastered: number
  accuracy: number
}

export function dashboardQuizMetrics(quizzes: QuizSummary[]): DashboardQuizMetrics {
  const completedQuizzes = quizzes.reduce(
    (sum, quiz) => sum + quiz.completedQuizzes,
    0,
  )
  const quizCount = quizzes.reduce((sum, quiz) => sum + quiz.quizCount, 0)

  // Slot-level counts come from each learner's canonical fixed quiz set.
  // This keeps dashboard progress stable even if the current published pool
  // later changes or a completed quiz is retaken.
  const questionsAttempted = quizzes.reduce(
    (sum, quiz) =>
      sum + quiz.slots.reduce((slotSum, slot) => slotSum + slot.answeredCount, 0),
    0,
  )
  const questionsMastered = quizzes.reduce(
    (sum, quiz) =>
      sum + quiz.slots.reduce((slotSum, slot) => slotSum + slot.masteredCount, 0),
    0,
  )

  const accuracy =
    questionsAttempted > 0
      ? Math.round((questionsMastered / questionsAttempted) * 100)
      : 0

  return {
    completedQuizzes,
    quizCount,
    questionsAttempted,
    questionsMastered,
    accuracy,
  }
}
