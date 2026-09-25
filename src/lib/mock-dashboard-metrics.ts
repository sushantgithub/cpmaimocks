import {
  isFullMockExam,
  mockExamDisplayGroup,
  type MockExamShape,
} from '@/lib/mock-exams'

export interface DashboardMockAttempt {
  score: number | null
  exam: MockExamShape | null
}

export interface MockProgressStats {
  examsTaken: number
  averageScore: number
  bestScore: number
}

export interface DashboardMockMetrics {
  fortyQuestion: MockProgressStats
  fullLength: MockProgressStats
}

function summarizeScores(scores: number[]): MockProgressStats {
  if (scores.length === 0) {
    return {
      examsTaken: 0,
      averageScore: 0,
      bestScore: 0,
    }
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length

  return {
    examsTaken: scores.length,
    averageScore: Math.round(average * 10) / 10,
    bestScore: Math.round(Math.max(...scores) * 10) / 10,
  }
}

/**
 * Dashboard Mock statistics intentionally keep 40-question mocks separate
 * from full-length mocks. Quiz and Practice attempts never reach this helper,
 * and legacy sampled/untimed mock records are rejected by isFullMockExam.
 */
export function dashboardMockMetrics(
  attempts: DashboardMockAttempt[],
): DashboardMockMetrics {
  const fortyQuestionScores: number[] = []
  const fullLengthScores: number[] = []

  for (const attempt of attempts) {
    if (!attempt.exam || !isFullMockExam(attempt.exam)) continue

    const score = attempt.score ?? 0
    const group = mockExamDisplayGroup(attempt.exam.questionCount)

    if (group === 'FORTY_QUESTION') {
      fortyQuestionScores.push(score)
    } else if (group === 'FULL_LENGTH') {
      fullLengthScores.push(score)
    }
  }

  return {
    fortyQuestion: summarizeScores(fortyQuestionScores),
    fullLength: summarizeScores(fullLengthScores),
  }
}
