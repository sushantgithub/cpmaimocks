import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'
import { normalizeAnswer, OPTION_KEYS } from '@/lib/answers'

interface ImportRow {
  question_id?: string; question: string; option_a: string; option_b: string
  option_c: string; option_d: string; option_e?: string; option_f?: string
  correct_answer: string; explanation: string
  // Why each option is right or wrong. Optional: questions imported before
  // these columns existed still render with the explanation alone.
  explanation_a?: string; explanation_b?: string; explanation_c?: string
  explanation_d?: string; explanation_e?: string; explanation_f?: string
  domain?: string; topic?: string; difficulty?: string; source?: string
  status?: string
  // Comma-separated labels that group questions across domains, e.g. the
  // algorithm drill, which draws from whichever domains its questions sit in.
  tags?: string
  is_test?: string
}

const TRUTHY = ['true', 'yes', 'y', '1', 'test']

function parseBool(raw: string | undefined) {
  return TRUTHY.includes((raw ?? '').trim().toLowerCase())
}

function parseTags(raw: string | undefined) {
  if (!raw) return []
  return Array.from(new Set(
    raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  )).slice(0, 10)
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { questions, certificationId } = await req.json() as {
      questions: ImportRow[]
      certificationId?: string
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
    }

    const certification = certificationId
      ? await prisma.certification.findUnique({ where: { id: certificationId } })
      : await prisma.certification.findFirst({ orderBy: { sortOrder: 'asc' } })

    if (!certification) {
      return NextResponse.json({ error: 'No certification found. Run the seed first.' }, { status: 400 })
    }

    let imported = 0
    const errors: string[] = []

    for (let index = 0; index < questions.length; index++) {
      const row = questions[index]
      const rowNum = index + 1
      try {
        // One letter, or several comma separated for a multiple-response
        // question, e.g. "A,C". Every letter must have an option behind it.
        const correctAnswer = normalizeAnswer(row.correct_answer)
        const options: Record<string, string | undefined> = {
          A: row.option_a, B: row.option_b, C: row.option_c,
          D: row.option_d, E: row.option_e, F: row.option_f,
        }
        if (!correctAnswer) {
          errors.push(`Row ${rowNum}: correct_answer must be one or more of A-F (got "${row.correct_answer}")`)
          continue
        }
        const missingOption = correctAnswer.split(',').find((k) => !options[k]?.trim())
        if (missingOption) {
          errors.push(`Row ${rowNum}: correct_answer names ${missingOption} but option_${missingOption.toLowerCase()} is empty`)
          continue
        }

        // An explanation for an option that does not exist means the columns
        // are misaligned — worth catching before hundreds of rows land.
        const explanations: Record<string, string | undefined> = {
          A: row.explanation_a, B: row.explanation_b, C: row.explanation_c,
          D: row.explanation_d, E: row.explanation_e, F: row.explanation_f,
        }
        const orphan = OPTION_KEYS.find((k) => explanations[k]?.trim() && !options[k]?.trim())
        if (orphan) {
          errors.push(`Row ${rowNum}: explanation_${orphan.toLowerCase()} is filled in but option_${orphan.toLowerCase()} is empty`)
          continue
        }

        // Match the existing category by name or slug before creating a new one,
        // since Category.name is unique and would otherwise collide.
        let categoryId: string | undefined
        const domain = row.domain?.trim()
        if (domain) {
          const slug = slugify(domain)
          const existing = await prisma.category.findFirst({
            where: {
              certificationId: certification.id,
              OR: [{ slug }, { name: domain }],
            },
          })
          categoryId = existing
            ? existing.id
            : (await prisma.category.create({
                data: { name: domain, slug, certificationId: certification.id },
              })).id
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
            source: row.source?.trim(),
            tags: parseTags(row.tags),
            isTest: parseBool(row.is_test),
            certificationId: certification.id,
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
