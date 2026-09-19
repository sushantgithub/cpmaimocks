import { describe, expect, it } from 'vitest'
import { answerForFinalScoring, latestCheckedVerdicts, nextReviewIndex, questionHistoryState } from './exam-progress'

describe('learning mock progress rules', () => {
  it('treats incorrect and unanswered history as missed', () => {
    const latest = new Map<string, boolean | null>([
      ['wrong', false],
      ['skipped', null],
      ['right', true],
    ])

    expect(questionHistoryState(latest, 'wrong')).toBe('missed')
    expect(questionHistoryState(latest, 'skipped')).toBe('missed')
    expect(questionHistoryState(latest, 'right')).toBe('correct')
    expect(questionHistoryState(latest, 'new')).toBe('unseen')
  })

  it('scores only checked answers in immediate-feedback mocks', () => {
    expect(answerForFinalScoring({
      showExplanations: true,
      storedAnswer: 'B',
      storedIsCorrect: null,
      browserAnswer: 'B',
      expired: false,
    })).toBeNull()

    expect(answerForFinalScoring({
      showExplanations: true,
      storedAnswer: 'C',
      storedIsCorrect: true,
      browserAnswer: 'A',
      expired: false,
    })).toBe('C')
  })

  it('keeps traditional exam browser and expiry behavior', () => {
    expect(answerForFinalScoring({
      showExplanations: false,
      storedAnswer: 'A',
      storedIsCorrect: null,
      browserAnswer: 'B',
      expired: false,
    })).toBe('B')

    expect(answerForFinalScoring({
      showExplanations: false,
      storedAnswer: 'A',
      storedIsCorrect: null,
      browserAnswer: 'B',
      expired: true,
    })).toBe('A')
  })

  it('uses the latest checked verdict for dashboard progress', () => {
    const latest = latestCheckedVerdicts([
      { questionId: 'q1', isCorrect: false },
      { questionId: 'q2', isCorrect: true },
      { questionId: 'draft', isCorrect: null },
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: false },
    ])

    expect(latest.size).toBe(2)
    expect(latest.get('q1')).toBe(true)
    expect(latest.get('q2')).toBe(false)
    expect(latest.has('draft')).toBe(false)
  })

  it('moves forward through pending review questions and finishes without wrapping', () => {
    expect(nextReviewIndex(5, [5, 7, 9])).toBe(7)
    expect(nextReviewIndex(7, [7, 9])).toBe(9)
    expect(nextReviewIndex(9, [9])).toBeNull()
    expect(nextReviewIndex(9, [5, 9])).toBeNull()
  })
})
