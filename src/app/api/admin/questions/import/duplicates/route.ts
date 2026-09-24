import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { duplicateQuestionTextErrors } from '@/lib/question-import'

type ContentType = 'QUIZ' | 'MOCK_EXAM' | 'PRACTICE_ONLY'
const CONTENT_TYPES: ContentType[] = ['QUIZ', 'MOCK_EXAM', 'PRACTICE_ONLY']

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    certificationId?: string
    contentType?: ContentType
    questions?: Array<{ question?: string; question_id?: string }>
    replaceOrphanedMockQuestions?: boolean
  }

  if (!body.certificationId || !body.contentType || !CONTENT_TYPES.includes(body.contentType)) {
    return NextResponse.json({ error: 'Certification and content type are required' }, { status: 400 })
  }
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
  }

  const existing = await prisma.question.findMany({
    where: {
      certificationId: body.certificationId,
      contentType: body.contentType,
    },
    select: {
      text: true,
      questionId: true,
      _count: {
        select: {
          mockExamQuestions: true,
          examAnswers: true,
          bookmarks: true,
        },
      },
    },
  })

  const incomingIds = new Set(
    body.questions.map((row) => row.question_id?.trim()).filter(Boolean),
  )
  const existingTexts = existing
    .filter((question) => {
      const replaceableOrphan =
        body.contentType === 'MOCK_EXAM' &&
        incomingIds.has(question.questionId) &&
        question._count.mockExamQuestions === 0 &&
        question._count.examAnswers === 0 &&
        question._count.bookmarks === 0
      return !replaceableOrphan
    })
    .map((question) => question.text)

  const errors = duplicateQuestionTextErrors(body.questions, existingTexts)

  const duplicates = errors.map((message) => {
    const match = /^Row (\d+):\s*(.*)$/.exec(message)
    return match
      ? { row: Number(match[1]), message: match[2] }
      : { row: 0, message }
  })

  return NextResponse.json({ duplicates })
}
