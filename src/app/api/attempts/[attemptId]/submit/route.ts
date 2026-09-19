import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ExamSubmissionError, submitExam } from '@/lib/quiz'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { attemptId: string } }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const attempt = await prisma.examAttempt.findUnique({ where: { id: params.attemptId } })
    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { answers } = await req.json()
    const result = await submitExam(params.attemptId, answers ?? {})

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    if (err instanceof ExamSubmissionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 })
    }
    console.error('[SubmitExam]', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
