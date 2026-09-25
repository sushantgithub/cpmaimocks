import { requireActiveSession } from '@/lib/require-auth'
import { prisma } from '@/lib/db'
import { listQuizzes } from '@/lib/quizzes'
import { hasRemainingFreeQuizSession } from '@/lib/free-quiz-access'
import { getUserActiveSubscriptions } from '@/lib/subscription'
import { isFullMockExam } from '@/lib/mock-exams'
import { dashboardMockMetrics } from '@/lib/mock-dashboard-metrics'
import { dashboardQuizMetrics } from '@/lib/quiz-dashboard-metrics'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import {
  BookOpen,
  CheckCircle2,
  ListChecks,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await requireActiveSession()
  const userId = session.user.id

  const [subscription, quizzes, publishedExamShapes, completedMockAttempts] = await Promise.all([
    getUserActiveSubscriptions(userId),
    listQuizzes(userId),
    prisma.mockExam.findMany({
      where: { status: 'PUBLISHED' },
      select: { questionCount: true, questionsPerAttempt: true, timeLimitMinutes: true },
    }),
    prisma.examAttempt.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        mode: 'EXAM',
        examId: { not: null },
      },
      select: {
        score: true,
        exam: {
          select: {
            questionCount: true,
            questionsPerAttempt: true,
            timeLimitMinutes: true,
          },
        },
      },
    }),
  ])

  const isSubscribed = subscription.length > 0
  const freeQuizAvailable = !isSubscribed && hasRemainingFreeQuizSession(quizzes)
  const examCount = publishedExamShapes.filter(isFullMockExam).length
  const mockMetrics = dashboardMockMetrics(completedMockAttempts)

  const {
    quizCount,
    completedQuizzes,
    questionsAttempted: quizQuestionsAttempted,
    questionsMastered: quizQuestionsMastered,
    accuracy: quizAccuracy,
  } = dashboardQuizMetrics(quizzes)

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your quiz and mock-exam progress at a glance.
        </p>
      </div>

      {!isSubscribed && (
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <p className="font-semibold">
            {freeQuizAvailable ? 'Free plan active' : 'Free quiz allowance used'}
          </p>
          <p className="text-sm text-blue-100 mt-0.5">
            {freeQuizAvailable
              ? `Quiz 1 (10 questions) is free in each domain. Upgrade only if you want ${examCount === 1 ? 'the mock exam' : `all ${examCount} mock exams`} and unlimited practice.`
              : 'You have used the free Quiz 1 in every domain currently available to you. Upgrade for Quiz 2–6, retakes, and more practice.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/quizzes">
                {freeQuizAvailable ? 'Continue Free Quizzes' : 'View Quiz Progress'}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-blue-200 bg-transparent text-white hover:bg-blue-500 hover:text-white"
            >
              <Link href="/subscription">View Paid Plans</Link>
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-lg">Quiz Progress</h2>
              <p className="text-xs text-muted-foreground">Untimed domain quizzes</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/quizzes">View Quizzes →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Quizzes Completed',
                value: `${completedQuizzes}/${quizCount}`,
                icon: ListChecks,
                help: 'Quizzes mastered successfully. Once completed, a later optional retake does not remove completion.',
              },
              {
                label: 'Questions Attempted',
                value: quizQuestionsAttempted,
                icon: BookOpen,
                help: 'Unique quiz questions with a checked answer.',
              },
              {
                label: 'Questions Mastered',
                value: quizQuestionsMastered,
                icon: CheckCircle2,
                help: 'Questions currently mastered. Once a quiz is completed, its mastered questions stay credited even if you retake it later.',
              },
              {
                label: 'Mastery Rate',
                value: `${quizAccuracy}%`,
                icon: Target,
                help: 'How many of the questions you’ve tried you currently get right — including ones you got wrong the first time but later fixed.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border bg-gray-50/50 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.label}</span>
                  <InfoTooltip label={`About ${item.label}`} content={item.help} />
                </div>
                <div className="text-2xl font-bold">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-lg">40-Question Mock Progress</h2>
              <p className="text-xs text-muted-foreground">Timed 40-question mock exams only</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/exams">View Mock Exams →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Exams Taken',
                value: mockMetrics.fortyQuestion.examsTaken,
                icon: Trophy,
                help: 'Completed timed 40-question Mock Exams only. Quizzes, Practice, and full-length mocks are excluded.',
              },
              {
                label: 'Average Score',
                value: `${mockMetrics.fortyQuestion.averageScore}%`,
                icon: Target,
                help: 'Average score across completed timed 40-question Mock Exams only.',
              },
              {
                label: 'Best Score',
                value: `${mockMetrics.fortyQuestion.bestScore}%`,
                icon: TrendingUp,
                help: 'Highest score achieved in a completed timed 40-question Mock Exam.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border bg-gray-50/50 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.label}</span>
                  <InfoTooltip label={`About ${item.label}`} content={item.help} />
                </div>
                <div className="text-2xl font-bold">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-lg">Full-Length Mock Progress</h2>
              <p className="text-xs text-muted-foreground">Timed full-length mock exams only</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/exams">View Mock Exams →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Exams Taken',
                value: mockMetrics.fullLength.examsTaken,
                icon: Trophy,
                help: 'Completed timed full-length Mock Exams only. Quizzes, Practice, and 40-question mocks are excluded.',
              },
              {
                label: 'Average Score',
                value: `${mockMetrics.fullLength.averageScore}%`,
                icon: Target,
                help: 'Average score across completed timed full-length Mock Exams only.',
              },
              {
                label: 'Best Score',
                value: `${mockMetrics.fullLength.bestScore}%`,
                icon: TrendingUp,
                help: 'Highest score achieved in a completed timed full-length Mock Exam.',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border bg-gray-50/50 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.label}</span>
                  <InfoTooltip label={`About ${item.label}`} content={item.help} />
                </div>
                <div className="text-2xl font-bold">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
