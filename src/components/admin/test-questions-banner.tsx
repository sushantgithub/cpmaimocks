'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { Trash2, FlaskConical } from 'lucide-react'

export function TestQuestionsBanner({ count }: { count: number }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function cleanUp() {
    if (!confirm(
      `Delete all ${count} question${count === 1 ? '' : 's'} marked as test data? ` +
      `Any answers, bookmarks and exam links belonging to them go too. This cannot be undone.`
    )) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/questions/delete-test', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Cleanup failed')
      toast({ title: `Deleted ${data.deleted} test question(s)`, variant: 'success' })
      router.refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Cleanup failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-900 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 flex-shrink-0" />
        <span><strong>{count}</strong> question{count === 1 ? ' is' : 's are'} marked as test data.</span>
      </p>
      <Button size="sm" variant="destructive" onClick={cleanUp} loading={deleting}>
        <Trash2 className="h-4 w-4 mr-1" />Delete all test questions
      </Button>
    </div>
  )
}
