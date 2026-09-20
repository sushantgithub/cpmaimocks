import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(
    {
      error: 'Whole-domain reset has been replaced by per-quiz Retake. Use the Quizzes page.',
    },
    { status: 410 },
  )
}
