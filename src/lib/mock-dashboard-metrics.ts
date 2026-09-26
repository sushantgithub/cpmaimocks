import {
  isFullMockExam,
  mockExamDisplayGroup,
  type MockExamShape,
} from '@/lib/mock-exams'

export interface DashboardMockAttempt {
  score: number | null
  exam: (MockExamShape & { passingScore: number }) | null
}

export interface MockProgressStats {
  examsTaken: number
  examsPassed: number
  averageScore: number
  bestScore: number
}

export interface DashboardMockMetrics {
  fortyQuestion: MockProgressStats
  fullLength: MockProgressStats
}

interface ScoredAttempt {
  score: number
  passingScore: number
}

function summarizeAttempts(attempts: ScoredAttempt[]): MockProgressStats {
  if (attempts.length === 0) {
    return {
      examsTaken: 0,
      examsPassed: 0,
      averageScore: 0,
      bestScore: 0,
    }
  }

  const scores = attempts.map((attempt) => attempt.score)
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length

  return {
    examsTaken: attempts.length,
    examsPassed: attempts.filter((attempt) => attempt.score >= attempt.passingScore).length,
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
  const fortyQuestionAttempts: ScoredAttempt[] = []
  const fullLengthAttempts: ScoredAttempt[] = []

  for (const attempt of attempts) {
    if (!attempt.exam || !isFullMockExam(attempt.exam)) continue

    const scoredAttempt = {
      score: attempt.score ?? 0,
      passingScore: attempt.exam.passingScore,
    }
    const group = mockExamDisplayGroup(attempt.exam.questionCount)

    if (group === 'FORTY_QUESTION') {
      fortyQuestionAttempts.push(scoredAttempt)
    } else if (group === 'FULL_LENGTH') {
      fullLengthAttempts.push(scoredAttempt)
    }
  }

  return {
    fortyQuestion: summarizeAttempts(fortyQuestionAttempts),
    fullLength: summarizeAttempts(fullLengthAttempts),
  }
}
