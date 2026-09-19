import { describe, it, expect } from 'vitest'
import { selectForAttempt, shuffle } from '@/lib/quiz'

const pool = Array.from({ length: 60 }, (_, i) => `q${i + 1}`)

describe('selectForAttempt', () => {
  it('serves the whole pool when no per-attempt count is set', () => {
    expect(selectForAttempt(pool, false, null)).toHaveLength(60)
  })

  it('serves exactly the per-attempt count from a larger pool', () => {
    const served = selectForAttempt(pool, true, 10)
    expect(served).toHaveLength(10)
    expect(new Set(served).size).toBe(10)
    served.forEach((q) => expect(pool).toContain(q))
  })

  it('never repeats a question inside one attempt', () => {
    for (let i = 0; i < 50; i++) {
      const served = selectForAttempt(pool, true, 10)
      expect(new Set(served).size).toBe(served.length)
    }
  })

  it('serves the whole pool when the count meets or exceeds it', () => {
    expect(selectForAttempt(pool, false, 60)).toHaveLength(60)
    expect(selectForAttempt(pool, false, 99)).toHaveLength(60)
  })

  it('treats zero and negative counts as unset rather than serving nothing', () => {
    expect(selectForAttempt(pool, false, 0)).toHaveLength(60)
    expect(selectForAttempt(pool, false, -5)).toHaveLength(60)
  })

  it('keeps the exam order when randomisation is off, so a fixed exam is reproducible', () => {
    expect(selectForAttempt(pool, false, 10)).toEqual(pool.slice(0, 10))
  })

  it('does not mutate the pool it was given', () => {
    const original = [...pool]
    selectForAttempt(pool, true, 10)
    expect(pool).toEqual(original)
  })

  it('draws a different set across attempts, so a retake is not a replay', () => {
    const sets = new Set(
      Array.from({ length: 30 }, () => selectForAttempt(pool, true, 10).slice().sort().join(','))
    )
    // 30 independent draws of 10 from 60 colliding every time would be
    // astronomically unlikely; anything above a handful proves resampling.
    expect(sets.size).toBeGreaterThan(20)
  })

  it('can repeat a question across attempts, since each draw is independent', () => {
    const seen = Array.from({ length: 40 }, () => selectForAttempt(pool, true, 10)).flat()
    expect(seen.length).toBeGreaterThan(new Set(seen).size)
  })
})

describe('shuffle', () => {
  it('returns the same members', () => {
    expect(shuffle(pool).slice().sort()).toEqual([...pool].sort())
  })

  it('does not mutate its input', () => {
    const original = [...pool]
    shuffle(pool)
    expect(pool).toEqual(original)
  })

  it('moves the first element off the front most of the time', () => {
    const stayed = Array.from({ length: 200 }, () => shuffle(pool)[0]).filter((q) => q === 'q1').length
    expect(stayed).toBeLessThan(20)
  })
})
