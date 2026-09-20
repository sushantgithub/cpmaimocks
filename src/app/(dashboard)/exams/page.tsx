import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getAccessibleCertificationIds } from '@/lib/subscription'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { freshExamHref } from '@/lib/exam-links'
import { isFullMockExam } from '@/lib/mock-exams'
import { Clock, HelpCircle, Lock, CheckCircle2 } from 'lucide-react'

export default async function ExamsPage() {
  const session = await auth()
  const userId = session!.user.id

  const [accessible, publishedExams, attempts] = await Promise.all([
    getAccessibleCertificationIds(userId),
    prisma.mockExam.findMany({
      where: { status: 'PUBLISHED', timeLimitMinutes: { gt: 0 } },
      orderBy: [{ certification: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      include: { certification: { select: { id: true, name: true } } },
      // questionsPerAttempt comes through the model, and the card needs both it
      // and questionCount to describe a sample rather than the whole pool.
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

  const exams = publishedExams.filter(isFullMockExam)
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

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Mock Exams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Timed full-length mock exams for each certification
          {certificationNames.length > 0 && ` for ${certificationNames.join(', ')}`}.
        </p>
      </div>

      {!isSubscribed && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800 text-sm">
            <Lock className="h-4 w-4 inline mr-1" />
            Free plan active — Quiz 1 is free in each domain. {freeCount === 0 ? 'Full mock exams require a paid plan.' : `${freeCount} full ${freeCount === 1 ? 'mock exam is' : 'mock exams are'} also open to everyone.`}
          </p>
          <Button size="sm" className="mt-2" asChild>
            <Link href="/subscription">View Paid Plans</Link>
          </Button>
        </div>
      )}

      {exams.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No full mock exams are published yet.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.map((exam) => {
          const locked = exam.requireSubscription && !canAccess(exam.certification.id)
          const history = completedByExam.get(exam.id) ?? []
          const prev = history.length > 0 ? history[history.length - 1] : null
          const active = activeByExam.get(exam.id) ?? null
          const passed = history.some((attempt) => (attempt.score ?? 0) >= exam.passingScore)

          return (
            <Card key={exam.id} className={locked ? 'opacity-60' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{exam.title}</h3>
                    <Badge variant="secondary" className="text-xs">{exam.certification.name}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {passed && <Badge variant="success" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Passed</Badge>}
                    {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {exam.description && <p className="text-sm text-muted-foreground mb-3">{exam.description}</p>}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {exam.questionCount} question{exam.questionCount === 1 ? '' : 's'}
                  </span>
                  {exam.timeLimitMinutes > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {exam.timeLimitMinutes} mins
                    </span>
                  )}
                  <span>Pass: {exam.passingScore}%</span>
                </div>
                {history.length > 0 && (
                  <div className="mb-3 rounded-lg border overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700">
                      Attempt history
                    </div>
                    <div className="max-h-32 overflow-y-auto divide-y">
                      {history.map((attempt, index) => (
                        <Link
                          key={attempt.id}
                          href={`/results/${attempt.id}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-gray-50"
                        >
                          <span>Attempt {index + 1}</span>
                          <span className="font-semibold">{Math.round(attempt.score ?? 0)}%</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
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
                    <Link href="/subscription"><Lock className="h-4 w-4 mr-2" />Upgrade for Mock Exams</Link>
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
    </div>
  )
}
