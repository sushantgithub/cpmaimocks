import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserActiveSubscription } from '@/lib/subscription'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Clock, HelpCircle, Lock, CheckCircle2 } from 'lucide-react'

export default async function ExamsPage() {
  const session = await auth()
  const userId = session!.user.id

  const [subscription, exams, attempts] = await Promise.all([
    getUserActiveSubscription(userId),
    prisma.mockExam.findMany({ where: { status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' } }),
    prisma.examAttempt.findMany({
      where: { userId, status: 'COMPLETED', examId: { not: null } },
      select: { examId: true, score: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    }),
  ])

  const isSubscribed = !!subscription
  const attemptMap = new Map<string, { score: number; date: Date }>()
  attempts.forEach((a) => {
    if (a.examId && !attemptMap.has(a.examId)) {
      attemptMap.set(a.examId, { score: a.score ?? 0, date: a.submittedAt! })
    }
  })

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">CPMAI Mock Exams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          120-question full-length exams in real exam format with 3-hour timer.
        </p>
      </div>

      {!isSubscribed && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800 text-sm">
            <Lock className="h-4 w-4 inline mr-1" />
            Subscribe to unlock all mock exams — currently showing 1 free exam.
          </p>
          <Button size="sm" className="mt-2" asChild>
            <Link href="/subscription">View Plans</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.map((exam, i) => {
          const locked = exam.requireSubscription && !isSubscribed && i > 0
          const prev = attemptMap.get(exam.id)
          const passed = prev && prev.score >= exam.passingScore

          return (
            <Card key={exam.id} className={locked ? 'opacity-60' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{exam.title}</h3>
                  <div className="flex gap-2">
                    {passed && <Badge variant="success" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Passed</Badge>}
                    {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {exam.description && <p className="text-sm text-muted-foreground mb-3">{exam.description}</p>}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5" />{exam.questionCount} questions</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{exam.timeLimitMinutes} mins</span>
                  <span>Pass: {exam.passingScore}%</span>
                </div>
                {prev && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Last attempt: {Math.round(prev.score)}% — {prev.date.toLocaleDateString()}
                  </p>
                )}
                {locked ? (
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/subscription"><Lock className="h-4 w-4 mr-2" />Unlock with Subscription</Link>
                  </Button>
                ) : (
                  <Button className="w-full" asChild>
                    <Link href={`/exams/${exam.id}`}>{prev ? 'Retake Exam' : 'Start Exam'}</Link>
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
