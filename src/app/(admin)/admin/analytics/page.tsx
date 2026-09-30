import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Users, BookOpen, TrendingUp, CreditCard, Trophy, Target } from 'lucide-react'
import { ANALYTICS_EVENTS } from '@/lib/analytics-events'

// Viewed Pricing and Viewed Free Questions are two separate entry points,
// not sequential steps — someone can reach either first, or skip both and
// go straight to sign-up. The bars are a volume comparison across stages,
// not a strict per-visitor conversion path.
const FUNNEL_STEPS = [
  { event: ANALYTICS_EVENTS.PRICING_VIEWED, label: 'Viewed Pricing' },
  { event: ANALYTICS_EVENTS.FREE_QUESTIONS_VIEWED, label: 'Viewed Free Questions' },
  { event: ANALYTICS_EVENTS.REGISTER_STARTED, label: 'Started Sign Up' },
  { event: ANALYTICS_EVENTS.REGISTER_COMPLETED, label: 'Completed Sign Up' },
  { event: ANALYTICS_EVENTS.CHECKOUT_STARTED, label: 'Started Checkout' },
  { event: ANALYTICS_EVENTS.PURCHASE_COMPLETED, label: 'Completed Purchase' },
] as const

export default async function AdminAnalyticsPage() {
  const [
    totalUsers,
    newUsersThisMonth,
    totalQuestions,
    publishedQuestions,
    totalAttempts,
    completedAttempts,
    activeSubscriptions,
    revenueAll,
    revenueThisMonth,
    topExams,
    recentAttempts,
    scoreDistribution,
    funnelCounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setDate(1)) } } }),
    prisma.question.count(),
    prisma.question.count({ where: { status: 'PUBLISHED' } }),
    prisma.examAttempt.count(),
    prisma.examAttempt.count({ where: { status: 'COMPLETED' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
    prisma.payment.aggregate({
      where: { status: 'SUCCESS', createdAt: { gte: new Date(new Date().setDate(1)) } },
      _sum: { amount: true },
    }),
    prisma.mockExam.findMany({
      where: { status: 'PUBLISHED' },
      include: { _count: { select: { attempts: true } } },
      orderBy: { attempts: { _count: 'desc' } },
      take: 5,
    }),
    prisma.examAttempt.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
        exam: { select: { title: true } },
      },
    }),
    prisma.examAttempt.groupBy({
      by: ['score'],
      where: { status: 'COMPLETED', score: { not: null } },
      _count: true,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: {
        event: { in: FUNNEL_STEPS.map((s) => s.event) },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _count: true,
    }),
  ])

  const funnelCountByEvent = new Map(funnelCounts.map((f) => [f.event, f._count]))
  const funnelRows = FUNNEL_STEPS.map((s) => ({ ...s, count: funnelCountByEvent.get(s.event) ?? 0 }))
  const funnelMax = Math.max(...funnelRows.map((r) => r.count), 1)

  const avgScore = completedAttempts > 0
    ? await prisma.examAttempt.aggregate({ where: { status: 'COMPLETED' }, _avg: { score: true } })
    : { _avg: { score: 0 } }

  const statCards = [
    { icon: Users, label: 'Total Users', value: totalUsers, sub: `+${newUsersThisMonth} this month`, color: 'text-blue-600' },
    { icon: BookOpen, label: 'Questions', value: `${publishedQuestions}/${totalQuestions}`, sub: 'published / total', color: 'text-purple-600' },
    { icon: Trophy, label: 'Exam Attempts', value: completedAttempts, sub: `${totalAttempts} started`, color: 'text-yellow-600' },
    { icon: Target, label: 'Avg Score', value: `${Math.round(avgScore._avg.score ?? 0)}%`, sub: 'across all attempts', color: 'text-green-600' },
    { icon: TrendingUp, label: 'Active Subs', value: activeSubscriptions, sub: 'paying users', color: 'text-indigo-600' },
    { icon: CreditCard, label: 'Revenue', value: formatCurrency(revenueAll._sum.amount ?? 0), sub: `${formatCurrency(revenueThisMonth._sum.amount ?? 0)} this month`, color: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm font-medium text-gray-700">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top exams */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Exams by Attempts</CardTitle></CardHeader>
          <CardContent>
            {topExams.length === 0 ? (
              <p className="text-sm text-gray-500">No exam attempts yet.</p>
            ) : (
              <div className="space-y-3">
                {topExams.map((exam, i) => (
                  <div key={exam.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{exam.title}</p>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${topExams[0]._count.attempts > 0 ? (exam._count.attempts / topExams[0]._count.attempts) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{exam._count.attempts}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent attempts */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent Completions</CardTitle></CardHeader>
          <CardContent>
            {recentAttempts.length === 0 ? (
              <p className="text-sm text-gray-500">No completions yet.</p>
            ) : (
              <div className="space-y-2">
                {recentAttempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{a.user.name ?? a.user.email}</p>
                      <p className="text-xs text-gray-500 truncate">{a.exam?.title ?? 'Practice'}</p>
                    </div>
                    <span className={`font-bold ml-2 flex-shrink-0 ${(a.score ?? 0) >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                      {Math.round(a.score ?? 0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score buckets */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Score Distribution</CardTitle></CardHeader>
        <CardContent>
          {(() => {
            const buckets = [
              { label: '0–39%', min: 0, max: 40 },
              { label: '40–59%', min: 40, max: 60 },
              { label: '60–69%', min: 60, max: 70 },
              { label: '70–79%', min: 70, max: 80 },
              { label: '80–89%', min: 80, max: 90 },
              { label: '90–100%', min: 90, max: 101 },
            ]
            const counts = buckets.map(b => ({
              ...b,
              count: scoreDistribution.filter(s => (s.score ?? 0) >= b.min && (s.score ?? 0) < b.max)
                .reduce((acc, s) => acc + s._count, 0),
            }))
            const max = Math.max(...counts.map(c => c.count), 1)
            return (
              <div className="space-y-2">
                {counts.map(b => (
                  <div key={b.label} className="flex items-center gap-3 text-sm">
                    <span className="w-16 text-gray-600 text-right flex-shrink-0">{b.label}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.min >= 70 ? 'bg-green-400' : b.min >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${(b.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-gray-700 font-semibold flex-shrink-0">{b.count}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Conversion funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            Last 30 days. Viewed Pricing and Viewed Free Questions are separate entry points, not sequential steps.
          </p>
        </CardHeader>
        <CardContent>
          {funnelRows.every((r) => r.count === 0) ? (
            <p className="text-sm text-gray-500">No funnel events recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {funnelRows.map((r) => (
                <div key={r.event} className="flex items-center gap-3 text-sm">
                  <span className="w-36 sm:w-40 text-gray-600 text-right flex-shrink-0">{r.label}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(r.count / funnelMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-gray-700 font-semibold flex-shrink-0">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
