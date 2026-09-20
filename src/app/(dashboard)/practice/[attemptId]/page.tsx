import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { PracticeInterface } from '@/components/exam/practice-interface'
import { hasAccessToCertification } from '@/lib/subscription'
import { readQuizAttemptConfig } from '@/lib/quiz-entitlement'

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
              optionE: true,
              optionF: true,
              correctAnswer: true,
              explanation: true,
              explanationA: true,
              explanationB: true,
              explanationC: true,
              explanationD: true,
              explanationE: true,
              explanationF: true,
              difficulty: true,
              certificationId: true,
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

  if (attempt.status === 'COMPLETED') {
    redirect(`/results/${attempt.id}`)
  }

  const certificationId = attempt.answers[0]?.question.certificationId
  const hasPremiumAccess = certificationId
    ? await hasAccessToCertification(session.user.id, certificationId)
    : false
  const quizConfig = attempt.mode === 'QUIZ'
    ? readQuizAttemptConfig(attempt.practiceConfig)
    : null

  // A paid quiz sitting cannot be continued after its entitlement expires.
  // A sitting explicitly created under the Free tier remains resumable.
  if (
    attempt.mode === 'QUIZ' &&
    quizConfig?.accessTier === 'PAID' &&
    !hasPremiumAccess
  ) {
    redirect('/subscription')
  }

  const questionOrder = quizConfig?.questionIds?.length
    ? new Map(quizConfig.questionIds.map((id, index) => [id, index]))
    : null
  const orderedAnswers = questionOrder
    ? [...attempt.answers].sort(
        (a, b) =>
          (questionOrder.get(a.questionId) ?? Number.MAX_SAFE_INTEGER) -
          (questionOrder.get(b.questionId) ?? Number.MAX_SAFE_INTEGER)
      )
    : attempt.answers

  const questions = orderedAnswers.map((answer) => ({
    ...answer.question,
    category: answer.question.category?.name,
    topic: answer.question.topic?.name,
    // Only checked answers are restored as completed. Old draft rows must not
    // reveal feedback after a reload.
    selectedAnswer: answer.isCorrect !== null ? answer.selectedAnswer : null,
  }))

  return (
    <PracticeInterface
      attemptId={attempt.id}
      questions={questions}
      mode={attempt.mode === 'QUIZ' ? 'QUIZ' : 'PRACTICE'}
      sessionTitle={quizConfig?.quizTitle}
      bookmarksEnabled={hasPremiumAccess}
      freeQuizSession={
        attempt.mode === 'QUIZ' &&
        (quizConfig?.accessTier === 'FREE' || (!quizConfig?.accessTier && !hasPremiumAccess))
      }
    />
  )
}
