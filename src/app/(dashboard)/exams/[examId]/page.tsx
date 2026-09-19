import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasAccessToCertification } from '@/lib/subscription'
import { getExamQuestions, submitExam } from '@/lib/quiz'
import { redirect } from 'next/navigation'
import { ExamInterface } from '@/components/exam/exam-interface'
import type { ExamQuestion } from '@/types'
import { expectedCount } from '@/lib/answers'

const questionSelect = {
  id: true, questionId: true, text: true,
  optionA: true, optionB: true, optionC: true, optionD: true,
  optionE: true, optionF: true,
  correctAnswer: true,
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
    include: { answers: { select: { selectedAnswer: true, isMarked: true, question: { select: questionSelect } } } },
  })

  if (running) {
    const elapsed = Math.floor((Date.now() - running.startedAt.getTime()) / 1000)
    // Resume only while the attempt still mirrors the exam. If its questions
    // have since been changed, resuming would pin the taker to the old set —
    // someone who started when the exam held one question would otherwise be
    // served that same question until the time limit expired.
    const attemptQuestionIds = new Set(running.answers.map((a) => a.question.id))
    const matchesExam =
      attemptQuestionIds.size === questions.length &&
      questions.every((q) => attemptQuestionIds.has(q.id))

    const expired = limitSeconds > 0 && elapsed >= limitSeconds

    if (!expired && matchesExam) {
      const initialAnswers = Object.fromEntries(
        running.answers
          .filter((a) => a.selectedAnswer)
          .map((a) => [a.question.id, a.selectedAnswer as string])
      )
      const initialMarked = running.answers
        .filter((a) => a.isMarked)
        .map((a) => a.question.id)

      return (
        <ExamInterface
          attemptId={running.id}
          exam={{ id: exam.id, title: exam.title, timeLimitMinutes: exam.timeLimitMinutes, passingScore: exam.passingScore }}
          timeLeftSeconds={limitSeconds > 0 ? Math.max(0, limitSeconds - elapsed) : 0}
          questions={running.answers.map((a) => toExamQuestion(a.question))}
          initialAnswers={initialAnswers}
          initialMarked={initialMarked}
        />
      )
    }

    if (expired && matchesExam) {
      // Autosaved selections are the source of truth when the learner returns
      // after time has expired. submitExam merges them before grading.
      await submitExam(running.id, {})
      redirect(`/results/${running.id}`)
    }

    // Only abandon when the exam changed underneath the attempt. Scoring that
    // stale question set would be misleading.
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
  optionE?: string | null; optionF?: string | null
  correctAnswer: string
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
    optionE: q.optionE,
    optionF: q.optionF,
    // Only the number reaches the browser, never the letters themselves.
    selectCount: expectedCount(q.correctAnswer),
    difficulty: q.difficulty,
    category: q.category?.name,
    topic: q.topic?.name,
  }
}
