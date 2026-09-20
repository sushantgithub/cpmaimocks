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
      certification: { select: { id: true, name: true } },
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

  if (!data.certificationId) {
    return NextResponse.json({ error: 'Certification is required' }, { status: 400 })
  }

  const certification = await prisma.certification.findUnique({ where: { id: data.certificationId } })
  if (!certification) {
    return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
  }
  // Zero minutes means untimed, which is how domain mocks run. Zero as a pass
  // mark is not meaningful: every attempt would pass.
  const questionCount = Number(data.questionCount)
  const timeLimitMinutes = Number(data.timeLimitMinutes ?? 120)
  const passingScore = Number(data.passingScore ?? 70)
  if (!Number.isInteger(questionCount) || questionCount <= 0) {
    return NextResponse.json({ error: 'questionCount must be a positive whole number' }, { status: 400 })
  }
  if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 0) {
    return NextResponse.json({ error: 'timeLimitMinutes must be zero (untimed) or more' }, { status: 400 })
  }
  if (!Number.isInteger(passingScore) || passingScore < 1 || passingScore > 100) {
    return NextResponse.json({ error: 'passingScore must be between 1 and 100' }, { status: 400 })
  }


  const exam = await prisma.mockExam.create({
    data: {
      title: data.title,
      slug,
      certificationId: certification.id,
      description: data.description ?? null,
      questionCount,
      timeLimitMinutes: timeLimitMinutes,
      passingScore: passingScore,
      questionsPerAttempt: Number.isInteger(Number(data.questionsPerAttempt))
        && Number(data.questionsPerAttempt) > 0 ? Number(data.questionsPerAttempt) : null,
      requireSubscription: data.requireSubscription ?? true,
      randomizeQuestions: data.randomizeQuestions ?? true,
      status: 'DRAFT',
    },
  })

  return NextResponse.json(exam)
}
