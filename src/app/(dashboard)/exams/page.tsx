import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getAccessibleCertificationIds } from '@/lib/subscription'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { freshExamHref } from '@/lib/exam-links'
import { Clock, HelpCircle, Lock, CheckCircle2 } from 'lucide-react'

export default async function ExamsPage() {
  const session = await auth()
  const userId = session!.user.id

  const [accessible, exams, attempts] = await Promise.all([
    getAccessibleCertificationIds(userId),
    prisma.mockExam.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ certification: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      include: { certification: { select: { id: true, name: true } } },
      // questionsPerAttempt comes through the model, and the card needs both it
      // and questionCount to describe a sample rather than the whole pool.
    }),
    prisma.examAttempt.findMany({
      where: { userId, status: 'COMPLETED', examId: { not: null } },
      select: { examId: true, score: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    }),
  ])

  const canAccess = (certificationId: string) =>
    accessible === 'ALL' || accessible.includes(certificationId)
  const isSubscribed = accessible === 'ALL' || accessible.length > 0
  const freeCount = exams.filter((exam) => !exam.requireSubscription).length
  const certificationNames = Array.from(new Set(exams.map((exam) => exam.certification.name)))
  const attemptMap = new Map<string, { score: number; date: Date }>()
  attempts.forEach((a) => {
    if (a.examId && !attemptMap.has(a.examId)) {
      attemptMap.set(a.examId, { score: a.score ?? 0, date: a.submittedAt! })
    }
  })

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Mock Exams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Timed and untimed exams drawn from each certification&rsquo;s question pool
          {certificationNames.length > 0 && ` for ${certificationNames.join(', ')}`}.
        </p>
      </div>

      {!isSubscribed && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800 text-sm">
            <Lock className="h-4 w-4 inline mr-1" />
            Subscribe to unlock all mock exams — {freeCount === 0 ? 'no free exams are available right now' : `${freeCount} free ${freeCount === 1 ? 'exam is' : 'exams are'} open to everyone`}.
          </p>
          <Button size="sm" className="mt-2" asChild>
            <Link href="/subscription">View Plans</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.map((exam) => {
          const locked = exam.requireSubscription && !canAccess(exam.certification.id)
          const prev = attemptMap.get(exam.id)
          const passed = prev && prev.score >= exam.passingScore
          // A domain mock serves part of its pool, so the card has to say how
          // many an attempt gives rather than how many exist.
          const perAttempt = exam.questionsPerAttempt
          const samplesPool = perAttempt !== null && perAttempt > 0 && perAttempt < exam.questionCount
          const served = samplesPool ? perAttempt : exam.questionCount

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
                    {served} question{served === 1 ? '' : 's'}
                    {samplesPool && <span className="text-gray-400"> of {exam.questionCount}</span>}
                  </span>
                  {exam.timeLimitMinutes > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {exam.timeLimitMinutes} mins
                    </span>
                  )}
                  <span>Pass: {exam.passingScore}%</span>
                </div>
                {prev && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Last attempt: {Math.round(prev.score)}% — {prev.date.toLocaleDateString()}
                    {samplesPool && <span> · next set prioritizes missed and new questions</span>}
                  </p>
                )}
                {locked ? (
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/subscription"><Lock className="h-4 w-4 mr-2" />Unlock with Subscription</Link>
                  </Button>
                ) : (
                  <Button className="w-full" asChild>
                    <Link href={freshExamHref(exam.id)} prefetch={false}>{prev ? (samplesPool ? 'Continue Practice' : 'Retake Exam') : 'Start Exam'}</Link>
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
