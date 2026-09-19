import { describe, it, expect } from 'vitest'
import {
  normalizeAnswer, answerLetters, expectedCount, isAnswerCorrect,
  explanationRows, splitExplanationRows,
} from '@/lib/answers'

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

describe('explanationRows', () => {
  const base = {
    optionA: 'Alpha', optionB: 'Beta', optionC: 'Gamma', optionD: 'Delta',
    correctAnswer: 'C',
    explanationA: 'no', explanationB: 'no', explanationC: 'yes', explanationD: 'no',
  }

  it('returns nothing when no per-option text was written', () => {
    const { optionA, optionB, optionC, optionD, correctAnswer } = base
    expect(explanationRows({ optionA, optionB, optionC, optionD, correctAnswer }, 'A')).toEqual([])
  })

  it('skips options that have text but no explanation', () => {
    const rows = explanationRows({ ...base, explanationB: '   ' }, 'A')
    expect(rows.map((r) => r.key)).toEqual(['A', 'C', 'D'])
  })

  it('skips explanations written against an option that does not exist', () => {
    const rows = explanationRows({ ...base, explanationE: 'orphan' }, 'A')
    expect(rows.map((r) => r.key)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('marks the chosen and correct options', () => {
    const rows = explanationRows(base, 'A')
    expect(rows.find((r) => r.key === 'A')).toMatchObject({ chosen: true, correct: false })
    expect(rows.find((r) => r.key === 'C')).toMatchObject({ chosen: false, correct: true })
  })

  it('treats every letter of a multiple-response answer as correct', () => {
    const rows = explanationRows(
      { ...base, optionE: 'Epsilon', explanationE: 'yes', correctAnswer: 'A,C' },
      'C,E',
    )
    expect(rows.filter((r) => r.correct).map((r) => r.key)).toEqual(['A', 'C'])
    expect(rows.filter((r) => r.chosen).map((r) => r.key)).toEqual(['C', 'E'])
  })
})

describe('splitExplanationRows', () => {
  const base = {
    optionA: 'Alpha', optionB: 'Beta', optionC: 'Gamma', optionD: 'Delta',
    correctAnswer: 'C',
    explanationA: 'no', explanationB: 'no', explanationC: 'yes', explanationD: 'no',
  }

  it('leads with the answer the learner gave and the correct one', () => {
    const { lead, rest } = splitExplanationRows(explanationRows(base, 'A'))
    expect(lead.map((r) => r.key)).toEqual(['A', 'C'])
    expect(rest.map((r) => r.key)).toEqual(['B', 'D'])
  })

  it('leads with one row when the learner was right', () => {
    const { lead, rest } = splitExplanationRows(explanationRows(base, 'C'))
    expect(lead.map((r) => r.key)).toEqual(['C'])
    expect(rest.map((r) => r.key)).toEqual(['A', 'B', 'D'])
  })

  it('leads with the correct option when nothing was selected', () => {
    const { lead, rest } = splitExplanationRows(explanationRows(base, null))
    expect(lead.map((r) => r.key)).toEqual(['C'])
    expect(rest.map((r) => r.key)).toEqual(['A', 'B', 'D'])
  })

  it('never repeats a row between lead and rest', () => {
    const rows = explanationRows({ ...base, correctAnswer: 'A,C' }, 'A,B')
    const { lead, rest } = splitExplanationRows(rows)
    const overlap = lead.filter((l) => rest.some((r) => r.key === l.key))
    expect(overlap).toEqual([])
    expect(lead.length + rest.length).toBe(rows.length)
  })
})
