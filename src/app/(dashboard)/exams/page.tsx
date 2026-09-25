import { requireActiveSession } from '@/lib/require-auth'
import { prisma } from '@/lib/db'
import { getAccessibleCertificationIds } from '@/lib/subscription'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { freshExamHref } from '@/lib/exam-links'
import {
  isFullMockExam,
  mockExamDisplayGroup,
  mockExamDisplayLabel,
  sortMockExamsForDisplay,
} from '@/lib/mock-exams'
import { Clock, HelpCircle, Lock, CheckCircle2 } from 'lucide-react'
import { MockAttemptHistory } from '@/components/dashboard/mock-attempt-history'
import { newestMockAttemptsFirst } from '@/lib/mock-attempt-history'

export default async function ExamsPage() {
  const session = await requireActiveSession()
  const userId = session.user.id

  const [accessible, publishedExams, attempts] = await Promise.all([
    getAccessibleCertificationIds(userId),
    prisma.mockExam.findMany({
      where: { status: 'PUBLISHED', timeLimitMinutes: { gt: 0 } },
      include: {
        certification: { select: { id: true, name: true, sortOrder: true } },
      },
    }),
    prisma.examAttempt.findMany({
      where: {
        userId,
        mode: 'EXAM',
        status: { in: ['IN_PROGRESS', 'COMPLETED'] },
        examId: { not: null },
      },
      select: {
        id: true,
        examId: true,
        status: true,
        score: true,
        startedAt: true,
        submittedAt: true,
      },
      orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
    }),
  ])

  const exams = sortMockExamsForDisplay(publishedExams.filter(isFullMockExam))
  const fortyQuestionExams = exams.filter(
    (exam) => mockExamDisplayGroup(exam.questionCount) === 'FORTY_QUESTION'
  )
  const fullLengthExams = exams.filter(
    (exam) => mockExamDisplayGroup(exam.questionCount) === 'FULL_LENGTH'
  )
  const otherExams = exams.filter(
    (exam) => mockExamDisplayGroup(exam.questionCount) === 'OTHER'
  )

  const canAccess = (certificationId: string) =>
    accessible === 'ALL' || accessible.includes(certificationId)
  const isSubscribed = accessible === 'ALL' || accessible.length > 0
  const freeCount = exams.filter((exam) => !exam.requireSubscription).length
  const certificationNames = Array.from(new Set(exams.map((exam) => exam.certification.name)))
  const completedByExam = new Map<string, typeof attempts>()
  const activeByExam = new Map<string, (typeof attempts)[number]>()

  attempts.forEach((attempt) => {
    if (!attempt.examId) return
    if (attempt.status === 'IN_PROGRESS') {
      activeByExam.set(attempt.examId, attempt)
      return
    }
    const history = completedByExam.get(attempt.examId) ?? []
    history.push(attempt)
    completedByExam.set(attempt.examId, history)
  })

  function renderExamCards(sectionExams: typeof exams) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sectionExams.map((exam) => {
          const locked = exam.requireSubscription && !canAccess(exam.certification.id)
          const history = completedByExam.get(exam.id) ?? []
          const historyNewestFirst = newestMockAttemptsFirst(history)
          const historyForDisplay = historyNewestFirst.map((attempt) => ({
            id: attempt.id,
            score: attempt.score,
            attemptNumber: history.indexOf(attempt) + 1,
          }))
          const prev = historyNewestFirst[0] ?? null
          const active = activeByExam.get(exam.id) ?? null
          const passed = history.some((attempt) => (attempt.score ?? 0) >= exam.passingScore)

          return (
            <Card key={exam.id} className={locked ? 'opacity-60' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-snug">{exam.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {exam.certification.name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {mockExamDisplayLabel(exam.questionCount)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {passed && (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Passed
                      </Badge>
                    )}
                    {locked && <Lock className="h-4 w-4 text-muted-foreground mt-1" />}
                  </div>
                </div>

                {exam.description && (
                  <p className="text-sm text-muted-foreground mb-3">{exam.description}</p>
                )}

                <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {exam.questionCount} question{exam.questionCount === 1 ? '' : 's'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {exam.timeLimitMinutes} mins
                  </span>
                  <span>Pass: {exam.passingScore}%</span>
                </div>

                <MockAttemptHistory attempts={historyForDisplay} />

                {active && (
                  <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-3">
                    Attempt {history.length + 1} is in progress. The timer continues while you are away.
                  </p>
                )}

                {prev && !active && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Latest: {Math.round(prev.score ?? 0)}% — {(prev.submittedAt ?? prev.startedAt).toLocaleDateString()}
                  </p>
                )}

                {locked ? (
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/subscription">
                      <Lock className="h-4 w-4 mr-2" />
                      Upgrade for Mock Exams
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full" asChild>
                    <Link
                      href={active ? `/exams/${exam.id}` : freshExamHref(exam.id)}
                      prefetch={false}
                    >
                      {active ? 'Resume Exam' : history.length > 0 ? 'Retake Exam' : 'Start Exam'}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  function renderSection(
    title: string,
    description: string,
    sectionExams: typeof exams,
  ) {
    if (sectionExams.length === 0) return null

    return (
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {sectionExams.length}
          </Badge>
        </div>
        {renderExamCards(sectionExams)}
      </section>
    )
  }

  return (
    <div className="space-y-7 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Mock Exams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Timed practice mocks and full-length exam simulations
          {certificationNames.length > 0 && ` for ${certificationNames.join(', ')}`}.
        </p>
      </div>

      {!isSubscribed && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800 text-sm">
            <Lock className="h-4 w-4 inline mr-1" />
            Free plan active — Quiz 1 is free in each domain. {freeCount === 0
              ? 'Mock exams require a paid plan.'
              : `${freeCount} mock ${freeCount === 1 ? 'exam is' : 'exams are'} also open to everyone.`}
          </p>
          <Button size="sm" className="mt-2" asChild>
            <Link href="/subscription">View Paid Plans</Link>
          </Button>
        </div>
      )}

      {exams.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No mock exams are published yet.
          </CardContent>
        </Card>
      )}

      {renderSection(
        '40-Question Mock Exams',
        'Focused timed mocks for quicker exam practice and progress checks.',
        fortyQuestionExams,
      )}

      {renderSection(
        'Full-Length Mock Exams',
        'Complete exam simulations designed for full-session practice.',
        fullLengthExams,
      )}

      {renderSection(
        'Other Mock Exams',
        'Additional timed mock formats.',
        otherExams,
      )}
    </div>
  )
}
