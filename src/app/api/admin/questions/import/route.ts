import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'
import { normalizeAnswer, OPTION_KEYS } from '@/lib/answers'
import {
  chooseMockSortOrder,
  hasDuplicateMockExamTitle,
  isFullMockExam,
  mockExamDisplayGroup,
} from '@/lib/mock-exams'
import {
  assessExistingMockQuestionCollisions,
  explicitImportQuestionIds,
  questionIdImportErrors,
  validateNewMockImportConfig,
  type NewMockImportConfig,
} from '@/lib/question-import'

interface ImportRow {
  question_id?: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e?: string
  option_f?: string
  correct_answer: string
  explanation: string
  explanation_a?: string
  explanation_b?: string
  explanation_c?: string
  explanation_d?: string
  explanation_e?: string
  explanation_f?: string
  domain?: string
  topic?: string
  difficulty?: string
  source?: string
  status?: string
  tags?: string
  is_test?: string
}

type ContentType = 'QUIZ' | 'MOCK_EXAM' | 'PRACTICE_ONLY'

const CONTENT_TYPES: ContentType[] = ['QUIZ', 'MOCK_EXAM', 'PRACTICE_ONLY']
const TRUTHY = ['true', 'yes', 'y', '1', 'test']

function parseBool(raw: string | undefined) {
  return TRUTHY.includes((raw ?? '').trim().toLowerCase())
}

