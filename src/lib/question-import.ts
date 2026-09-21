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
