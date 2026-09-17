import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

interface ImportRow {
  question_id?: string; question: string; option_a: string; option_b: string
  option_c: string; option_d: string; correct_answer: string; explanation: string
  domain?: string; topic?: string; difficulty?: string; source?: string
  status?: string
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { questions } = await req.json() as { questions: ImportRow[] }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
    }

    let imported = 0
    const errors: string[] = []

    for (let index = 0; index < questions.length; index++) {
      const row = questions[index]
      const rowNum = index + 1
      try {
        const correctAnswer = row.correct_answer?.trim().toUpperCase()
        if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
          errors.push(`Row ${rowNum}: correct_answer must be A, B, C or D (got "${row.correct_answer}")`)
          continue
        }

        // Match the existing category by name or slug before creating a new one,
        // since Category.name is unique and would otherwise collide.
        let categoryId: string | undefined
        const domain = row.domain?.trim()
        if (domain) {
          const slug = slugify(domain)
          const existing = await prisma.category.findFirst({
            where: { OR: [{ slug }, { name: domain }] },
          })
          categoryId = existing
            ? existing.id
            : (await prisma.category.create({ data: { name: domain, slug } })).id
        }

        let topicId: string | undefined
        const topicName = row.topic?.trim()
        if (topicName && categoryId) {
          const topicSlug = slugify(topicName)
          const topic = await prisma.topic.upsert({
            where: { slug_categoryId: { slug: topicSlug, categoryId } },
            create: { name: topicName, slug: topicSlug, categoryId },
            update: {},
          })
          topicId = topic.id
        }

        const questionId = row.question_id?.trim()
          || `Q${Date.now().toString(36)}-${rowNum}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

        const difficulty = (['EASY', 'MEDIUM', 'HARD'].includes(row.difficulty?.toUpperCase() ?? ''))
          ? row.difficulty!.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD'
          : 'MEDIUM'

        const status = row.status?.toUpperCase() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'

        await prisma.question.create({
          data: {
            questionId,
            text: row.question.trim(),
            optionA: row.option_a.trim(),
            optionB: row.option_b.trim(),
            optionC: row.option_c.trim(),
            optionD: row.option_d.trim(),
            correctAnswer,
            explanation: row.explanation.trim(),
            difficulty,
            source: row.source?.trim(),
            categoryId,
            topicId,
            status,
          },
        })

        imported++
      } catch (rowError) {
        errors.push(`Row ${rowNum}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({ imported, errors: errors.slice(0, 10) })
  } catch (err) {
    console.error('[ImportQuestions]', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
