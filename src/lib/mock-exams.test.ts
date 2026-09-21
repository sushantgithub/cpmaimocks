import { describe, expect, it } from 'vitest'
import { isFullMockExam, mockExamDisplayGroup, mockExamDisplayLabel } from './mock-exams'

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
