export interface AdminQuizRecordInput {
  id: string
  title: string
  description: string | null
  isActive: boolean
  sortOrder: number
  tag: string
  certificationId: string
  categoryId: string
  certification: {
    id: string
    name: string
    sortOrder: number
  }
  category: {
    id: string
    name: string
    sortOrder: number
  }
}

export interface AdminQuizQuestionInput {
  certificationId: string
  categoryId: string | null
  status: string
  tags: string[]
}

export interface AdminQuizRow {
  id: string
  title: string
  description: string | null
  isActive: boolean
  sortOrder: number
  certificationId: string
  categoryId: string
  certification: {
    id: string
    name: string
  }
  category: {
    id: string
    name: string
  }
  questionCount: number
  publishedQuestionCount: number
}

function ownershipKey(certificationId: string, categoryId: string, tag: string) {
  return `${certificationId}\u0000${categoryId}\u0000${tag}`
}

/**
 * Builds the Admin Quiz list from persisted Quiz records.
 *
 * A Quiz record is the source of truth for Quiz identity. Questions are counted
 * only when certification, domain, and the Quiz ownership tag all match. This
 * prevents the admin screen from inventing a second set of "generated" quizzes
 * from the same questions.
 */
export function buildAdminQuizRows(
  quizzes: AdminQuizRecordInput[],
  questions: AdminQuizQuestionInput[]
): AdminQuizRow[] {
  const counts = new Map<string, { total: number; published: number }>()

  for (const question of questions) {
    if (!question.categoryId) continue

    for (const tag of question.tags) {
      const key = ownershipKey(question.certificationId, question.categoryId, tag)
      const current = counts.get(key) ?? { total: 0, published: 0 }
      current.total += 1
      if (question.status === 'PUBLISHED') current.published += 1
      counts.set(key, current)
    }
  }

  return [...quizzes]
    .sort((a, b) =>
      a.certification.sortOrder - b.certification.sortOrder ||
      a.certification.name.localeCompare(b.certification.name) ||
      a.category.sortOrder - b.category.sortOrder ||
      a.category.name.localeCompare(b.category.name) ||
      a.sortOrder - b.sortOrder ||
      a.title.localeCompare(b.title)
    )
    .map((quiz) => {
      const count = counts.get(
        ownershipKey(quiz.certificationId, quiz.categoryId, quiz.tag)
      ) ?? { total: 0, published: 0 }

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        isActive: quiz.isActive,
        sortOrder: quiz.sortOrder,
        certificationId: quiz.certificationId,
        categoryId: quiz.categoryId,
        certification: {
          id: quiz.certification.id,
          name: quiz.certification.name,
        },
        category: {
          id: quiz.category.id,
          name: quiz.category.name,
        },
        questionCount: count.total,
        publishedQuestionCount: count.published,
      }
    })
}
