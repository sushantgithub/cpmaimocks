'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { Trash2 } from 'lucide-react'
import { QuestionActions } from '@/components/admin/question-actions'

interface Question {
  id: string
  questionId: string
  text: string
  correctAnswer: string
  difficulty: string
  status: string
  category?: { name: string } | null
}

export function QuestionsTable({ questions }: { questions: Question[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const allSelected = questions.length > 0 && selected.size === questions.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(questions.map((q) => q.id)))
  }

  async function deleteSelected(force = false) {
    const count = selected.size
    if (!force && !confirm(`Delete ${count} question${count === 1 ? '' : 's'}? This cannot be undone.`)) return

    setDeleting(true)
    try {
      const res = await fetch('/api/admin/questions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: Array.from(selected), force }),
      })
      const data = await res.json()

      if (res.status === 409 && !force && data.skipped > 0) {
        setDeleting(false)
        if (confirm(`${data.skipped} of the selected question(s) have been used in an exam or practice attempt. Delete them anyway? This also removes those exam answers; affected attempts keep their stored score but will show fewer questions in review.`)) {
          await deleteSelected(true)
        }
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')

      toast({
        title: `Deleted ${data.deleted} question${data.deleted === 1 ? '' : 's'}`,
        description: !force && data.skipped > 0
          ? `${data.skipped} kept — already used in an exam attempt.`
          : undefined,
        variant: 'success',
      })
      setSelected(new Set())
      router.refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Delete failed', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-900">
            <strong>{selected.size}</strong> selected
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={() => deleteSelected()} loading={deleting}>
              <Trash2 className="h-4 w-4 mr-1" />Delete selected
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Question</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Difficulty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {questions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No questions found.{' '}
                  <Link href="/admin/questions/import" className="text-primary hover:underline">Import some →</Link>
                </td>
              </tr>
            )}
            {questions.map((q) => (
              <tr key={q.id} className={selected.has(q.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(q.id)}
                    onChange={() => toggle(q.id)}
                    aria-label={`Select ${q.questionId}`}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{q.questionId}</td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="truncate" title={q.text}>{q.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Correct: {q.correctAnswer}</p>
                </td>
                <td className="px-4 py-3 text-gray-500">{q.category?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={q.difficulty === 'HARD' ? 'destructive' : q.difficulty === 'MEDIUM' ? 'warning' : 'success'} className="text-xs capitalize">
                    {q.difficulty.toLowerCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={q.status === 'PUBLISHED' ? 'success' : q.status === 'DRAFT' ? 'secondary' : 'outline'} className="text-xs capitalize">
                    {q.status.toLowerCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <QuestionActions questionId={q.id} status={q.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
