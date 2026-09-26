import { describe, expect, it } from 'vitest'
import { buildPracticeQuestionWhere } from '@/lib/quiz'

describe('Practice content isolation', () => {
  it('only exposes published PRACTICE_ONLY questions', () => {
    expect(buildPracticeQuestionWhere()).toEqual({
      status: 'PUBLISHED',
      contentType: 'PRACTICE_ONLY',
    })
  })
})
