export const QUESTION_CONTENT_TYPES = ['QUIZ', 'MOCK_EXAM', 'PRACTICE_ONLY'] as const

export type QuestionContentTypeFilter = typeof QUESTION_CONTENT_TYPES[number]

export interface QuestionBankSearchParams {
  search?: string
  status?: string
  difficulty?: string
  page?: string
  certification?: string
  isTest?: string
  contentType?: string
}

export function normalizeQuestionContentType(value?: string): QuestionContentTypeFilter | undefined {
  const normalized = value?.trim().toUpperCase()
  return QUESTION_CONTENT_TYPES.includes(normalized as QuestionContentTypeFilter)
    ? normalized as QuestionContentTypeFilter
    : undefined
}

export function buildQuestionBankWhere(searchParams: QuestionBankSearchParams) {
  const where: Record<string, unknown> = {}

  if (searchParams.search?.trim()) {
    const search = searchParams.search.trim()
    where.OR = [
      { text: { contains: search, mode: 'insensitive' } },
      { questionId: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (searchParams.status) where.status = searchParams.status

  const contentType = normalizeQuestionContentType(searchParams.contentType)
  if (contentType) where.contentType = contentType

  if (searchParams.difficulty) where.difficulty = searchParams.difficulty
  if (searchParams.certification) where.certificationId = searchParams.certification

  if (searchParams.isTest === 'only') where.isTest = true
  else if (searchParams.isTest === 'exclude') where.isTest = false

  return where
}

export function buildQuestionBankPageHref(
  searchParams: QuestionBankSearchParams,
  page: number,
) {
  const params = new URLSearchParams()

  for (const key of ['search', 'status', 'difficulty', 'certification', 'isTest', 'contentType'] as const) {
    const value = searchParams[key]
    if (value) params.set(key, value)
  }

  params.set('page', String(page))
  return `?${params.toString()}`
}
