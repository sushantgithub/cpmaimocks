import { describe, expect, it } from 'vitest'
import { buildUnansweredQueue, finishNeedsConfirmation, reviewQueueTarget } from './review-unanswered'

describe('unanswered review queue', () => {
  it('captures only unanswered questions in their original order', () => {
    expect(buildUnansweredQueue(
      ['q1', 'q2', 'q3', 'q4', 'q5'],
      { q1: 'A', q3: 'C' },
    )).toEqual([1, 3, 4])
  })

  it('moves only within the captured queue and never falls back to sequential questions', () => {
    const queue = [1, 3, 5, 7]
    expect(reviewQueueTarget(queue, 0, 1)).toEqual({ cursor: 1, questionIndex: 3 })
    expect(reviewQueueTarget(queue, 1, 1)).toEqual({ cursor: 2, questionIndex: 5 })
    expect(reviewQueueTarget(queue, 2, -1)).toEqual({ cursor: 1, questionIndex: 3 })
  })

  it('keeps the captured review queue stable even after some queued questions are answered', () => {
    const originalAnswers = { q1: 'A' }
    const queue = buildUnansweredQueue(['q1', 'q2', 'q3', 'q4'], originalAnswers)
    expect(queue).toEqual([1, 2, 3])

    // Review is intentionally a snapshot. Answering q2 does not rebuild the
    // queue and accidentally skip/fall through to non-review questions.
    const laterAnswers = { ...originalAnswers, q2: 'B' }
    expect(buildUnansweredQueue(['q1', 'q2', 'q3', 'q4'], laterAnswers)).toEqual([2, 3])
    expect(queue).toEqual([1, 2, 3])
  })

  it('returns an empty queue when every question is already answered', () => {
    expect(buildUnansweredQueue(
      ['q1', 'q2'],
      { q1: 'A', q2: 'B' },
    )).toEqual([])
  })

  it('requires a finish confirmation only when unanswered questions remain', () => {
    expect(finishNeedsConfirmation(0)).toBe(false)
    expect(finishNeedsConfirmation(1)).toBe(true)
    expect(finishNeedsConfirmation(7)).toBe(true)
  })

  it('does not wrap after the final unanswered question', () => {
    const queue = [1, 3, 5]
    expect(reviewQueueTarget(queue, 2, 1)).toBeNull()
    expect(reviewQueueTarget(queue, 0, -1)).toBeNull()
  })
})
