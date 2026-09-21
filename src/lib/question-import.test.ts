import { describe, expect, it } from 'vitest'
import {
  assessExistingMockQuestionCollisions,
  explicitImportQuestionIds,
  questionIdImportErrors,
  validateNewMockImportConfig,
} from './question-import'

describe('question import ID validation', () => {
  it('tracks explicit question IDs with their CSV row numbers', () => {
    expect(explicitImportQuestionIds([
      { question_id: ' Q-1 ' },
      {},
      { question_id: 'Q-3' },
    ])).toEqual([
      { row: 2, questionId: 'Q-1' },
      { row: 4, questionId: 'Q-3' },
    ])
  })

  it('reports duplicate IDs inside the CSV before any database write', () => {
    expect(questionIdImportErrors([
      { question_id: 'M5-001' },
      { question_id: 'M5-002' },
      { question_id: ' M5-001 ' },
    ], [])).toEqual([
      'Row 4: question_id "M5-001" is duplicated in this CSV (first used on row 2).',
    ])
  })

  it('reports IDs that already exist in the Question Bank', () => {
    expect(questionIdImportErrors([
      { question_id: 'M5-001' },
      { question_id: 'M5-002' },
    ], ['M5-002'])).toEqual([
      'Row 3: question_id "M5-002" already exists in the Question Bank.',
    ])
  })

  it('can report both a CSV duplicate and an existing-bank collision clearly', () => {
    expect(questionIdImportErrors([
      { question_id: 'SHARED' },
      { question_id: 'SHARED' },
    ], ['SHARED'])).toEqual([
      'Row 2: question_id "SHARED" already exists in the Question Bank.',
      'Row 3: question_id "SHARED" is duplicated in this CSV (first used on row 2).',
      'Row 3: question_id "SHARED" already exists in the Question Bank.',
    ])
  })
})

describe('orphaned Mock question replacement', () => {
  const rows = [
    { question_id: 'M5-001' },
    { question_id: 'M5-002' },
  ]

  it('allows replacing only safe orphaned MOCK_EXAM questions', () => {
    expect(assessExistingMockQuestionCollisions({
      rows,
      certificationId: 'cpmai',
      allowReplaceOrphans: true,
      existingQuestions: [
        {
          id: 'db-1',
          questionId: 'M5-001',
          certificationId: 'cpmai',
          contentType: 'MOCK_EXAM',
          mockExamCount: 0,
          examAnswerCount: 0,
          bookmarkCount: 0,
        },
      ],
    })).toEqual({
      errors: [],
      replaceDatabaseIds: ['db-1'],
    })
  })

  it('does not replace an orphan unless the admin explicitly opted in', () => {
    expect(assessExistingMockQuestionCollisions({
      rows,
      certificationId: 'cpmai',
      allowReplaceOrphans: false,
      existingQuestions: [
        {
          id: 'db-1',
          questionId: 'M5-001',
          certificationId: 'cpmai',
          contentType: 'MOCK_EXAM',
          mockExamCount: 0,
          examAnswerCount: 0,
          bookmarkCount: 0,
        },
      ],
    })).toEqual({
      errors: ['Row 2: question_id "M5-001" already exists in the Question Bank.'],
      replaceDatabaseIds: [],
    })
  })

  it('blocks replacement when the old question is still assigned to a mock', () => {
    const result = assessExistingMockQuestionCollisions({
      rows,
      certificationId: 'cpmai',
      allowReplaceOrphans: true,
      existingQuestions: [
        {
          id: 'db-1',
          questionId: 'M5-001',
          certificationId: 'cpmai',
          contentType: 'MOCK_EXAM',
          mockExamCount: 1,
          examAnswerCount: 0,
          bookmarkCount: 0,
        },
      ],
    })

    expect(result.replaceDatabaseIds).toEqual([])
    expect(result.errors[0]).toContain('still assigned to another Mock Exam')
  })

  it('blocks replacement when the old question has learner history', () => {
    const result = assessExistingMockQuestionCollisions({
      rows,
      certificationId: 'cpmai',
      allowReplaceOrphans: true,
      existingQuestions: [
        {
          id: 'db-1',
          questionId: 'M5-001',
          certificationId: 'cpmai',
          contentType: 'MOCK_EXAM',
          mockExamCount: 0,
          examAnswerCount: 2,
          bookmarkCount: 0,
        },
      ],
    })

    expect(result.replaceDatabaseIds).toEqual([])
    expect(result.errors[0]).toContain('learner history or bookmarks')
  })

  it('never replaces Quiz or Practice content just because IDs collide', () => {
    const result = assessExistingMockQuestionCollisions({
      rows,
      certificationId: 'cpmai',
      allowReplaceOrphans: true,
      existingQuestions: [
        {
          id: 'db-1',
          questionId: 'M5-001',
          certificationId: 'cpmai',
          contentType: 'QUIZ',
          mockExamCount: 0,
          examAnswerCount: 0,
          bookmarkCount: 0,
        },
      ],
    })

    expect(result.replaceDatabaseIds).toEqual([])
    expect(result.errors[0]).toContain('not an orphaned Mock question')
  })
})

describe('new Mock import settings', () => {
  it('accepts a complete atomic Mock import config', () => {
    expect(validateNewMockImportConfig({
      title: 'PMI-CPMAI Practice Exam 5',
      questionCount: 40,
      timeLimitMinutes: 60,
      passingScore: 70,
      requireSubscription: true,
    }, 40)).toEqual([])
  })

  it('rejects config that would create a mismatched or invalid Mock', () => {
    expect(validateNewMockImportConfig({
      title: ' ',
      questionCount: 40,
      timeLimitMinutes: 0,
      passingScore: 101,
    }, 39)).toEqual([
      'Mock Exam name is required.',
      'New Mock Exam expects exactly 40 questions, but the import contains 39.',
      'Time limit must be a positive whole number of minutes.',
      'Passing percentage must be between 1 and 100.',
    ])
  })
})
