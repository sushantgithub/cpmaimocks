import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserStats } from '@/lib/quiz'
import { getUserActiveSubscriptions, getAccessibleCertificationIds } from '@/lib/subscription'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, getScoreGrade } from '@/lib/utils'
import Link from 'next/link'
import { freshExamHref } from '@/lib/exam-links'
import { Trophy, BookOpen, Target, TrendingUp, ArrowRight, Lock } from 'lucide-react'

/**
 * How many questions one attempt serves, shown against the pool it is drawn
 * from when those differ. Null, zero or a count that covers the whole pool all
 * mean the attempt receives everything.
 */
function examQuestionSummary(questionCount: number, questionsPerAttempt: number | null) {
  const samples =
    questionsPerAttempt !== null && questionsPerAttempt > 0 && questionsPerAttempt < questionCount
  const served = samples ? questionsPerAttempt : questionCount
  return `${served} question${served === 1 ? '' : 's'}${samples ? ` of ${questionCount}` : ''}`
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user.id

  const [stats, subscription, accessible, examCount, recentAttempts, exams] = await Promise.all([
    getUserStats(userId),
    getUserActiveSubscriptions(userId),
    getAccessibleCertificationIds(userId),
    prisma.mockExam.count({ where: { status: 'PUBLISHED' } }),
    prisma.examAttempt.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { exam: { select: { title: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    }),
    prisma.mockExam.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      take: 6,
    }),
  ])

  const isSubscribed = subscription.length > 0
  const canAccess = (certificationId: string) =>
    accessible === 'ALL' || accessible.includes(certificationId)

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {session!.user.name?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your progress and keep practising.</p>
      </div>

      {/* Subscription banner */}
      {!isSubscribed && (
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Upgrade to unlock all mock exams</p>
            <p className="text-sm text-blue-100 mt-0.5">Get full access to {examCount === 1 ? '1 mock exam' : `all ${examCount} mock exams`} + unlimited practice</p>
          </div>
          <Button variant="secondary" size="sm" asChild className="flex-shrink-0">
            <Link href="/subscription">Upgrade</Link>
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Exams Taken', value: stats.totalExams, icon: Trophy, color: 'text-blue-600' },
          { label: 'Questions Done', value: stats.totalQuestions, icon: BookOpen, color: 'text-purple-600' },
          { label: 'Average Score', value: `${stats.avgScore}%`, icon: Target, color: 'text-yellow-600' },
          { label: 'Best Score', value: `${stats.bestScore}%`, icon: TrendingUp, color: 'text-green-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mock Exams */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Mock Exams</h2>
          <Link href="/exams" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const locked = exam.requireSubscription && !canAccess(exam.certificationId)
            return (
              <Card key={exam.id} className={locked ? 'opacity-70' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-sm leading-tight">{exam.title}</h3>
                    {locked ? (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : !exam.requireSubscription ? (
                      <Badge variant="success" className="text-xs">Free</Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3 space-y-1">
                    <p>
                      {/* A domain mock serves part of its pool, so say how many an
                          attempt gives rather than how many exist. Zero minutes
                          means untimed, so the time is left off entirely. */}
                      {examQuestionSummary(exam.questionCount, exam.questionsPerAttempt)}
                      {exam.timeLimitMinutes > 0 && ` • ${exam.timeLimitMinutes} mins`}
                    </p>
                    <p>Passing score: {exam.passingScore}%</p>
                  </div>
                  {locked ? (
                    <Button size="sm" className="w-full" asChild variant="outline">
                      <Link href="/subscription">Unlock</Link>
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full" asChild>
                      <Link href={freshExamHref(exam.id)} prefetch={false}>Start Exam <ArrowRight className="h-3 w-3" /></Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Attempts */}
      {recentAttempts.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3">Recent Results</h2>
          <div className="space-y-2">
            {recentAttempts.map((attempt) => {
              const grade = getScoreGrade(attempt.score ?? 0)
              return (
                <div key={attempt.id} className="flex items-center justify-between bg-white rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{attempt.exam?.title ?? 'Practice Session'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(attempt.submittedAt!)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${grade.color}`}>{Math.round(attempt.score ?? 0)}%</span>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/results/${attempt.id}`}>Review</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
