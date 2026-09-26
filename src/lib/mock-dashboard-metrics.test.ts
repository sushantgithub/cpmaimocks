import { describe, expect, it } from 'vitest'
import { dashboardMockMetrics } from '@/lib/mock-dashboard-metrics'

describe('dashboardMockMetrics', () => {
  it('keeps 40-question mock stats separate from full-length mock stats', () => {
    const result = dashboardMockMetrics([
      {
        score: 5,
        exam: { questionCount: 40, questionsPerAttempt: null, timeLimitMinutes: 50, passingScore: 75 },
      },
      {
        score: 35,
        exam: { questionCount: 40, questionsPerAttempt: null, timeLimitMinutes: 50, passingScore: 75 },
      },
      {
        score: 32.5,
        exam: { questionCount: 40, questionsPerAttempt: null, timeLimitMinutes: 50, passingScore: 75 },
      },
      {
        score: 70,
        exam: { questionCount: 120, questionsPerAttempt: null, timeLimitMinutes: 120, passingScore: 70 },
      },
      {
        score: 80,
        exam: { questionCount: 120, questionsPerAttempt: null, timeLimitMinutes: 120, passingScore: 70 },
      },
    ])

    expect(result.fortyQuestion).toEqual({
      examsTaken: 3,
      examsPassed: 0,
      averageScore: 24.2,
      bestScore: 35,
    })
    expect(result.fullLength).toEqual({
      examsTaken: 2,
      examsPassed: 2,
      averageScore: 75,
      bestScore: 80,
    })
  })

  it('counts passing attempts using each Mock Exam passing score', () => {
    const result = dashboardMockMetrics([
      {
        score: 74.9,
        exam: { questionCount: 40, questionsPerAttempt: null, timeLimitMinutes: 50, passingScore: 75 },
      },
      {
        score: 75,
        exam: { questionCount: 40, questionsPerAttempt: null, timeLimitMinutes: 50, passingScore: 75 },
      },
      {
        score: 90,
        exam: { questionCount: 40, questionsPerAttempt: null, timeLimitMinutes: 50, passingScore: 80 },
      },
    ])

    expect(result.fortyQuestion.examsPassed).toBe(2)
  })

  it('excludes untimed, sampled, and other-size mocks from both dashboard sections', () => {
    const result = dashboardMockMetrics([
      {
        score: 90,
        exam: { questionCount: 40, questionsPerAttempt: null, timeLimitMinutes: 0, passingScore: 75 },
      },
      {
        score: 90,
        exam: { questionCount: 120, questionsPerAttempt: 10, timeLimitMinutes: 120, passingScore: 70 },
      },
      {
        score: 90,
        exam: { questionCount: 60, questionsPerAttempt: null, timeLimitMinutes: 60, passingScore: 75 },
      },
      {
        score: 90,
        exam: null,
      },
    ])

    expect(result.fortyQuestion).toEqual({
      examsTaken: 0,
      examsPassed: 0,
      averageScore: 0,
      bestScore: 0,
    })
    expect(result.fullLength).toEqual({
      examsTaken: 0,
      examsPassed: 0,
      averageScore: 0,
      bestScore: 0,
    })
  })

  it('uses zero for a completed attempt with a missing score', () => {
    const result = dashboardMockMetrics([
      {
        score: null,
        exam: { questionCount: 40, questionsPerAttempt: null, timeLimitMinutes: 50, passingScore: 75 },
      },
    ])

    expect(result.fortyQuestion).toEqual({
      examsTaken: 1,
      examsPassed: 0,
      averageScore: 0,
      bestScore: 0,
    })
  })
})
