import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { restartQuiz, type QuizKey } from '@/lib/quizzes'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const key = typeof body.key === 'string' ? body.key : ''
  if (!/^(domain|tag):[A-Za-z0-9_-]+$/.test(key)) {
    return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 })
  }

  const ok = await restartQuiz(session.user.id, key as QuizKey)
  if (!ok) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
