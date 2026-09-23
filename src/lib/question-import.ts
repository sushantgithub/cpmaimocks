export interface ImportQuestionIdRow {
  question_id?: string
}

export interface ExplicitQuestionIdRow {
  row: number
  questionId: string
}

export function explicitImportQuestionIds(
  rows: ImportQuestionIdRow[],
): ExplicitQuestionIdRow[] {
  const result: ExplicitQuestionIdRow[] = []
  rows.forEach((row, index) => {
    const questionId = row.question_id?.trim()
    if (questionId) {
      result.push({ row: index + 2, questionId })
    }
  })
  return result
}

export function questionIdImportErrors(
  rows: ImportQuestionIdRow[],
  existingQuestionIds: Iterable<string>,
): string[] {
  const explicit = explicitImportQuestionIds(rows)
  const existing = new Set(existingQuestionIds)
  const firstRowById = new Map<string, number>()
  const errors: string[] = []

  for (const item of explicit) {
    const firstRow = firstRowById.get(item.questionId)
    if (firstRow !== undefined) {
      errors.push(
        `Row ${item.row}: question_id "${item.questionId}" is duplicated in this CSV (first used on row ${firstRow}).`,
      )
    } else {
      firstRowById.set(item.questionId, item.row)
    }

    if (existing.has(item.questionId)) {
      errors.push(
        `Row ${item.row}: question_id "${item.questionId}" already exists in the Question Bank.`,
      )
    }
  }

  return errors
}

export interface ExistingImportQuestion {
  id: string
  questionId: string
  certificationId: string
  contentType: string
  mockExamCount: number
  examAnswerCount: number
  bookmarkCount: number
}

export function assessExistingMockQuestionCollisions({
  rows,
  existingQuestions,
  certificationId,
  allowReplaceOrphans,
}: {
  rows: ImportQuestionIdRow[]
  existingQuestions: ExistingImportQuestion[]
  certificationId: string
  allowReplaceOrphans: boolean
}): { errors: string[]; replaceDatabaseIds: string[] } {
  const rowByQuestionId = new Map(
    explicitImportQuestionIds(rows).map((item) => [item.questionId, item.row]),
  )
  const errors: string[] = []
  const replaceDatabaseIds: string[] = []

  for (const existing of existingQuestions) {
    const row = rowByQuestionId.get(existing.questionId)
    if (row === undefined) continue

    const safeOrphan =
      existing.certificationId === certificationId &&
      existing.contentType === 'MOCK_EXAM' &&
      existing.mockExamCount === 0 &&
      existing.examAnswerCount === 0 &&
      existing.bookmarkCount === 0

    if (allowReplaceOrphans && safeOrphan) {
      replaceDatabaseIds.push(existing.id)
      continue
    }

    if (!allowReplaceOrphans) {
      errors.push(
        `Row ${row}: question_id "${existing.questionId}" already exists in the Question Bank.`,
      )
      continue
    }

    if (existing.certificationId !== certificationId) {
      errors.push(
        `Row ${row}: question_id "${existing.questionId}" belongs to a different certification and cannot be replaced.`,
      )
    } else if (existing.contentType !== 'MOCK_EXAM') {
      errors.push(
        `Row ${row}: question_id "${existing.questionId}" is ${existing.contentType} content, not an orphaned Mock question, so it cannot be replaced.`,
      )
    } else if (existing.mockExamCount > 0) {
      errors.push(
        `Row ${row}: question_id "${existing.questionId}" is still assigned to another Mock Exam and cannot be replaced.`,
      )
    } else {
      errors.push(
        `Row ${row}: question_id "${existing.questionId}" has learner history or bookmarks and cannot be deleted safely.`,
      )
    }
  }

  return { errors, replaceDatabaseIds }
}

export interface NewMockImportConfig {
  title?: string
  questionCount?: number
  timeLimitMinutes?: number
  passingScore?: number
  requireSubscription?: boolean
}

export function validateNewMockImportConfig(
  config: NewMockImportConfig | undefined,
  importedQuestionCount: number,
): string[] {
  const errors: string[] = []
  if (!config) return ['New Mock Exam settings are required.']

  const title = config.title?.trim()
  const questionCount = Number(config.questionCount)
  const timeLimitMinutes = Number(config.timeLimitMinutes)
  const passingScore = Number(config.passingScore)

  if (!title) errors.push('Mock Exam name is required.')
  if (!Number.isInteger(questionCount) || questionCount <= 0) {
    errors.push('Question count must be a positive whole number.')
  } else if (questionCount !== importedQuestionCount) {
    errors.push(
      `New Mock Exam expects exactly ${questionCount} questions, but the import contains ${importedQuestionCount}.`,
    )
  }
  if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes <= 0) {
    errors.push('Time limit must be a positive whole number of minutes.')
  }
  if (!Number.isInteger(passingScore) || passingScore < 1 || passingScore > 100) {
    errors.push('Passing percentage must be between 1 and 100.')
  }

  return errors
}


export interface QuizImportRow {
  domain?: string
}

export function quizImportDomainErrors(
  rows: QuizImportRow[],
  usesDomains: boolean,
  quizSize = 10,
): string[] {
  if (rows.length === 0) return ['Quiz import must contain at least one question.']
  if (!Number.isInteger(quizSize) || quizSize <= 0) {
    return ['Quiz size must be a positive whole number.']
  }

  if (!usesDomains) {
    return rows.length % quizSize === 0
      ? []
      : [`Quiz imports must contain a multiple of ${quizSize} questions. This import has ${rows.length}.`]
  }

  const counts = new Map<string, { name: string; count: number }>()
  for (const row of rows) {
    const name = row.domain?.trim() ?? ''
    if (!name) continue
    const key = name.toLocaleLowerCase()
    const current = counts.get(key)
    if (current) current.count += 1
    else counts.set(key, { name, count: 1 })
  }

  return Array.from(counts.values())
    .filter(({ count }) => count % quizSize !== 0)
    .map(
      ({ name, count }) =>
        `Domain "${name}" has ${count} Quiz questions. Each domain must contain a multiple of ${quizSize} so every persisted Quiz has exactly ${quizSize} questions.`,
    )
}
