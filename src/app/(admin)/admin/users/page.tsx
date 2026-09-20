'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { Search, ChevronLeft, ChevronRight, ShieldCheck, Trash2, KeyRound, X } from 'lucide-react'
import { formatDate, formatCurrency, isLifetime } from '@/lib/utils'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
  deletionRequested: boolean
  emailVerified: string | null
  signInMethods: string[]
  createdAt: string
  subscriptions: {
    id: string
    cancellationReason: string | null
    plan: {
      id: string
      name: string
      slug: string
      durationDays: number
      certification: { name: string } | null
    }
    endDate: string | null
  }[]
  _count: { examAttempts: number }
  payments: { amount: number; currency: string }[]
}

interface AccessPlan {
  id: string
  name: string
  certificationName: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<AccessPlan[]>([])
  const [accessUser, setAccessUser] = useState<User | null>(null)
  const [planId, setPlanId] = useState('')
  const [accessDays, setAccessDays] = useState('30')
  const [savingAccess, setSavingAccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&page=${page}`)
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
      setPages(data.pages)
      setPlans(data.plans ?? [])
    } finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  async function toggleRole(user: User) {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!confirm(`Change ${user.email} to ${newRole}?`)) return
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
      toast({ title: 'Role updated', variant: 'success' })
    } catch {
      toast({ title: 'Failed to update role', variant: 'destructive' })
    }
  }

  async function toggleActive(user: User) {
    const newActive = !user.isActive
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newActive } : u))
      toast({ title: newActive ? 'User activated' : 'User deactivated', variant: 'success' })
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  function openAccess(user: User) {
    setAccessUser(user)
    setPlanId(plans[0]?.id ?? '')
    setAccessDays('30')
  }

  async function grantAccess() {
    if (!accessUser || !planId) return
    const days = Number(accessDays)
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      toast({ title: 'Access duration must be between 1 and 3650 days', variant: 'destructive' })
      return
    }

    setSavingAccess(true)
    try {
      const res = await fetch(`/api/admin/users/${accessUser.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, days }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to grant access')
      toast({
        title: 'Test access granted',
        description: `${accessUser.email} has premium access for ${days} day${days === 1 ? '' : 's'} without a payment.`,
        variant: 'success',
      })
      setAccessUser(null)
      await load()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to grant access', variant: 'destructive' })
    } finally {
      setSavingAccess(false)
    }
  }

  async function revokeTestAccess(user: User, subscriptionId: string) {
    if (!confirm(`Revoke test access for ${user.email}? Paid subscriptions will not be affected.`)) return
    try {
      const res = await fetch(`/api/admin/users/${user.id}/access?subscriptionId=${encodeURIComponent(subscriptionId)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to revoke access')
      toast({ title: 'Test access revoked', variant: 'success' })
      await load()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to revoke access', variant: 'destructive' })
    }
  }

  async function deleteUser(user: User) {
    const hasPaid = user.payments.length > 0

    if (hasPaid) {
      const total = user.payments.reduce((sum, p) => sum + p.amount, 0)
      const currency = user.payments[0]?.currency ?? 'INR'
      const typed = prompt(
        `${user.email} has ${user.payments.length} successful payment(s) totalling ${formatCurrency(total, currency)}. ` +
        `This does not look like a test account. If you are sure, type their email address to confirm permanent deletion:`
      )
      if (typed === null) return
      if (typed.trim().toLowerCase() !== user.email.toLowerCase()) {
        toast({ title: 'Email did not match — nothing was deleted', variant: 'destructive' })
        return
      }
    } else {
      if (!confirm(
        `Delete ${user.email}? No payment history — this looks like a test or free account. ` +
        `Deleting removes it entirely and frees up this email address for a fresh sign-up. This cannot be undone.`
      )) return
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete')
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setTotal(t => t - 1)
      toast({
        title: `${user.email} deleted`,
        description: 'That email address can be used to sign up again.',
        variant: 'success',
      })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to delete', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total users</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {accessUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Grant test access</h2>
                <p className="text-sm text-gray-500 mt-1">{accessUser.email}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-700"
                onClick={() => setAccessUser(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Premium plan / certification</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={planId}
                onChange={e => setPlanId(e.target.value)}
              >
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.certificationName} · {plan.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">This grants the same entitlement as the selected premium plan, but creates no payment.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access duration</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={accessDays}
                onChange={e => setAccessDays(e.target.value)}
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setAccessUser(null)} disabled={savingAccess}>Cancel</Button>
              <Button onClick={grantAccess} disabled={savingAccess || !planId}>
                {savingAccess ? 'Granting…' : 'Grant Access'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Sign-in</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Exams</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : users.map(user => {
                  const sub = user.subscriptions[0]
                  const testAccesses = user.subscriptions.filter(s => s.cancellationReason === 'ADMIN_TEST_ACCESS')
                  return (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{user.name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {user.deletionRequested && <span className="text-xs text-red-600">Deletion requested</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.payments.length > 0 ? (
                          <Badge variant="success" className="text-xs mb-1">
                            Paid · {formatCurrency(user.payments.reduce((s, p) => s + p.amount, 0), user.payments[0].currency)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs mb-1">No payments</Badge>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          {user.signInMethods.map((method) => (
                            <Badge key={method} variant="secondary" className="text-xs capitalize">{method}</Badge>
                          ))}
                          {user.signInMethods.length === 0 && <span className="text-xs text-gray-400">—</span>}
                        </div>
                        <p className={`text-xs mt-0.5 ${user.emailVerified ? 'text-green-600' : 'text-amber-600'}`}>
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {sub ? (
                          <div>
                            <Badge variant="success" className="text-xs">
                              {sub.cancellationReason === 'ADMIN_TEST_ACCESS' ? 'Test access · ' : ''}{sub.plan.name}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {sub.cancellationReason === 'ADMIN_TEST_ACCESS'
                                ? sub.endDate ? `Until ${formatDate(new Date(sub.endDate))}` : ''
                                : isLifetime(sub.plan.durationDays)
                                  ? 'Lifetime'
                                  : sub.endDate ? `Until ${formatDate(new Date(sub.endDate))}` : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user._count.examAttempts}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(new Date(user.createdAt))}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {user.role === 'ADMIN' && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />Admin
                            </Badge>
                          )}
                          <Badge variant={user.isActive ? 'success' : 'secondary'} className="text-xs">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => openAccess(user)} disabled={plans.length === 0}>
                            <KeyRound className="h-3.5 w-3.5 mr-1" />Grant Access
                          </Button>
                          {testAccesses.map(access => (
                            <Button
                              key={access.id}
                              variant="outline"
                              size="sm"
                              className="text-amber-700 border-amber-200 hover:bg-amber-50"
                              onClick={() => revokeTestAccess(user, access.id)}
                            >
                              Revoke Test
                            </Button>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => toggleRole(user)}>
                            {user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={user.isActive ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
                            onClick={() => toggleActive(user)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => deleteUser(user)}
                            title="Permanently delete this account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-gray-500">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
