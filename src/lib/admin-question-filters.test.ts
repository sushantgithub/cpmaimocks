import { describe, expect, it } from 'vitest'
import {
  buildQuestionBankPageHref,
  buildQuestionBankWhere,
  normalizeQuestionContentType,
} from './admin-question-filters'

describe('question bank content type filters', () => {
  it('normalizes supported content types and rejects unknown values', () => {
    expect(normalizeQuestionContentType('MOCK_EXAM')).toBe('MOCK_EXAM')
    expect(normalizeQuestionContentType(' practice_only ')).toBe('PRACTICE_ONLY')
    expect(normalizeQuestionContentType('quiz')).toBe('QUIZ')
    expect(normalizeQuestionContentType('anything-else')).toBeUndefined()
  })

  it('puts the selected content type into the database where clause', () => {
    expect(buildQuestionBankWhere({ contentType: 'MOCK_EXAM' })).toEqual({
      contentType: 'MOCK_EXAM',
    })

    expect(buildQuestionBankWhere({ contentType: 'PRACTICE_ONLY', status: 'PUBLISHED' })).toEqual({
      status: 'PUBLISHED',
      contentType: 'PRACTICE_ONLY',
    })
  })

  it('preserves active filters and content set when moving between pages', () => {
    const href = buildQuestionBankPageHref({
      contentType: 'MOCK_EXAM',
      contentSet: 'mock:mock-3',
      status: 'PUBLISHED',
      difficulty: 'HARD',
      certification: 'cpmai',
    }, 2)

    const params = new URLSearchParams(href.slice(1))
    expect(params.get('contentType')).toBe('MOCK_EXAM')
    expect(params.get('contentSet')).toBe('mock:mock-3')
    expect(params.get('status')).toBe('PUBLISHED')
    expect(params.get('difficulty')).toBe('HARD')
    expect(params.get('certification')).toBe('cpmai')
    expect(params.get('page')).toBe('2')
  })
})
