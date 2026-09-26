export type ImportHistoryContentType = 'QUIZ' | 'MOCK_EXAM' | 'PRACTICE_ONLY'

export type ImportHistoryBatch = {
  id: string
  name: string
  contentType: ImportHistoryContentType
  sourceFilename?: string | null
  domains?: string[]
  quizNumbers?: number[]
  certification: { name: string }
}

export type ImportHistoryFilters = {
  query: string
  certification: string
  contentType: 'ALL' | ImportHistoryContentType
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function filterImportHistoryBatches<T extends ImportHistoryBatch>(
  batches: T[],
  filters: ImportHistoryFilters
): T[] {
  const query = normalize(filters.query)

  return batches.filter((batch) => {
    if (
      filters.certification !== 'ALL' &&
      batch.certification.name !== filters.certification
    ) {
      return false
    }

    if (
      filters.contentType !== 'ALL' &&
      batch.contentType !== filters.contentType
    ) {
      return false
    }

    if (!query) return true

    const searchable = [
      batch.sourceFilename ?? '',
      batch.name,
      batch.certification.name,
      batch.contentType === 'PRACTICE_ONLY'
        ? 'practice'
        : batch.contentType === 'MOCK_EXAM'
          ? 'mock'
          : 'quiz',
      ...(batch.domains ?? []),
      ...(batch.quizNumbers ?? []).map((number) => `quiz ${number}`),
    ]
      .join(' ')
      .toLocaleLowerCase()

    return searchable.includes(query)
  })
}
