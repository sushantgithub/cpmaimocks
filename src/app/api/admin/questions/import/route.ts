import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'
import { normalizeAnswer, OPTION_KEYS } from '@/lib/answers'

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

    let mockExam:
      | { id: string; questionCount: number; assignedCount: number }
      | null = null

    if (body.contentType === 'MOCK_EXAM') {
      if (!body.examId) {
        return NextResponse.json(
          { error: 'Choose or create a Mock Exam before importing mock questions' },
          { status: 400 }
        )
      }

      const exam = await prisma.mockExam.findFirst({
        where: { id: body.examId, certificationId: certification.id },
        select: {
          id: true,
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

      mockExam = {
        id: exam.id,
        questionCount: exam.questionCount,
        assignedCount: exam._count.questions,
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const questionIds: string[] = []

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
            contentType: body.contentType,
          },
        })

        questionIds.push(question.id)

        if (mockExam) {
          await tx.mockExamQuestion.create({
            data: {
              examId: mockExam.id,
              questionId: question.id,
              sortOrder: mockExam.assignedCount + index,
            },
          })
        }
      }

      return questionIds
    })

    return NextResponse.json({
      imported: created.length,
      contentType: body.contentType,
      examId: mockExam?.id ?? null,
      errors: [],
    })
  } catch (err) {
    console.error('[ImportQuestions]', err)
    const message = err instanceof Error ? err.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
