import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/utils'
import {
  chooseMockSortOrder,
  hasDuplicateMockExamTitle,
  isFullMockExam,
  mockExamDisplayGroup,
  sortMockExamsForDisplay,
} from '@/lib/mock-exams'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const exams = await prisma.mockExam.findMany({
    include: {
      certification: { select: { id: true, name: true, sortOrder: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  })

  // Legacy domain learning mocks are kept for historical safety but are not
  // exposed as real Mock Exams. Sort the visible mocks with the same stable
  // ordering used by the learner page.
  const mockExams = sortMockExamsForDisplay(exams.filter(isFullMockExam))

  return NextResponse.json(mockExams)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await req.json()
  const title =
    typeof data.title === 'string'
      ? data.title.trim().replace(/\s+/g, ' ')
      : ''

  if (!title) {
    return NextResponse.json({ error: 'Mock Exam name is required' }, { status: 400 })
  }
  if (!data.certificationId) {
    return NextResponse.json({ error: 'Certification is required' }, { status: 400 })
  }

  const certification = await prisma.certification.findUnique({
    where: { id: data.certificationId },
  })
  if (!certification) {
    return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
  }

  const questionCount = Number(data.questionCount)
  const timeLimitMinutes = Number(data.timeLimitMinutes ?? 120)
  const passingScore = Number(data.passingScore ?? 70)
  if (!Number.isInteger(questionCount) || questionCount <= 0) {
    return NextResponse.json(
      { error: 'questionCount must be a positive whole number' },
      { status: 400 },
    )
  }
  if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1) {
    return NextResponse.json(
      { error: 'timeLimitMinutes must be a positive whole number' },
      { status: 400 },
    )
  }
  if (!Number.isInteger(passingScore) || passingScore < 1 || passingScore > 100) {
    return NextResponse.json(
      { error: 'passingScore must be between 1 and 100' },
      { status: 400 },
    )
  }

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

  if (hasDuplicateMockExamTitle(title, siblings)) {
    return NextResponse.json(
      {
        error: `A Mock Exam named "${title}" already exists for ${certification.name}. Choose a different name.`,
        code: 'DUPLICATE_MOCK_NAME',
      },
      { status: 409 },
    )
  }

  const incomingGroup = mockExamDisplayGroup(questionCount)
  const sameGroup = siblings.filter(
    (exam) =>
      isFullMockExam(exam) &&
      mockExamDisplayGroup(exam.questionCount) === incomingGroup,
  )
  const sortOrder = chooseMockSortOrder(title, sameGroup)
  const slug = `${slugify(title)}-${Date.now()}`

  const exam = await prisma.mockExam.create({
    data: {
      title,
      slug,
      certificationId: certification.id,
      description: data.description ?? null,
      questionCount,
      timeLimitMinutes,
      passingScore,
      questionsPerAttempt: null,
      requireSubscription: data.requireSubscription ?? true,
      randomizeQuestions: true,
      showExplanations: false,
      sortOrder,
      status: 'DRAFT',
    },
  })

  return NextResponse.json(exam)
}
