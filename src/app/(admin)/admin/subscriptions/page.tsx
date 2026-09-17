import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      plan: { select: { name: true, price: true } },
      payments: {
        where: { status: 'SUCCESS' },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const stats = {
    active: subscriptions.filter(s => s.status === 'ACTIVE').length,
    total: subscriptions.length,
    revenue: await prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-0.5">{stats.active} active · {stats.total} total</p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Subscriptions', value: stats.active },
          { label: 'Total Subscriptions', value: stats.total },
          { label: 'Total Revenue', value: formatCurrency(stats.revenue._sum.amount ?? 0) },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Start</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{sub.user.name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{sub.user.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{sub.plan.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={sub.status === 'ACTIVE' ? 'success' : sub.status === 'EXPIRED' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {sub.startDate ? formatDate(sub.startDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {sub.endDate ? formatDate(sub.endDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {sub.payments[0] ? formatCurrency(sub.payments[0].amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
