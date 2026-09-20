import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserStats } from '@/lib/quiz'
import { listQuizzes } from '@/lib/quizzes'
import { hasRemainingFreeQuizSession } from '@/lib/free-quiz-access'
import { readQuizAttemptConfig } from '@/lib/quiz-entitlement'
import { getUserActiveSubscriptions } from '@/lib/subscription'
import { isFullMockExam } from '@/lib/mock-exams'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, getScoreGrade } from '@/lib/utils'
import Link from 'next/link'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Trophy, BookOpen, Target, TrendingUp, CheckCircle2 } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user.id

  const [stats, subscription, recentAttempts, quizzes, publishedExamShapes] = await Promise.all([
    getUserStats(userId),
    getUserActiveSubscriptions(userId),
    prisma.examAttempt.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { exam: { select: { title: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    }),
    listQuizzes(userId),
    prisma.mockExam.findMany({
      where: { status: 'PUBLISHED' },
      select: { questionCount: true, questionsPerAttempt: true, timeLimitMinutes: true },
    }),
  ])

  const isSubscribed = subscription.length > 0
  const freeQuizAvailable = !isSubscribed && hasRemainingFreeQuizSession(quizzes)
  const examCount = publishedExamShapes.filter(isFullMockExam).length

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {session!.user.name?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your progress and keep practising.</p>
      </div>

      {/* Subscription banner */}
      {!isSubscribed && (
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <p className="font-semibold">{freeQuizAvailable ? 'Free plan active' : 'Free quiz allowance used'}</p>
          <p className="text-sm text-blue-100 mt-0.5">
            {freeQuizAvailable
              ? `Quiz 1 (10 questions) is free in each domain. Upgrade only if you want ${examCount === 1 ? 'the mock exam' : `all ${examCount} mock exams`} and unlimited practice.`
              : 'You have used the free Quiz 1 in every domain currently available to you. Upgrade for Quiz 2–6, retakes, and more practice.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {freeQuizAvailable && (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/quizzes">Continue Free Quizzes</Link>
              </Button>
            )}
            {!freeQuizAvailable && (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/quizzes">View Quiz Progress</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild className="border-blue-200 bg-transparent text-white hover:bg-blue-500 hover:text-white">
              <Link href="/subscription">View Paid Plans</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Exams Taken', value: stats.totalExams, icon: Trophy, color: 'text-blue-600', help: 'Completed Mock Exams only. Quiz and Practice sessions are not counted.' },
          { label: 'Questions Attempted', value: stats.totalQuestions, icon: BookOpen, color: 'text-purple-600', help: 'Unique questions with a checked or scored answer.' },
          { label: 'Questions Mastered', value: stats.masteredQuestions, icon: CheckCircle2, color: 'text-green-600', help: 'Unique questions whose latest checked answer is correct.' },
          { label: 'Average Score', value: `${stats.avgScore}%`, icon: Target, color: 'text-yellow-600', help: 'Average score across completed Mock Exams only. Quiz and Practice scores are excluded.' },
          { label: 'Best Score', value: `${stats.bestScore}%`, icon: TrendingUp, color: 'text-green-600', help: 'Highest score achieved in a completed Mock Exam. Quiz and Practice scores are excluded.' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
                {s.help && <InfoTooltip label={`About ${s.label}`} content={s.help} />}
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Attempts */}
      {recentAttempts.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3">Recent Results</h2>
          <div className="space-y-2">
            {recentAttempts.map((attempt) => {
              const grade = getScoreGrade(attempt.score ?? 0)
              const quizConfig = readQuizAttemptConfig(attempt.practiceConfig)
              const attemptTitle = attempt.exam?.title
                ?? (attempt.mode === 'QUIZ' ? (quizConfig?.quizTitle ?? 'Quiz Session') : 'Practice Session')
              return (
                <div key={attempt.id} className="flex items-center justify-between bg-white rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{attemptTitle}</p>
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
