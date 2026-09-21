import { describe, expect, it } from 'vitest'
import {
  chooseMockSortOrder,
  effectiveMockSortOrder,
  hasDuplicateMockExamTitle,
  isFullMockExam,
  mockExamDisplayGroup,
  mockExamDisplayLabel,
  mockNumberFromTitle,
  normalizeMockExamTitle,
  sortMockExamsForDisplay,
} from './mock-exams'

describe('isFullMockExam', () => {
  it('accepts a timed exam that serves its full pool', () => {
    expect(isFullMockExam({
      questionCount: 120,
      questionsPerAttempt: null,
      timeLimitMinutes: 180,
    })).toBe(true)
  })

  it('accepts a timed mini mock that serves its full pool', () => {
    expect(isFullMockExam({
      questionCount: 50,
      questionsPerAttempt: null,
      timeLimitMinutes: 100,
    })).toBe(true)
  })

  it('rejects an empty timed record', () => {
    expect(isFullMockExam({
      questionCount: 0,
      questionsPerAttempt: null,
      timeLimitMinutes: 120,
    })).toBe(false)
  })

  it('rejects an untimed full-pool legacy record', () => {
    expect(isFullMockExam({
      questionCount: 60,
      questionsPerAttempt: null,
      timeLimitMinutes: 0,
    })).toBe(false)
  })

  it('rejects a sampled domain learning mock', () => {
    expect(isFullMockExam({
      questionCount: 60,
      questionsPerAttempt: 10,
      timeLimitMinutes: 0,
    })).toBe(false)
  })

  it('rejects timed sampled pools so they do not appear as full mocks', () => {
    expect(isFullMockExam({
      questionCount: 60,
      questionsPerAttempt: 10,
      timeLimitMinutes: 60,
    })).toBe(false)
  })
})

describe('mock exam display grouping', () => {
  it('puts the planned 40-question mocks in their own section', () => {
    expect(mockExamDisplayGroup(40)).toBe('FORTY_QUESTION')
    expect(mockExamDisplayLabel(40)).toBe('40-Question Mock')
  })

  it('treats 100+ question exams as full-length', () => {
    expect(mockExamDisplayGroup(100)).toBe('FULL_LENGTH')
    expect(mockExamDisplayGroup(120)).toBe('FULL_LENGTH')
    expect(mockExamDisplayLabel(120)).toBe('Full-Length Mock')
  })

  it('keeps other timed mock sizes in a safe fallback group', () => {
    expect(mockExamDisplayGroup(50)).toBe('OTHER')
    expect(mockExamDisplayLabel(50)).toBe('Mock Exam')
  })
})

describe('mock exam title uniqueness', () => {
  it('normalizes case and repeated whitespace', () => {
    expect(normalizeMockExamTitle('  PMI-CPMAI   Practice Exam 1 ')).toBe(
      'pmi-cpmai practice exam 1',
    )
  })

  it('detects a duplicate name case-insensitively within a supplied certification set', () => {
    expect(hasDuplicateMockExamTitle(
      'pmi-cpmai practice exam 1',
      [{ id: 'one', title: 'PMI-CPMAI Practice Exam 1' }],
    )).toBe(true)
  })

  it('allows the current exam to keep its own name during rename validation', () => {
    expect(hasDuplicateMockExamTitle(
      'PMI-CPMAI Practice Exam 1',
      [{ id: 'one', title: 'PMI-CPMAI Practice Exam 1' }],
      'one',
    )).toBe(false)
  })
})

describe('mock exam stable display order', () => {
  it('recovers legacy order from trailing exam numbers', () => {
    expect(mockNumberFromTitle('PMI-CPMAI Practice Exam 5')).toBe(5)
    expect(effectiveMockSortOrder({
      title: 'PMI-CPMAI Practice Exam 5',
      sortOrder: 0,
    })).toBe(5)
  })

  it('uses persisted sortOrder instead of the current title after a rename', () => {
    expect(effectiveMockSortOrder({
      title: 'CPMAI Focus Mock',
      sortOrder: 5,
    })).toBe(5)
  })

  it('fixes the exact 1,2,3,4,6,5 legacy display problem', () => {
    const exams = [1, 2, 3, 4, 6, 5].map((number) => ({
      id: String(number),
      title: `PMI-CPMAI Practice Exam ${number}`,
      sortOrder: 0,
      questionCount: 40,
    }))

    expect(sortMockExamsForDisplay(exams).map((exam) => exam.id)).toEqual([
      '1', '2', '3', '4', '5', '6',
    ])
  })

  it('assigns a recreated Exam 5 to slot 5 even if Exam 6 already exists', () => {
    const existing = [1, 2, 3, 4, 6].map((number) => ({
      title: `PMI-CPMAI Practice Exam ${number}`,
      sortOrder: 0,
    }))

    expect(chooseMockSortOrder('PMI-CPMAI Practice Exam 5', existing)).toBe(5)
  })

  it('chooses the first available positive order for a title without a number', () => {
    expect(chooseMockSortOrder('CPMAI Diagnostic Mock', [
      { title: 'Exam 1', sortOrder: 1 },
      { title: 'Exam 2', sortOrder: 2 },
    ])).toBe(3)
  })
})
