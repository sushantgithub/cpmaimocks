import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'
import { isFullMockExam } from '@/lib/mock-exams'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [certifications, inventoryRows, examRows] = await Promise.all([
    prisma.certification.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { questions: true, exams: true, categories: true } },
      },
    }),
    prisma.question.groupBy({
      by: ['certificationId', 'contentType'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
    }),
    prisma.mockExam.findMany({
      select: {
        certificationId: true,
        questionCount: true,
        questionsPerAttempt: true,
        timeLimitMinutes: true,
      },
    }),
  ])

  const inventory = new Map<
    string,
    { quiz: number; mockExam: number; practiceOnly: number; practiceTotal: number }
  >()

  for (const row of inventoryRows) {
    const current = inventory.get(row.certificationId) ?? {
      quiz: 0,
      mockExam: 0,
      practiceOnly: 0,
      practiceTotal: 0,
    }
    const count = row._count._all
    if (row.contentType === 'QUIZ') current.quiz += count
    if (row.contentType === 'MOCK_EXAM') current.mockExam += count
    if (row.contentType === 'PRACTICE_ONLY') current.practiceOnly += count
    current.practiceTotal += count
    inventory.set(row.certificationId, current)
  }

  const visibleMockCount = new Map<string, number>()
  for (const exam of examRows) {
    if (!isFullMockExam(exam)) continue
    visibleMockCount.set(
      exam.certificationId,
      (visibleMockCount.get(exam.certificationId) ?? 0) + 1
    )
  }

  return NextResponse.json(
    certifications.map((certification) => ({
      ...certification,
      mockExamCount: visibleMockCount.get(certification.id) ?? 0,
      inventory: inventory.get(certification.id) ?? {
        quiz: 0,
        mockExam: 0,
        practiceOnly: 0,
        practiceTotal: 0,
      },
    }))
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const name = (data.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const slug = slugify(name)
  const clash = await prisma.certification.findFirst({ where: { OR: [{ name }, { slug }] } })
  if (clash) return NextResponse.json({ error: 'A certification with that name already exists' }, { status: 409 })

  const count = await prisma.certification.count()
  const certification = await prisma.certification.create({
    data: {
      name,
      slug,
      fullName: data.fullName?.trim() || null,
      description: data.description?.trim() || null,
      usesDomains: typeof data.usesDomains === 'boolean' ? data.usesDomains : true,
      sortOrder: count,
    },
  })
  return NextResponse.json(certification)
}
