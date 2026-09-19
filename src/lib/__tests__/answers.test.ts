import { describe, it, expect } from 'vitest'
import { normalizeAnswer, answerLetters, expectedCount, isAnswerCorrect } from '@/lib/answers'

describe('normalizeAnswer', () => {
  it('sorts letters so the order they were clicked does not matter', () => {
    expect(normalizeAnswer('C,A')).toBe('A,C')
    expect(normalizeAnswer('a, c')).toBe('A,C')
  })

  it('accepts the separators a hand-written CSV is likely to use', () => {
    for (const raw of ['A,C', 'A, C', 'A C', 'A;C', 'A|C']) {
      expect(normalizeAnswer(raw)).toBe('A,C')
    }
  })

  it('drops duplicates and anything that is not an option letter', () => {
    expect(normalizeAnswer('A,A,C')).toBe('A,C')
    expect(normalizeAnswer('A,Z,7,C')).toBe('A,C')
  })

  it('is empty for nothing at all', () => {
    expect(normalizeAnswer('')).toBe('')
    expect(normalizeAnswer(null)).toBe('')
    expect(normalizeAnswer('   ')).toBe('')
  })
})

describe('expectedCount', () => {
  it('tells the screen how many options to ask for', () => {
    expect(expectedCount('B')).toBe(1)
    expect(expectedCount('A,C')).toBe(2)
    expect(expectedCount('A,B,E')).toBe(3)
  })
})

describe('isAnswerCorrect', () => {
  it('marks a single answer as before', () => {
    expect(isAnswerCorrect('B', 'B')).toBe(true)
    expect(isAnswerCorrect('C', 'B')).toBe(false)
  })

  it('accepts the right pair in either order', () => {
    expect(isAnswerCorrect('C,A', 'A,C')).toBe(true)
  })

  it('marks all or nothing, as PMI does — half right is wrong', () => {
    expect(isAnswerCorrect('A', 'A,C')).toBe(false)
    expect(isAnswerCorrect('A,B', 'A,C')).toBe(false)
  })

  it('refuses a scattergun answer that ticks everything', () => {
    expect(isAnswerCorrect('A,B,C,D', 'A,C')).toBe(false)
  })

  it('treats no answer as wrong rather than correct', () => {
    expect(isAnswerCorrect('', 'A,C')).toBe(false)
    expect(isAnswerCorrect(null, 'B')).toBe(false)
  })
})

describe('answerLetters', () => {
  it('gives the screen the letters to highlight', () => {
    expect(answerLetters('A,C')).toEqual(['A', 'C'])
    expect(answerLetters('B')).toEqual(['B'])
    expect(answerLetters(null)).toEqual([])
  })
})
