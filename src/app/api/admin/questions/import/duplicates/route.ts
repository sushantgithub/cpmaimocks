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
    questions?: Array<{ question?: string }>
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
    select: { text: true },
  })

  const errors = duplicateQuestionTextErrors(
    body.questions,
    existing.map((question) => question.text),
  )

  return NextResponse.json({ errors })
}
