'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { Search, ChevronLeft, ChevronRight, ShieldCheck, Trash2 } from 'lucide-react'
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
  subscriptions: { plan: { name: string; durationDays: number }; endDate: string | null }[]
  _count: { examAttempts: number }
  payments: { amount: number; currency: string }[]
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&page=${page}`)
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
      setPages(data.pages)
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
                            <Badge variant="success" className="text-xs">{sub.plan.name}</Badge>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {isLifetime(sub.plan.durationDays)
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
                        <div className="flex gap-2 justify-end">
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
