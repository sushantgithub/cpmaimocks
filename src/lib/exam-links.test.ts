import { describe, expect, it } from 'vitest'
import { freshExamHref } from './exam-links'

describe('freshExamHref', () => {
  it('always starts an intentional mock launch as a fresh attempt', () => {
    expect(freshExamHref('exam-123')).toBe('/exams/exam-123?fresh=1')
  })
})
