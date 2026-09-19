import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ prisma: {} }))
vi.mock('@/lib/subscription', () => ({ hasAccessToCertification: vi.fn() }))

import { verdicts, pickForSitting, QUIZ_QUESTIONS_PER_SITTING, QUIZ_FREE_QUESTION_LIMIT } from '@/lib/quizzes'

describe('verdicts', () => {
  it('keeps the latest answer for a question', () => {
    const v = verdicts([
      { questionId: 'q1', isCorrect: false },
      { questionId: 'q1', isCorrect: true },
    ])
    expect(v.get('q1')).toBe(true)
  })

  it('treats an unscored answer as wrong rather than mastered', () => {
    expect(verdicts([{ questionId: 'q1', isCorrect: null }]).get('q1')).toBe(false)
  })

  it('counts each question once however often it was answered', () => {
    const v = verdicts([
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: false },
    ])
    expect(v.size).toBe(2)
  })
})

describe('pickForSitting', () => {
  it('serves unseen questions before ones answered wrongly', () => {
    expect(pickForSitting(['a', 'b'], ['x', 'y'], 3)).toEqual(['a', 'b', 'x'])
  })

  it('falls back to wrong answers once nothing is unseen', () => {
    expect(pickForSitting([], ['x', 'y'], 10)).toEqual(['x', 'y'])
  })

  it('never serves more than the budget', () => {
    const unseen = Array.from({ length: 50 }, (_, i) => `q${i}`)
    expect(pickForSitting(unseen, [], QUIZ_QUESTIONS_PER_SITTING)).toHaveLength(10)
  })

  it('returns nothing when the free allowance is spent', () => {
    expect(pickForSitting(['a'], ['x'], 0)).toEqual([])
    expect(pickForSitting(['a'], ['x'], -3)).toEqual([])
  })

  it('caps a free user at their remaining allowance', () => {
    const remaining = QUIZ_FREE_QUESTION_LIMIT - 7
    expect(pickForSitting(['a','b','c','d','e'], [], remaining)).toHaveLength(3)
  })

  it('is empty when a quiz is mastered, since both lists are', () => {
    expect(pickForSitting([], [], QUIZ_QUESTIONS_PER_SITTING)).toEqual([])
  })
})
