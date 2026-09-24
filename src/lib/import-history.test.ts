import { describe, expect, it } from 'vitest'
import { filterImportHistoryBatches, type ImportHistoryBatch } from './import-history'

const batches: ImportHistoryBatch[] = [
  {
    id: 'quiz-1',
    name: 'Quiz import 1',
    sourceFilename: '1_Domain.csv',
    contentType: 'QUIZ',
    certification: { name: 'CPMAI' },
    domains: ['Support Responsible and Trustworthy AI Efforts'],
    quizNumbers: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'practice-1',
    name: 'Practice import 1',
    sourceFilename: '35_cpmai-practice-questions.csv',
    contentType: 'PRACTICE_ONLY',
    certification: { name: 'CPMAI' },
    domains: ['Identify Data Needs', 'Operationalize AI Solution'],
  },
  {
    id: 'mock-1',
    name: 'Mock import 1',
    sourceFilename: 'pmp_mock_1.csv',
    contentType: 'MOCK_EXAM',
    certification: { name: 'PMP' },
    domains: ['People'],
  },
]

describe('import history filters', () => {
  it('searches filename and domain text case-insensitively', () => {
    expect(
      filterImportHistoryBatches(batches, {
        query: '35_CPMAI',
        certification: 'ALL',
        contentType: 'ALL',
      }).map((batch) => batch.id)
    ).toEqual(['practice-1'])

    expect(
      filterImportHistoryBatches(batches, {
        query: 'responsible and trustworthy',
        certification: 'ALL',
        contentType: 'ALL',
      }).map((batch) => batch.id)
    ).toEqual(['quiz-1'])
  })

  it('filters independently by certification and content type', () => {
    expect(
      filterImportHistoryBatches(batches, {
        query: '',
        certification: 'CPMAI',
        contentType: 'PRACTICE_ONLY',
      }).map((batch) => batch.id)
    ).toEqual(['practice-1'])

    expect(
      filterImportHistoryBatches(batches, {
        query: '',
        certification: 'PMP',
        contentType: 'ALL',
      }).map((batch) => batch.id)
    ).toEqual(['mock-1'])
  })

  it('supports Quiz-number and friendly content searches', () => {
    expect(
      filterImportHistoryBatches(batches, {
        query: 'quiz 4',
        certification: 'ALL',
        contentType: 'ALL',
      }).map((batch) => batch.id)
    ).toEqual(['quiz-1'])

    expect(
      filterImportHistoryBatches(batches, {
        query: 'practice',
        certification: 'ALL',
        contentType: 'ALL',
      }).map((batch) => batch.id)
    ).toEqual(['practice-1'])
  })
})
