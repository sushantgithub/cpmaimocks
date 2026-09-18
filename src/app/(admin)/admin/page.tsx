import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, Trophy, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function AdminDashboard() {
  const [
    totalUsers, activeSubscriptions, totalQuestions,
    totalExams, totalAttempts,
    recentPayments, recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.question.count({ where: { status: 'PUBLISHED' } }),
    prisma.mockExam.count({ where: { status: 'PUBLISHED' } }),
    prisma.examAttempt.count({ where: { status: 'COMPLETED' } }),
    prisma.payment.findMany({
      where: { status: 'SUCCESS' },
      include: { user: { select: { name: true, email: true } }, plan: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true, role: true },
    }),
  ])

  const totalRevenue = await prisma.payment.aggregate({
    where: { status: 'SUCCESS' },
    _sum: { amount: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your CertMocks platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-600' },
          { label: 'Active Subs', value: activeSubscriptions, icon: CreditCard, color: 'text-green-600' },
          { label: 'Questions', value: totalQuestions, icon: BookOpen, color: 'text-purple-600' },
          { label: 'Exams', value: totalExams, icon: Trophy, color: 'text-yellow-600' },
          { label: 'Attempts', value: totalAttempts, icon: TrendingUp, color: 'text-indigo-600' },
          { label: 'Revenue', value: formatCurrency(totalRevenue._sum.amount ?? 0), icon: CreditCard, color: 'text-emerald-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.user.name ?? p.user.email}</p>
                      <p className="text-xs text-muted-foreground">{p.plan?.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-700">
                      {formatCurrency(p.amount, p.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <div className="space-y-2">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{u.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <p className="font-medium text-sm">Quick Actions</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a href="/admin/questions/import" className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
              📥 Import Questions (CSV)
            </a>
            <a href="/admin/questions" className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100">
              📝 Manage Questions
            </a>
            <a href="/admin/exams" className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100">
              🏆 Manage Exams
            </a>
            <a href="/admin/coupons" className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
              🏷️ Create Coupon
            </a>
            <a href="/admin/settings" className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              ⚙️ Settings & Pricing
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
