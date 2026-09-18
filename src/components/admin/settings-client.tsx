'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LIFETIME_DAYS, isLifetime } from '@/lib/utils'

interface Plan {
  id: string; name: string; slug: string; price: number; currency: string
  durationDays: number; features: string[]; isActive: boolean; isFeatured: boolean; sortOrder: number
}

export function AdminSettingsClient({ plans: initialPlans }: { plans: Plan[] }) {
  const router = useRouter()
  const [plans, setPlans] = useState(initialPlans)
  const [saving, setSaving] = useState<string | null>(null)

  async function savePlan(plan: Plan) {
    setSaving(plan.id)
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      })
      if (!res.ok) throw new Error('Save failed')
      toast({ title: 'Plan saved', variant: 'success' })
      router.refresh()
    } catch {
      toast({ title: 'Failed to save plan', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  function updatePlan(id: string, field: keyof Plan, value: unknown) {
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p))
  }

  function updateFeature(planId: string, index: number, value: string) {
    setPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p
      const features = [...p.features]
      features[index] = value
      return { ...p, features }
    }))
  }

  function addFeature(planId: string) {
    setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, features: [...p.features, ''] } : p))
  }

  function removeFeature(planId: string, index: number) {
    setPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p
      return { ...p, features: p.features.filter((_, i) => i !== index) }
    }))
  }

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">Subscription Plans</h2>
      <p className="text-sm text-gray-500">Edit pricing, features, and duration. Changes apply to new subscriptions immediately.</p>

      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              {plan.name}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm font-normal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.isActive}
                    onChange={(e) => updatePlan(plan.id, 'isActive', e.target.checked)}
                    className="rounded"
                  />
                  Active
                </label>
                <label className="flex items-center gap-1.5 text-sm font-normal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.isFeatured}
                    onChange={(e) => updatePlan(plan.id, 'isFeatured', e.target.checked)}
                    className="rounded"
                  />
                  Featured
                </label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Price</label>
                <Input
                  type="number"
                  value={plan.price}
                  onChange={(e) => updatePlan(plan.id, 'price', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Currency</label>
                <select
                  value={plan.currency}
                  onChange={(e) => updatePlan(plan.id, 'currency', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Duration (days)</label>
                <Input
                  type="number"
                  disabled={isLifetime(plan.durationDays)}
                  value={isLifetime(plan.durationDays) ? '' : plan.durationDays}
                  onChange={(e) => updatePlan(plan.id, 'durationDays', Number(e.target.value))}
                />
                <label className="mt-1 flex items-center gap-1.5 text-xs text-gray-700">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded"
                    checked={isLifetime(plan.durationDays)}
                    onChange={(e) => updatePlan(plan.id, 'durationDays', e.target.checked ? LIFETIME_DAYS : 365)} />
                  Lifetime
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Features</label>
              <div className="space-y-2">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={f} onChange={(e) => updateFeature(plan.id, i, e.target.value)} placeholder="Feature description" />
                    <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0 text-red-500" onClick={() => removeFeature(plan.id, i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addFeature(plan.id)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Feature
                </Button>
              </div>
            </div>

            <Button onClick={() => savePlan(plan)} loading={saving === plan.id}>
              <Save className="h-4 w-4 mr-2" />Save Changes
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
