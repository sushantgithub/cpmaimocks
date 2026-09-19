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

  const certification = data.certificationId
    ? await prisma.certification.findUnique({ where: { id: data.certificationId } })
    : await prisma.certification.findFirst({ orderBy: { sortOrder: 'asc' } })

  if (!certification) {
    return NextResponse.json({ error: 'No certification found. Run the seed first.' }, { status: 400 })
  }
  // Zero would expire the exam immediately and pass every attempt.
  const timeLimitMinutes = Number(data.timeLimitMinutes ?? 120)
  const passingScore = Number(data.passingScore ?? 70)
  if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1) {
    return NextResponse.json({ error: 'timeLimitMinutes must be at least 1' }, { status: 400 })
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
      questionCount: data.questionCount ?? 0,
      timeLimitMinutes: timeLimitMinutes,
      passingScore: passingScore,
      requireSubscription: data.requireSubscription ?? true,
      randomizeQuestions: data.randomizeQuestions ?? true,
      status: 'DRAFT',
    },
  })

  return NextResponse.json(exam)
}
