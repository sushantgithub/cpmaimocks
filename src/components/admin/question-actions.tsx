'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props { questionId: string; status: string }

export function QuestionActions({ questionId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function togglePublish() {
    setLoading(true)
    try {
      const newStatus = status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: `Question ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'}`, variant: 'success' })
      router.refresh()
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function deleteQuestion(force = false) {
    if (!force && !confirm('Delete this question? This cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/questions/${questionId}${force ? '?force=true' : ''}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))

      if (res.status === 409 && !force) {
        setLoading(false)
        if (confirm(`${data.error} Delete it anyway? This also removes those exam answers; the affected attempts' scores are unaffected but their answer review will show one less question.`)) {
          await deleteQuestion(true)
        }
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      toast({ title: 'Question deleted', variant: 'success' })
      router.refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Delete failed', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" asChild className="h-7 px-2">
        <Link href={`/admin/questions/${questionId}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={togglePublish} disabled={loading}>
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-700" onClick={() => deleteQuestion()} disabled={loading}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
