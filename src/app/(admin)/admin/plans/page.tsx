'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, approxUsd, LIFETIME_DAYS, isLifetime, planPeriodLabel } from '@/lib/utils'
import { Plus, Trash2, Save } from 'lucide-react'

interface Certification { id: string; name: string }

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  durationDays: number
  trialDays: number
  features: string[]
  isActive: boolean
  isFeatured: boolean
  certificationId: string | null
  certification: { id: string; name: string } | null
  _count: { subscriptions: number }
}

const EMPTY = {
  name: '', description: '', price: '499', durationDays: '30', trialDays: '0',
  features: '', certificationId: '', lifetime: false,
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, Partial<Plan> & { featuresText?: string }>>({})
  const [certifications, setCertifications] = useState<Certification[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/plans')
      setPlans(await res.json())
      setEdits({})
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/certifications').then(r => r.json()).then(setCertifications).catch(() => {})
  }, [])

  function edit(id: string, patch: Partial<Plan> & { featuresText?: string }) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function save(plan: Plan) {
    const patch = edits[plan.id]
    if (!patch) return
    setSavingId(plan.id)
    try {
      const body: Record<string, unknown> = { ...patch }
      if (patch.featuresText !== undefined) {
        body.features = patch.featuresText.split('\n').map((f) => f.trim()).filter(Boolean)
        delete body.featuresText
      }
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      toast({ title: `${plan.name} updated`, variant: 'success' })
      load()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Save failed', variant: 'destructive' })
    } finally { setSavingId(null) }
  }

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          durationDays: form.lifetime ? LIFETIME_DAYS : Number(form.durationDays),
          trialDays: Number(form.trialDays),
          features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create')
      toast({ title: `${data.name} created`, variant: 'success' })
      setForm(EMPTY)
      setShowNew(false)
      load()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setCreating(false) }
  }

  async function remove(plan: Plan) {
    if (!confirm(`Delete "${plan.name}"?`)) return
    const res = await fetch(`/api/admin/plans/${plan.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error ?? 'Could not delete', variant: 'destructive' })
      return
    }
    toast({ title: `${plan.name} deleted`, variant: 'success' })
    load()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Changes apply to new purchases. Existing subscribers keep what they paid for.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />New Plan
        </Button>
      </div>

      {showNew && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">New plan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Half Yearly"
                  value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Price (₹) *</label>
                <input type="number" min={0} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Duration (days) *</label>
                <input type="number" min={1} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  disabled={form.lifetime}
                  value={form.lifetime ? '' : form.durationDays} onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value }))} />
                <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded"
                    checked={form.lifetime}
                    onChange={(e) => setForm((p) => ({ ...p, lifetime: e.target.checked }))} />
                  Lifetime access (one-time payment, never expires)
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Free trial (days)</label>
                <input type="number" min={0} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.trialDays} onChange={(e) => setForm((p) => ({ ...p, trialDays: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Covers</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.certificationId}
                onChange={(e) => setForm((p) => ({ ...p, certificationId: e.target.value }))}>
                <option value="">All certifications</option>
                {certifications.map((c) => <option key={c.id} value={c.id}>{c.name} only</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Shown under the plan name"
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Features — one per line</label>
              <textarea rows={4} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={'All mock exams\nUnlimited practice\nDetailed explanations'}
                value={form.features} onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button size="sm" onClick={create} loading={creating}>Create plan</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const patch = edits[plan.id] ?? {}
            const price = patch.price ?? plan.price
            const durationDays = patch.durationDays ?? plan.durationDays
            const lifetime = isLifetime(durationDays)
            const dirty = Object.keys(patch).length > 0
            return (
              <Card key={plan.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      <Badge variant={plan.isActive ? 'success' : 'secondary'} className="text-xs">
                        {plan.isActive ? 'Live' : 'Hidden'}
                      </Badge>
                      {plan.isFeatured && <Badge className="text-xs">Featured</Badge>}
                      <Badge variant="outline" className="text-xs">
                        {plan.certification ? `${plan.certification.name} only` : 'All certifications'}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">{planPeriodLabel(plan.durationDays)}</Badge>
                      <span className="text-xs text-gray-500">{plan._count.subscriptions} subscriber(s)</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(plan)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Price (₹)</label>
                      <input type="number" min={0} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                        value={price}
                        onChange={(e) => edit(plan.id, { price: Number(e.target.value) })} />
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatCurrency(Number(price))} {approxUsd(Number(price)) && `· ${approxUsd(Number(price))}`}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Days</label>
                      <input type="number" min={1} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        disabled={lifetime}
                        value={lifetime ? '' : durationDays}
                        onChange={(e) => edit(plan.id, { durationDays: Number(e.target.value) })} />
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-gray-700">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded"
                          checked={lifetime}
                          onChange={(e) => edit(plan.id, { durationDays: e.target.checked ? LIFETIME_DAYS : 365 })} />
                        Lifetime
                      </label>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Trial days</label>
                      <input type="number" min={0} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                        value={patch.trialDays ?? plan.trialDays}
                        onChange={(e) => edit(plan.id, { trialDays: Number(e.target.value) })} />
                    </div>
                    <div className="flex flex-col justify-end gap-1.5 pb-1">
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded"
                          checked={patch.isActive ?? plan.isActive}
                          onChange={(e) => edit(plan.id, { isActive: e.target.checked })} />
                        Live
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded"
                          checked={patch.isFeatured ?? plan.isFeatured}
                          onChange={(e) => edit(plan.id, { isFeatured: e.target.checked })} />
                        Featured
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Covers</label>
                      <select className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                        value={patch.certificationId ?? plan.certificationId ?? ''}
                        onChange={(e) => edit(plan.id, { certificationId: e.target.value || null })}>
                        <option value="">All certifications</option>
                        {certifications.map((c) => <option key={c.id} value={c.id}>{c.name} only</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Description</label>
                      <input className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                        value={patch.description ?? plan.description ?? ''}
                        onChange={(e) => edit(plan.id, { description: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Features — one per line</label>
                    <textarea rows={4} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                      value={patch.featuresText ?? (plan.features ?? []).join('\n')}
                      onChange={(e) => edit(plan.id, { featuresText: e.target.value })} />
                  </div>

                  {dirty && (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => save(plan)} loading={savingId === plan.id}>
                        <Save className="h-4 w-4 mr-1" />Save changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {plans.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No plans yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
