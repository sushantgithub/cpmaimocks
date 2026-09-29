'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { RefreshCw, RotateCcw } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  provider: string
  providerPaymentId: string | null
  providerOrderId: string | null
  refundedAt: string | null
  refundAmount: number | null
  failureReason: string | null
  createdAt: string
  user: { name: string | null; email: string }
  plan: { name: string } | null
}

const statusVariant: Record<string, 'success' | 'destructive' | 'secondary' | 'outline'> = {
  SUCCESS: 'success',
  FAILED: 'destructive',
  REFUNDED: 'secondary',
  PENDING: 'outline',
  CANCELLED: 'secondary',
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [refunding, setRefunding] = useState<string | null>(null)

  async function load(p = page) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payments?page=${p}`)
      const data = await res.json()
      setPayments(data.payments)
      setPages(data.pages)
    } catch {
      toast({ title: 'Failed to load payments', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page])

  async function handleRefund(payment: Payment) {
    if (!confirm(`Refund ₹${payment.amount.toLocaleString()} to ${payment.user.email}? This cannot be undone.`)) return
    setRefunding(payment.id)
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/refund`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Refund failed')
      toast({ title: `Refund initiated for ₹${payment.amount.toLocaleString()}`, variant: 'success' })
      setPayments((prev) => prev.map((p) => p.id === payment.id ? { ...p, status: 'REFUNDED', refundedAt: new Date().toISOString() } : p))
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' })
    } finally {
      setRefunding(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">All transactions and refunds</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No payments yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">
                        {payment.currency} {payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </span>
                      <Badge variant={statusVariant[payment.status] ?? 'outline'} className="text-xs">
                        {payment.status}
                      </Badge>
                      {payment.plan && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{payment.plan.name}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {payment.user.name ? `${payment.user.name} · ` : ''}{payment.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(payment.createdAt).toLocaleString('en-IN')}
                      {payment.providerPaymentId && ` · ${payment.providerPaymentId}`}
                      {payment.refundedAt && ` · Refunded ${new Date(payment.refundedAt).toLocaleDateString('en-IN')}`}
                      {payment.failureReason && ` · ${payment.failureReason}`}
                    </p>
                  </div>
                  {payment.status === 'SUCCESS' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefund(payment)}
                      disabled={refunding === payment.id}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      {refunding === payment.id ? 'Processing...' : 'Refund'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
