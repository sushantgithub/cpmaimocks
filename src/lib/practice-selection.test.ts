import { describe, expect, it } from 'vitest'
import { selectRandomPracticeQuestionIds } from './practice-selection'

const noShuffle = () => 0.999999

describe('Random Practice question selection', () => {
  it('serves unseen questions before any previously seen question', () => {
    const selected = selectRandomPracticeQuestionIds(
      ['q1', 'q2', 'q3', 'q4', 'q5'],
      [
        { questionId: 'q1', isCorrect: false },
        { questionId: 'q2', isCorrect: true },
      ],
      3,
      noShuffle,
    )

    expect(selected).toEqual(['q3', 'q4', 'q5'])
  })

  it('gives the next session different questions while unseen questions remain', () => {
    const pool = Array.from({ length: 10 }, (_, index) => `q${index + 1}`)
    const first = selectRandomPracticeQuestionIds(pool, [], 5, noShuffle)

    const second = selectRandomPracticeQuestionIds(
      pool,
      first.map((questionId) => ({ questionId, isCorrect: null })),
      5,
      noShuffle,
    )

    expect(first).toEqual(['q1', 'q2', 'q3', 'q4', 'q5'])
    expect(second).toEqual(['q6', 'q7', 'q8', 'q9', 'q10'])
    expect(second.some((id) => first.includes(id))).toBe(false)
  })

  it('fills from missed questions before previously correct questions when unseen runs out', () => {
    const selected = selectRandomPracticeQuestionIds(
      ['new', 'wrong', 'unanswered', 'right'],
      [
        { questionId: 'wrong', isCorrect: false },
        { questionId: 'unanswered', isCorrect: null },
        { questionId: 'right', isCorrect: true },
      ],
      4,
      noShuffle,
    )

    expect(selected).toEqual(['new', 'wrong', 'unanswered', 'right'])
  })

  it('uses the latest checked verdict while still treating any served question as seen', () => {
    const selected = selectRandomPracticeQuestionIds(
      ['q1', 'q2', 'q3'],
      [
        { questionId: 'q1', isCorrect: false },
        { questionId: 'q1', isCorrect: true },
        { questionId: 'q2', isCorrect: true },
        { questionId: 'q2', isCorrect: false },
        { questionId: 'q3', isCorrect: null },
      ],
      3,
      noShuffle,
    )

    // q2 is currently missed; q3 was served but never checked, so it is also
    // review material. q1 was ultimately corrected and is the last fallback.
    expect(selected).toEqual(['q2', 'q3', 'q1'])
  })

  it('does not repeat duplicate pool ids and never exceeds the requested count', () => {
    const selected = selectRandomPracticeQuestionIds(
      ['q1', 'q1', 'q2', 'q3'],
      [],
      2,
      noShuffle,
    )

    expect(selected).toEqual(['q1', 'q2'])
    expect(new Set(selected).size).toBe(selected.length)
  })

  it('returns every available question at most once when the request exceeds the pool', () => {
    expect(
      selectRandomPracticeQuestionIds(['q1', 'q2'], [], 25, noShuffle),
    ).toEqual(['q1', 'q2'])
  })
})
