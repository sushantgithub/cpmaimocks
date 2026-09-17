'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Tag } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  maxRedemptions: number | null
  currentRedemptions: number
  expiresAt: string | null
  isActive: boolean
  _count: { redemptions: number }
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', maxRedemptions: '', expiresAt: '',
  })

  useEffect(() => {
    fetch('/api/admin/coupons').then(r => r.json()).then(setCoupons).finally(() => setLoading(false))
  }, [])

  async function create() {
    if (!form.code.trim() || !form.discountValue) {
      toast({ title: 'Code and discount value are required', variant: 'destructive' }); return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCoupons(prev => [{ ...data, _count: { redemptions: 0 } }, ...prev])
      setShowForm(false)
      setForm({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', maxRedemptions: '', expiresAt: '' })
      toast({ title: 'Coupon created', variant: 'success' })
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setCreating(false) }
  }

  async function toggleActive(coupon: Coupon) {
    try {
      await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  async function deleteCoupon(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"?`)) return
    try {
      await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
      setCoupons(prev => prev.filter(c => c.id !== id))
      toast({ title: 'Coupon deleted', variant: 'success' })
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">{coupons.length} coupon codes</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />New Coupon
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold">New Coupon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Code *</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SAVE20"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional label..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Discount Type</label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))}>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Discount Value *</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={form.discountType === 'PERCENTAGE' ? '20' : '100'}
                  value={form.discountValue}
                  onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Max Redemptions (blank = unlimited)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                  value={form.maxRedemptions}
                  onChange={e => setForm(p => ({ ...p, maxRedemptions: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expires At (blank = never)</label>
                <input
                  type="date"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.expiresAt}
                  onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={create} loading={creating}>Create Coupon</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : coupons.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <Tag className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>No coupons yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Discount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Used</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-gray-900">{c.code}</p>
                      {c.description && <p className="text-xs text-gray-500">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatCurrency(c.discountValue)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.currentRedemptions}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.expiresAt ? formatDate(new Date(c.expiresAt)) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={c.isActive ? 'success' : 'secondary'} className="text-xs">
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>
                          {c.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => deleteCoupon(c.id, c.code)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
