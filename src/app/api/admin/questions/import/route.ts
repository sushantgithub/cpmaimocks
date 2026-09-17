import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface ImportRow {
  question_id?: string; question: string; option_a: string; option_b: string
  option_c: string; option_d: string; correct_answer: string; explanation: string
  domain?: string; topic?: string; difficulty?: string; source?: string
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

    for (const row of questions) {
      try {
        // Get or create category
        let categoryId: string | undefined
        if (row.domain?.trim()) {
          const cat = await prisma.category.upsert({
            where: { slug: row.domain.trim().toLowerCase().replace(/\s+/g, '-') },
            create: {
              name: row.domain.trim(),
              slug: row.domain.trim().toLowerCase().replace(/\s+/g, '-'),
            },
            update: {},
          })
          categoryId = cat.id
        }

        // Get or create topic
        let topicId: string | undefined
        if (row.topic?.trim() && categoryId) {
          const topicSlug = row.topic.trim().toLowerCase().replace(/\s+/g, '-')
          const topic = await prisma.topic.upsert({
            where: { slug_categoryId: { slug: topicSlug, categoryId } },
            create: { name: row.topic.trim(), slug: topicSlug, categoryId },
            update: {},
          })
          topicId = topic.id
        }

        // Generate question ID if not provided
        const questionId = row.question_id?.trim() || `Q${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

        const difficulty = (['EASY', 'MEDIUM', 'HARD'].includes(row.difficulty?.toUpperCase() ?? ''))
          ? row.difficulty!.toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD'
          : 'MEDIUM'

        await prisma.question.create({
          data: {
            questionId,
            text: row.question.trim(),
            optionA: row.option_a.trim(),
            optionB: row.option_b.trim(),
            optionC: row.option_c.trim(),
            optionD: row.option_d.trim(),
            correctAnswer: row.correct_answer.toUpperCase().trim(),
            explanation: row.explanation.trim(),
            difficulty,
            source: row.source?.trim(),
            categoryId,
            topicId,
            status: 'DRAFT',
          },
        })

        imported++
      } catch (rowError) {
        errors.push(`Row error: ${rowError instanceof Error ? rowError.message : 'Unknown'}`)
      }
    }

    return NextResponse.json({ imported, errors: errors.slice(0, 10) })
  } catch (err) {
    console.error('[ImportQuestions]', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
