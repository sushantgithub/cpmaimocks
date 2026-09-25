import { describe, expect, it } from 'vitest'
import { resumeQuestionIndex } from '@/lib/exam-resume-position'

describe('resumeQuestionIndex', () => {
  it('resumes at the first unanswered question', () => {
    expect(
      resumeQuestionIndex(
        ['q1', 'q2', 'q3', 'q4', 'q5'],
        ['q1', 'q2', 'q3'],
      ),
    ).toBe(3)
  })

  it('handles gaps by returning the earliest unanswered question', () => {
    expect(
      resumeQuestionIndex(
        ['q1', 'q2', 'q3', 'q4'],
        ['q1', 'q3'],
      ),
    ).toBe(1)
  })

  it('resumes on the last question when every question is answered', () => {
    expect(
      resumeQuestionIndex(
        ['q1', 'q2', 'q3'],
        ['q1', 'q2', 'q3'],
      ),
    ).toBe(2)
  })

  it('handles a 120-question full-length mock the same way', () => {
    const questionIds = Array.from({ length: 120 }, (_, index) => `q${index + 1}`)
    const answered = questionIds.slice(0, 47)

    expect(resumeQuestionIndex(questionIds, answered)).toBe(47)
  })

  it('returns zero for an empty question list', () => {
    expect(resumeQuestionIndex([], [])).toBe(0)
  })
})
