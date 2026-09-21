import { describe, expect, it } from 'vitest'
import {
  buildMockQuestionSetOptions,
  buildQuestionSetWhere,
  buildQuizQuestionSetOptions,
} from './admin-question-sets'

describe('admin question set filters', () => {
  it('builds exact Mock Exam filters from the exam relationship', () => {
    const options = buildMockQuestionSetOptions([
      {
        id: 'mock-1',
        title: '40-Question Mock 1',
        certificationId: 'cert-1',
        certificationName: 'CPMAI',
        questionCount: 40,
      },
    ])

    expect(options[0]).toMatchObject({
      value: 'mock:mock-1',
      label: 'CPMAI · 40-Question Mock 1',
      count: 40,
      contentType: 'MOCK_EXAM',
      kind: 'MOCK',
    })

    expect(buildQuestionSetWhere('mock:mock-1', 'MOCK_EXAM', options)).toEqual({
      mockExamQuestions: {
        some: { examId: 'mock-1' },
      },
    })
  })

  it('does not expose legacy MockExam containers with zero MOCK_EXAM questions', () => {
    const options = buildMockQuestionSetOptions([
      {
        id: 'legacy-domain-container',
        title: 'Support Responsible and Trustworthy AI Efforts',
        certificationId: 'cert-1',
        certificationName: 'CPMAI',
        questionCount: 0,
      },
      {
        id: 'practice-exam-1',
        title: 'PMI-CPMAI Practice Exam 1',
        certificationId: 'cert-1',
        certificationName: 'CPMAI',
        questionCount: 40,
      },
    ])

    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      value: 'mock:practice-exam-1',
      count: 40,
    })
    expect(options.some((option) => option.value === 'mock:legacy-domain-container')).toBe(false)
  })

  it('builds deterministic domain quiz slots and excludes active tag-quiz questions', () => {
    const questions = Array.from({ length: 12 }, (_, index) => ({
      id: `q${index + 1}`,
      certificationId: 'cert-1',
      categoryId: 'domain-1',
      tags: index === 0 ? ['algorithm'] : [],
    }))

    const options = buildQuizQuestionSetOptions({
      domains: [
        {
          id: 'domain-1',
          name: 'Responsible AI',
          certificationId: 'cert-1',
          certificationName: 'CPMAI',
        },
      ],
      tagQuizzes: [
        {
          id: 'tag-quiz-1',
          title: 'Algorithms',
          tag: 'algorithm',
          certificationId: 'cert-1',
          certificationName: 'CPMAI',
          isActive: true,
        },
      ],
      questions,
    })

    const domainOne = options.find((option) => option.value === 'domain:domain-1:1')
    const domainTwo = options.find((option) => option.value === 'domain:domain-1:2')
    const tagOne = options.find((option) => option.value === 'tag:tag-quiz-1:1')

    expect(domainOne?.label).toBe('CPMAI · Responsible AI · Quiz 1')
    expect(domainOne?.questionIds).toEqual([
      'q2', 'q3', 'q4', 'q5', 'q6',
      'q7', 'q8', 'q9', 'q10', 'q11',
    ])
    expect(domainTwo?.questionIds).toEqual(['q12'])
    expect(tagOne?.questionIds).toEqual(['q1'])
  })

  it('returns exact current quiz IDs for a selected quiz slot', () => {
    const options = buildQuizQuestionSetOptions({
      domains: [
        {
          id: 'domain-1',
          name: 'Domain 1',
          certificationId: 'cert-1',
        },
      ],
      tagQuizzes: [],
      questions: [
        { id: 'q1', certificationId: 'cert-1', categoryId: 'domain-1', tags: [] },
        { id: 'q2', certificationId: 'cert-1', categoryId: 'domain-1', tags: [] },
      ],
    })

    expect(buildQuestionSetWhere('domain:domain-1:1', 'QUIZ', options)).toEqual({
      id: { in: ['q1', 'q2'] },
    })
  })

  it('ignores stale or cross-content-set query parameters safely', () => {
    const options = buildMockQuestionSetOptions([
      {
        id: 'mock-1',
        title: 'Mock 1',
        certificationId: 'cert-1',
        questionCount: 40,
      },
    ])

    expect(buildQuestionSetWhere('mock:mock-1', 'QUIZ', options)).toEqual({})
    expect(buildQuestionSetWhere('mock:not-real', 'MOCK_EXAM', options)).toEqual({})
  })
})
