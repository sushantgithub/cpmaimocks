export const ADMIN_QUIZ_SET_SIZE = 10

export type AdminQuestionSetContentType = 'QUIZ' | 'MOCK_EXAM'
export type AdminQuestionSetKind = 'QUIZ' | 'MOCK'

export interface AdminQuestionSetOption {
  value: string
  label: string
  count: number
  contentType: AdminQuestionSetContentType
  kind: AdminQuestionSetKind
  entityId: string
  questionIds?: string[]
}

export interface MockQuestionSetSource {
  id: string
  title: string
  certificationId: string
  certificationName?: string | null
  questionCount: number
}

export interface QuizSetQuestion {
  id: string
  certificationId: string
  categoryId: string | null
  tags: string[]
}

export interface QuizSetDomain {
  id: string
  name: string
  certificationId: string
  certificationName?: string | null
}

export interface QuizSetTagQuiz {
  id: string
  title: string
  tag: string
  certificationId: string
  certificationName?: string | null
  isActive: boolean
}

function labelWithCertification(certificationName: string | null | undefined, label: string) {
  return certificationName ? `${certificationName} · ${label}` : label
}

export function buildMockQuestionSetOptions(
  exams: MockQuestionSetSource[],
): AdminQuestionSetOption[] {
  return exams.map((exam) => ({
    value: `mock:${exam.id}`,
    label: labelWithCertification(exam.certificationName, exam.title),
    count: exam.questionCount,
    contentType: 'MOCK_EXAM',
    kind: 'MOCK',
    entityId: exam.id,
  }))
}

function chunkQuestionIds(ids: string[], size: number) {
  if (!Number.isInteger(size) || size <= 0) return [] as string[][]
  const chunks: string[][] = []
  for (let start = 0; start < ids.length; start += size) {
    chunks.push(ids.slice(start, start + size))
  }
  return chunks
}

/**
 * Builds the current learner-facing Quiz sets from an already ordered question list.
 * The caller must order questions by createdAt ASC, id ASC, matching prepareQuizSitting().
 * Domain pools exclude questions claimed by any active tag quiz for that certification.
 */
export function buildQuizQuestionSetOptions({
  domains,
  tagQuizzes,
  questions,
  quizSize = ADMIN_QUIZ_SET_SIZE,
}: {
  domains: QuizSetDomain[]
  tagQuizzes: QuizSetTagQuiz[]
  questions: QuizSetQuestion[]
  quizSize?: number
}): AdminQuestionSetOption[] {
  if (!Number.isInteger(quizSize) || quizSize <= 0) return []

  const activeTagQuizzes = tagQuizzes.filter((quiz) => quiz.isActive)
  const claimedTagsByCertification = new Map<string, Set<string>>()

  for (const quiz of activeTagQuizzes) {
    const tags = claimedTagsByCertification.get(quiz.certificationId) ?? new Set<string>()
    tags.add(quiz.tag)
    claimedTagsByCertification.set(quiz.certificationId, tags)
  }

  const options: AdminQuestionSetOption[] = []

  for (const domain of domains) {
    const claimedTags =
      claimedTagsByCertification.get(domain.certificationId) ?? new Set<string>()

    const ids = questions
      .filter(
        (question) =>
          question.certificationId === domain.certificationId &&
          question.categoryId === domain.id &&
          !question.tags.some((tag) => claimedTags.has(tag)),
      )
      .map((question) => question.id)

    chunkQuestionIds(ids, quizSize).forEach((questionIds, index) => {
      const number = index + 1
      options.push({
        value: `domain:${domain.id}:${number}`,
        label: labelWithCertification(
          domain.certificationName,
          `${domain.name} · Quiz ${number}`,
        ),
        count: questionIds.length,
        contentType: 'QUIZ',
        kind: 'QUIZ',
        entityId: domain.id,
        questionIds,
      })
    })
  }

  for (const quiz of activeTagQuizzes) {
    const ids = questions
      .filter(
        (question) =>
          question.certificationId === quiz.certificationId &&
          question.tags.includes(quiz.tag),
      )
      .map((question) => question.id)

    chunkQuestionIds(ids, quizSize).forEach((questionIds, index) => {
      const number = index + 1
      options.push({
        value: `tag:${quiz.id}:${number}`,
        label: labelWithCertification(
          quiz.certificationName,
          `${quiz.title} · Quiz ${number}`,
        ),
        count: questionIds.length,
        contentType: 'QUIZ',
        kind: 'QUIZ',
        entityId: quiz.id,
        questionIds,
      })
    })
  }

  return options
}

export function buildQuestionSetWhere(
  selectedSet: string | undefined,
  contentType: string | undefined,
  options: AdminQuestionSetOption[],
): Record<string, unknown> {
  if (!selectedSet || !contentType) return {}

  const option = options.find(
    (candidate) =>
      candidate.value === selectedSet && candidate.contentType === contentType,
  )
  if (!option) return {}

  if (option.kind === 'MOCK') {
    return {
      mockExamQuestions: {
        some: { examId: option.entityId },
      },
    }
  }

  return {
    id: {
      in: option.questionIds ?? [],
    },
  }
}
