import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasAccessToCertification } from '@/lib/subscription'
import { getExamQuestions } from '@/lib/quiz'
import { redirect } from 'next/navigation'
import { ExamInterface } from '@/components/exam/exam-interface'

export default async function ExamPage({ params }: { params: { examId: string } }) {
  const session = await auth()
  const userId = session!.user.id

  const result = await getExamQuestions(params.examId)
  if (!result) redirect('/exams')

  const { exam, questions } = result

  if (exam.requireSubscription) {
    // Access is per certification, so a CPMAI plan must not open a PMP exam
    const hasAccess = await hasAccessToCertification(userId, exam.certificationId)
    const isFirstFreeExam = (await prisma.mockExam.findMany({
      where: { status: 'PUBLISHED', requireSubscription: false },
      orderBy: { sortOrder: 'asc' },
      take: 1,
    })).some((e) => e.id === exam.id)

    if (!hasAccess && !isFirstFreeExam) redirect('/subscription')
  }

  // Create attempt
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
      questions={questions.map((q) => ({
        id: q.id,
        questionId: q.questionId,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        difficulty: q.difficulty,
        category: (q as { category?: { name: string } }).category?.name,
        topic: (q as { topic?: { name: string } }).topic?.name,
      }))}
    />
  )
}
