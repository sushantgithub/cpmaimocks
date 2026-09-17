import { prisma } from '@/lib/db'
import { AdminSettingsClient } from '@/components/admin/settings-client'

export default async function AdminSettingsPage() {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings & Pricing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage subscription plans and platform settings.</p>
      </div>
      <AdminSettingsClient plans={plans.map((p) => ({
        id: p.id, name: p.name, slug: p.slug,
        price: p.price, currency: p.currency,
        durationDays: p.durationDays,
        features: p.features as string[],
        isActive: p.isActive, isFeatured: p.isFeatured,
        sortOrder: p.sortOrder,
      }))} />
    </div>
  )
}
