import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { PracticeInterface } from '@/components/exam/practice-interface'

export default async function PracticeAttemptPage({ params }: { params: { attemptId: string } }) {
  const session = await auth()
  if (!session) redirect('/login')

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: params.attemptId },
    include: {
      answers: {
        include: {
          question: {
            select: {
              id: true,
              questionId: true,
              text: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              correctAnswer: true,
              explanation: true,
              difficulty: true,
              category: { select: { name: true } },
              topic: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!attempt || attempt.userId !== session.user.id) notFound()
  if (attempt.mode !== 'PRACTICE' && attempt.mode !== 'QUIZ') redirect('/practice')

  // If already completed, redirect to results
  if (attempt.status === 'COMPLETED') {
    redirect(`/results/${attempt.id}`)
  }

  const questions = attempt.answers.map((a) => ({
    ...a.question,
    category: a.question.category?.name,
    topic: a.question.topic?.name,
    selectedAnswer: a.selectedAnswer,
  }))

  return <PracticeInterface attemptId={attempt.id} questions={questions} />
}
