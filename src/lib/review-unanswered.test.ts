import { describe, expect, it } from 'vitest'
import { buildUnansweredQueue, reviewQueueTarget } from './review-unanswered'

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

  it('does not wrap after the final unanswered question', () => {
    const queue = [1, 3, 5]
    expect(reviewQueueTarget(queue, 2, 1)).toBeNull()
    expect(reviewQueueTarget(queue, 0, -1)).toBeNull()
  })
})
