import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exams = await prisma.mockExam.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { questions: true, attempts: true } },
    },
  })

  return NextResponse.json(exams)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const slug = slugify(data.title) + '-' + Date.now()

  const exam = await prisma.mockExam.create({
    data: {
      title: data.title,
      slug,
      description: data.description ?? null,
      questionCount: data.questionCount ?? 0,
      timeLimitMinutes: data.timeLimitMinutes ?? 120,
      passingScore: data.passingScore ?? 70,
      requireSubscription: data.requireSubscription ?? true,
      randomizeQuestions: data.randomizeQuestions ?? true,
      status: 'DRAFT',
    },
  })

  return NextResponse.json(exam)
}
