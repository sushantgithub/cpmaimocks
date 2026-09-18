import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasAccessToCertification } from '@/lib/subscription'
import { getExamQuestions } from '@/lib/quiz'
import { redirect } from 'next/navigation'
import { ExamInterface } from '@/components/exam/exam-interface'
import type { ExamQuestion } from '@/types'

const questionSelect = {
  id: true, questionId: true, text: true,
  optionA: true, optionB: true, optionC: true, optionD: true,
  difficulty: true,
  category: { select: { name: true } },
  topic: { select: { name: true } },
} as const

export default async function ExamPage({ params }: { params: { examId: string } }) {
  const session = await auth()
  const userId = session!.user.id

  const result = await getExamQuestions(params.examId)
  if (!result) redirect('/exams')

  const { exam, questions } = result
  if (exam.status !== 'PUBLISHED') redirect('/exams')

  if (exam.requireSubscription) {
    // Access is per certification, so a plan for one must not open another's exams
    const hasAccess = await hasAccessToCertification(userId, exam.certificationId)
    if (!hasAccess) redirect('/subscription')
  }

  const limitSeconds = exam.timeLimitMinutes * 60

  // A reload must not hand out a fresh timer or a duplicate attempt: pick up
  // the running attempt with whatever time it has left.
  const running = await prisma.examAttempt.findFirst({
    where: { userId, examId: exam.id, status: 'IN_PROGRESS' },
    orderBy: { startedAt: 'desc' },
    include: { answers: { select: { question: { select: questionSelect } } } },
  })

  if (running) {
    const elapsed = Math.floor((Date.now() - running.startedAt.getTime()) / 1000)
    if (elapsed < limitSeconds) {
      return (
        <ExamInterface
          attemptId={running.id}
          exam={{ id: exam.id, title: exam.title, timeLimitMinutes: exam.timeLimitMinutes, passingScore: exam.passingScore }}
          timeLeftSeconds={limitSeconds - elapsed}
          questions={running.answers.map((a) => toExamQuestion(a.question))}
        />
      )
    }
    await prisma.examAttempt.update({ where: { id: running.id }, data: { status: 'ABANDONED' } })
  }

  const attempt = await prisma.examAttempt.create({
    data: {
      userId,
      examId: exam.id,
      mode: 'EXAM',
      totalQuestions: questions.length,
      answers: {
        create: questions.map((q) => ({ questionId: q.id })),
      },
    },
  })

  return (
    <ExamInterface
      attemptId={attempt.id}
      exam={{ id: exam.id, title: exam.title, timeLimitMinutes: exam.timeLimitMinutes, passingScore: exam.passingScore }}
      timeLeftSeconds={limitSeconds}
      questions={questions.map(toExamQuestion)}
    />
  )
}

function toExamQuestion(q: {
  id: string; questionId: string; text: string
  optionA: string; optionB: string; optionC: string; optionD: string
  difficulty: ExamQuestion['difficulty']
  category?: { name: string } | null
  topic?: { name: string } | null
}): ExamQuestion {
  return {
    id: q.id,
    questionId: q.questionId,
    text: q.text,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    difficulty: q.difficulty,
    category: q.category?.name,
    topic: q.topic?.name,
  }
}
