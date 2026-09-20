import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

const QUIZ_SIZE = 10

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [tagQuizzes, domains] = await Promise.all([
    prisma.quiz.findMany({
      orderBy: [{ certificationId: 'asc' }, { sortOrder: 'asc' }],
      include: { certification: { select: { id: true, name: true } } },
    }),
    prisma.category.findMany({
      where: {
        certification: { isActive: true, usesDomains: true },
      },
      orderBy: [
        { certification: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
      ],
      include: {
        certification: { select: { id: true, name: true } },
      },
    }),
  ])

  const activeTagsByCertification = new Map<string, string[]>()
  for (const quiz of tagQuizzes) {
    if (!quiz.isActive) continue
    const tags = activeTagsByCertification.get(quiz.certificationId) ?? []
    if (!tags.includes(quiz.tag)) tags.push(quiz.tag)
    activeTagsByCertification.set(quiz.certificationId, tags)
  }

  const [tagCounts, domainCounts] = await Promise.all([
    Promise.all(
      tagQuizzes.map((quiz) =>
        prisma.question.count({
          where: {
            status: 'PUBLISHED',
            contentType: 'QUIZ',
            certificationId: quiz.certificationId,
            tags: { has: quiz.tag },
          },
        })
      )
    ),
    Promise.all(
      domains.map((domain) => {
        const claimedTags = activeTagsByCertification.get(domain.certificationId) ?? []
        return prisma.question.count({
          where: {
            status: 'PUBLISHED',
            contentType: 'QUIZ',
            categoryId: domain.id,
            ...(claimedTags.length > 0
              ? { NOT: { tags: { hasSome: claimedTags } } }
              : {}),
          },
        })
      })
    ),
  ])

  const domainQuizzes = domains
    .map((domain, index) => {
      const questionCount = domainCounts[index]
      const quizCount = Math.ceil(questionCount / QUIZ_SIZE)
      const slots = Array.from({ length: quizCount }, (_, slotIndex) => {
        const start = slotIndex * QUIZ_SIZE
        return {
          number: slotIndex + 1,
          questionCount: Math.min(QUIZ_SIZE, questionCount - start),
        }
      })

      return {
        id: domain.id,
        domainName: domain.name,
        certificationId: domain.certificationId,
        certification: domain.certification,
        questionCount,
        quizCount,
        slots,
      }
    })
    .filter((domain) => domain.questionCount > 0)

  return NextResponse.json({
    domainQuizzes,
    tagQuizzes: tagQuizzes.map((quiz, index) => ({
      ...quiz,
      questionCount: tagCounts[index],
    })),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const tag = typeof body.tag === 'string' ? body.tag.trim().toLowerCase() : ''
  const certificationId =
    typeof body.certificationId === 'string' ? body.certificationId : ''
  const description =
    typeof body.description === 'string' ? body.description.trim() : ''

  if (!title) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!tag) return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
  if (!certificationId) {
    return NextResponse.json({ error: 'Certification is required' }, { status: 400 })
  }

  const certification = await prisma.certification.findUnique({
    where: { id: certificationId },
  })
  if (!certification) {
    return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
  }

  const slug = slugify(title)
  const clash = await prisma.quiz.findFirst({
    where: { certificationId, slug },
  })
  if (clash) {
    return NextResponse.json(
      { error: 'A quiz with that name already exists here' },
      { status: 409 }
    )
  }

  const count = await prisma.quiz.count({ where: { certificationId } })
  const quiz = await prisma.quiz.create({
    data: {
      title,
      slug,
      tag,
      certificationId,
      description: description || null,
      sortOrder: count,
    },
  })
  return NextResponse.json(quiz)
}
