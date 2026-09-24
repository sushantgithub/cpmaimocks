import { describe, expect, it } from 'vitest'
import { buildAdminQuizRows } from './admin-quizzes'

const quiz = (overrides: Partial<Parameters<typeof buildAdminQuizRows>[0][number]> = {}) => ({
  id: 'quiz-1',
  title: 'Domain A - Quiz 1',
  description: null,
  isActive: true,
  sortOrder: 0,
  tag: 'quiz-domain-a-1',
  certificationId: 'cert-1',
  categoryId: 'domain-a',
  certification: { id: 'cert-1', name: 'CPMAI', sortOrder: 0 },
  category: { id: 'domain-a', name: 'Domain A', sortOrder: 0 },
  ...overrides,
})

describe('admin Quiz overview', () => {
  it('returns one row per persisted Quiz instead of generating duplicate Quiz cards', () => {
    const rows = buildAdminQuizRows(
      [
        quiz(),
        quiz({
          id: 'quiz-2',
          title: 'Domain A - Quiz 2',
          sortOrder: 1,
          tag: 'quiz-domain-a-2',
        }),
      ],
      [
        {
          certificationId: 'cert-1',
          categoryId: 'domain-a',
          status: 'PUBLISHED',
          tags: ['quiz-domain-a-1'],
        },
        {
          certificationId: 'cert-1',
          categoryId: 'domain-a',
          status: 'PUBLISHED',
          tags: ['quiz-domain-a-2'],
        },
      ]
    )

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.title)).toEqual([
      'Domain A - Quiz 1',
      'Domain A - Quiz 2',
    ])
  })

  it('counts only questions owned by the same certification, domain, and Quiz tag', () => {
    const rows = buildAdminQuizRows(
      [quiz()],
      [
        {
          certificationId: 'cert-1',
          categoryId: 'domain-a',
          status: 'PUBLISHED',
          tags: ['quiz-domain-a-1', 'algorithm'],
        },
        {
          certificationId: 'cert-1',
          categoryId: 'domain-a',
          status: 'DRAFT',
          tags: ['quiz-domain-a-1'],
        },
        {
          certificationId: 'cert-1',
          categoryId: 'domain-b',
          status: 'PUBLISHED',
          tags: ['quiz-domain-a-1'],
        },
        {
          certificationId: 'cert-2',
          categoryId: 'domain-a',
          status: 'PUBLISHED',
          tags: ['quiz-domain-a-1'],
        },
      ]
    )

    expect(rows[0].questionCount).toBe(2)
    expect(rows[0].publishedQuestionCount).toBe(1)
  })

  it('orders certification, domain, and persisted Quiz sort order predictably', () => {
    const rows = buildAdminQuizRows(
      [
        quiz({
          id: 'quiz-b',
          title: 'Domain B - Quiz 1',
          categoryId: 'domain-b',
          category: { id: 'domain-b', name: 'Domain B', sortOrder: 1 },
        }),
        quiz({
          id: 'quiz-a2',
          title: 'Domain A - Quiz 2',
          sortOrder: 1,
          tag: 'quiz-domain-a-2',
        }),
        quiz({
          id: 'quiz-a1',
          title: 'Domain A - Quiz 1',
          sortOrder: 0,
        }),
      ],
      []
    )

    expect(rows.map((row) => row.id)).toEqual(['quiz-a1', 'quiz-a2', 'quiz-b'])
  })
})