function parseTags(raw: string | undefined) {
  if (!raw) return []
  return Array.from(
    new Set(raw.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  ).slice(0, 10)
}

function validateRow(row: ImportRow, rowNum: number, usesDomains: boolean) {
  const errors: string[] = []
  if (!row.question?.trim()) errors.push(`Row ${rowNum}: question is required`)
  if (!row.option_a?.trim()) errors.push(`Row ${rowNum}: option_a is required`)
  if (!row.option_b?.trim()) errors.push(`Row ${rowNum}: option_b is required`)
  if (!row.option_c?.trim()) errors.push(`Row ${rowNum}: option_c is required`)
  if (!row.option_d?.trim()) errors.push(`Row ${rowNum}: option_d is required`)
  if (!row.explanation?.trim()) errors.push(`Row ${rowNum}: explanation is required`)
  if (usesDomains && !row.domain?.trim()) {
    errors.push(`Row ${rowNum}: domain is required for this certification`)
  }

  const correctAnswer = normalizeAnswer(row.correct_answer)
  const options: Record<string, string | undefined> = {
    A: row.option_a,
    B: row.option_b,
    C: row.option_c,
    D: row.option_d,
    E: row.option_e,
    F: row.option_f,
  }

  if (!correctAnswer) {
    errors.push(
      `Row ${rowNum}: correct_answer must be one or more of A-F (got "${row.correct_answer ?? ''}")`
    )
  } else {
    const missingOption = correctAnswer.split(',').find((key) => !options[key]?.trim())
    if (missingOption) {
      errors.push(
        `Row ${rowNum}: correct_answer names ${missingOption} but option_${missingOption.toLowerCase()} is empty`
      )
    }
  }

  const explanations: Record<string, string | undefined> = {
    A: row.explanation_a,
    B: row.explanation_b,
    C: row.explanation_c,
    D: row.explanation_d,
    E: row.explanation_e,
    F: row.explanation_f,
  }
  const orphan = OPTION_KEYS.find((key) => explanations[key]?.trim() && !options[key]?.trim())
  if (orphan) {
    errors.push(
      `Row ${rowNum}: explanation_${orphan.toLowerCase()} is filled in but option_${orphan.toLowerCase()} is empty`
    )
  }

  return { errors, correctAnswer }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as {
      questions?: ImportRow[]
      certificationId?: string
      contentType?: ContentType
      examId?: string
      newMock?: NewMockImportConfig
      publishMock?: boolean
      replaceOrphanedMockQuestions?: boolean
    }

    const questions = body.questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
    }
    if (!body.certificationId) {
      return NextResponse.json({ error: 'Certification is required' }, { status: 400 })
    }
    if (!body.contentType || !CONTENT_TYPES.includes(body.contentType)) {
      return NextResponse.json({ error: 'Content type is required' }, { status: 400 })
    }
    // Preserve the validated non-optional type across the transaction callback.
    const contentType: ContentType = body.contentType

    const certification = await prisma.certification.findUnique({
      where: { id: body.certificationId },
    })
    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    const validation = questions.map((row, index) =>
      validateRow(row, index + 2, certification.usesDomains)
    )
    const validationErrors = validation.flatMap((result) => result.errors)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Import validation failed', errors: validationErrors.slice(0, 20) },
        { status: 400 }
      )
    }

    // First catch duplicate IDs inside the CSV itself. Existing-bank collisions
    // are assessed separately so an admin can explicitly replace only safe,
    // orphaned Mock questions left behind after deleting a Mock Exam.
    const csvIdErrors = questionIdImportErrors(questions, [])
    if (csvIdErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Duplicate question_id values must be fixed before import.',
          errors: csvIdErrors.slice(0, 20),
        },
        { status: 409 },
      )
    }

    const explicitIds = explicitImportQuestionIds(questions)
    const uniqueExplicitIds = Array.from(new Set(explicitIds.map((item) => item.questionId)))
    const existingQuestions = uniqueExplicitIds.length > 0
      ? await prisma.question.findMany({
          where: { questionId: { in: uniqueExplicitIds } },
          select: {
            id: true,
            questionId: true,
            certificationId: true,
            contentType: true,
            _count: {
              select: {
                mockExamQuestions: true,
                examAnswers: true,
                bookmarks: true,
              },
            },
          },
        })
      : []

    const collisionAssessment = assessExistingMockQuestionCollisions({
      rows: questions,
      certificationId: certification.id,
      allowReplaceOrphans:
        contentType === 'MOCK_EXAM' &&
        body.replaceOrphanedMockQuestions === true,
      existingQuestions: existingQuestions.map((question) => ({
        id: question.id,
        questionId: question.questionId,
        certificationId: question.certificationId,
        contentType: question.contentType,
        mockExamCount: question._count.mockExamQuestions,
        examAnswerCount: question._count.examAnswers,
        bookmarkCount: question._count.bookmarks,
      })),
    })

    if (collisionAssessment.errors.length > 0) {
      return NextResponse.json(
        {
          error:
            contentType === 'MOCK_EXAM' && body.replaceOrphanedMockQuestions
              ? 'Some existing questions cannot be replaced safely.'
              : 'Duplicate question_id values must be fixed before import.',
          errors: collisionAssessment.errors.slice(0, 20),
        },
        { status: 409 },
      )
    }

    const replaceDatabaseIds = collisionAssessment.replaceDatabaseIds

    let existingMock:
      | {
          id: string
          title: string
          questionCount: number
          assignedCount: number
        }
      | null = null

    if (contentType === 'MOCK_EXAM') {
      if (body.examId && body.newMock) {
        return NextResponse.json(
          { error: 'Choose either an existing Mock Exam or create a new one, not both.' },
          { status: 400 },
        )
      }

      if (body.examId) {
        const exam = await prisma.mockExam.findFirst({
          where: { id: body.examId, certificationId: certification.id },
          select: {
            id: true,
            title: true,
            questionCount: true,
            _count: { select: { questions: true } },
          },
        })
        if (!exam) {
          return NextResponse.json(
            { error: 'Mock Exam not found for the selected certification' },
            { status: 404 }
          )
        }

        const missing = exam.questionCount - exam._count.questions
        if (missing <= 0) {
          return NextResponse.json(
            { error: 'This Mock Exam already has its configured number of questions' },
            { status: 409 }
          )
        }
        if (questions.length !== missing) {
          return NextResponse.json(
            {
              error: `This Mock Exam needs exactly ${missing} more question${missing === 1 ? '' : 's'}. The import contains ${questions.length}.`,
            },
            { status: 400 }
          )
        }

        existingMock = {
          id: exam.id,
          title: exam.title,
          questionCount: exam.questionCount,
          assignedCount: exam._count.questions,
        }
      } else {
        const newMockErrors = validateNewMockImportConfig(body.newMock, questions.length)
        if (newMockErrors.length > 0) {
          return NextResponse.json(
            { error: 'New Mock Exam validation failed', errors: newMockErrors },
            { status: 400 },
          )
        }

        const requestedTitle = body.newMock!.title!.trim().replace(/\s+/g, ' ')
        const siblings = await prisma.mockExam.findMany({
          where: { certificationId: certification.id },
          select: {
            id: true,
            title: true,
            sortOrder: true,
            questionCount: true,
            questionsPerAttempt: true,
            timeLimitMinutes: true,
          },
        })

        if (hasDuplicateMockExamTitle(requestedTitle, siblings)) {
          return NextResponse.json(
            {
              error: `A Mock Exam named "${requestedTitle}" already exists for ${certification.name}. Choose a different name.`,
              code: 'DUPLICATE_MOCK_NAME',
            },
            { status: 409 },
          )
        }
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const questionIds: string[] = []
      // One batch per successful import. Creating it inside this transaction
      // means a failed row cannot leave an empty/partial batch behind.
      const importBatch = await tx.questionImportBatch.create({
        data: {
          name: contentType === 'MOCK_EXAM'
            ? (existingMock?.title ?? body.newMock?.title?.trim() ?? 'Mock import')
            : `${contentType === 'PRACTICE_ONLY' ? 'Practice' : 'Quiz'} import ${new Date().toISOString()}`,
          certificationId: certification.id,
          contentType: contentType,
        },
        select: { id: true, name: true },
      })
      let examStatus: 'PUBLISHED' | null = null
      let targetMock = existingMock
      let createdMock = false

      if (replaceDatabaseIds.length > 0) {
        // Re-check every safety condition inside the same transaction. If
        // another process assigned/bookmarked/answered a question after the
        // preflight, the delete count will differ and the entire import rolls
        // back instead of deleting history.
        const deleted = await tx.question.deleteMany({
          where: {
            id: { in: replaceDatabaseIds },
            certificationId: certification.id,
            contentType: 'MOCK_EXAM',
            mockExamQuestions: { none: {} },
            examAnswers: { none: {} },
            bookmarks: { none: {} },
          },
        })

        if (deleted.count !== replaceDatabaseIds.length) {
          throw new Error('ORPHAN_REPLACEMENT_CONFLICT')
        }
      }

      if (contentType === 'MOCK_EXAM' && !targetMock) {
        const config = body.newMock!
        const title = config.title!.trim().replace(/\s+/g, ' ')
        const questionCount = Number(config.questionCount)

        // Re-check name uniqueness inside the transaction as well as during
        // preflight, then give the new mock a persistent display slot.
        const siblings = await tx.mockExam.findMany({
          where: { certificationId: certification.id },
          select: {
            id: true,
            title: true,
            sortOrder: true,
            questionCount: true,
            questionsPerAttempt: true,
            timeLimitMinutes: true,
          },
        })
        if (hasDuplicateMockExamTitle(title, siblings)) {
          throw new Error('DUPLICATE_MOCK_NAME')
        }

        const incomingGroup = mockExamDisplayGroup(questionCount)
        const sameGroup = siblings.filter(
          (candidate) =>
            isFullMockExam(candidate) &&
            mockExamDisplayGroup(candidate.questionCount) === incomingGroup,
        )
        const sortOrder = chooseMockSortOrder(title, sameGroup)

        const exam = await tx.mockExam.create({
          data: {
            title,
            slug: `${slugify(title)}-${Date.now()}`,
            certificationId: certification.id,
            description: null,
            questionCount,
            timeLimitMinutes: Number(config.timeLimitMinutes),
            passingScore: Number(config.passingScore),
            questionsPerAttempt: null,
            requireSubscription: config.requireSubscription ?? true,
            randomizeQuestions: true,
            showExplanations: false,
            sortOrder,
            status: 'DRAFT',
          },
          select: {
            id: true,
            title: true,
            questionCount: true,
          },
        })

        targetMock = {
          id: exam.id,
          title: exam.title,
          questionCount: exam.questionCount,
          assignedCount: 0,
        }
        createdMock = true
      }

      for (let index = 0; index < questions.length; index++) {
        const row = questions[index]
        const rowNum = index + 2
        const correctAnswer = validation[index].correctAnswer as string

        let categoryId: string | undefined
        const domain = row.domain?.trim()
        if (domain) {
          const slug = slugify(domain)
          const existing = await tx.category.findFirst({
            where: {
              certificationId: certification.id,
              OR: [{ slug }, { name: domain }],
            },
          })
          categoryId = existing
            ? existing.id
            : (
                await tx.category.create({
                  data: { name: domain, slug, certificationId: certification.id },
                })
              ).id
        }

        let topicId: string | undefined
        const topicName = row.topic?.trim()
        if (topicName && categoryId) {
          const topicSlug = slugify(topicName)
          const topic = await tx.topic.upsert({
            where: { slug_categoryId: { slug: topicSlug, categoryId } },
            create: { name: topicName, slug: topicSlug, categoryId },
            update: {},
          })
          topicId = topic.id
        }

        const questionId =
          row.question_id?.trim() ||
          `Q${Date.now().toString(36)}-${rowNum}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

        const difficulty = ['EASY', 'MEDIUM', 'HARD'].includes(
          row.difficulty?.toUpperCase() ?? ''
        )
          ? (row.difficulty!.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD')
          : 'MEDIUM'

        const status = row.status?.toUpperCase() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'

        const question = await tx.question.create({
          data: {
            questionId,
            text: row.question.trim(),
            optionA: row.option_a.trim(),
            optionB: row.option_b.trim(),
            optionC: row.option_c.trim(),
            optionD: row.option_d.trim(),
            optionE: row.option_e?.trim() || null,
            optionF: row.option_f?.trim() || null,
            correctAnswer,
            explanation: row.explanation.trim(),
            explanationA: row.explanation_a?.trim() || null,
            explanationB: row.explanation_b?.trim() || null,
            explanationC: row.explanation_c?.trim() || null,
            explanationD: row.explanation_d?.trim() || null,
            explanationE: row.explanation_e?.trim() || null,
            explanationF: row.explanation_f?.trim() || null,
            difficulty,
            source: row.source?.trim() || null,
            tags: parseTags(row.tags),
            isTest: parseBool(row.is_test),
            certificationId: certification.id,
            categoryId,
            topicId,
            status,
            contentType: contentType,
            importBatchId: importBatch.id,
          },
        })

        questionIds.push(question.id)

        if (targetMock) {
          await tx.mockExamQuestion.create({
            data: {
              examId: targetMock.id,
              questionId: question.id,
              sortOrder: targetMock.assignedCount + index,
            },
          })
        }
      }

      if (targetMock && body.publishMock) {
        const [assignedCount, publishedAssignedCount] = await Promise.all([
          tx.mockExamQuestion.count({ where: { examId: targetMock.id } }),
          tx.mockExamQuestion.count({
            where: {
              examId: targetMock.id,
              question: { status: 'PUBLISHED' },
            },
          }),
        ])

        if (
          assignedCount === targetMock.questionCount &&
          publishedAssignedCount === targetMock.questionCount
        ) {
          await tx.mockExam.update({
            where: { id: targetMock.id },
            data: { status: 'PUBLISHED' },
          })
          examStatus = 'PUBLISHED'
        }
      }

      return {
        questionIds,
        examStatus,
        examId: targetMock?.id ?? null,
        examTitle: targetMock?.title ?? null,
        createdMock,
        replacedQuestionCount: replaceDatabaseIds.length,
        importBatchId: importBatch.id,
        importBatchName: importBatch.name,
      }
    })

    return NextResponse.json({
      imported: created.questionIds.length,
      contentType: contentType,
      examId: created.examId,
      examTitle: created.examTitle,
      createdMock: created.createdMock,
      replacedQuestionCount: created.replacedQuestionCount,
      examStatus: created.examStatus,
      importBatchId: created.importBatchId,
      importBatchName: created.importBatchName,
      errors: [],
    })
  } catch (err) {
    console.error('[ImportQuestions]', err)

    if (err instanceof Error && err.message === 'DUPLICATE_MOCK_NAME') {
      return NextResponse.json(
        {
          error: 'A Mock Exam with this name already exists for the selected certification. Choose a different name.',
          code: 'DUPLICATE_MOCK_NAME',
        },
        { status: 409 },
      )
    }

    if (err instanceof Error && err.message === 'ORPHAN_REPLACEMENT_CONFLICT') {
      return NextResponse.json(
        {
          error:
            'An old Mock question became ineligible for safe replacement while the import was running. Nothing was changed; refresh and retry.',
        },
        { status: 409 },
      )
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error:
            'A question_id became duplicated while the import was running. Nothing was imported; update the duplicate ID and retry.',
        },
        { status: 409 },
      )
    }

    const message = err instanceof Error ? err.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
