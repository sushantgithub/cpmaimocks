'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Trash2 } from 'lucide-react'

type Batch = {
  id: string
  name: string
  contentType: 'QUIZ' | 'MOCK_EXAM' | 'PRACTICE_ONLY'
  createdAt: string | Date
  sourceFilename?: string | null
  domains?: string[]
  quizNumbers?: number[]
  certification: { name: string }
  _count: { questions: number }
}

export function ImportBatchesTable({ batches }: { batches: Batch[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function remove(batch: Batch) {
    const count = batch._count.questions
    if (!confirm(`Delete import “${batch.sourceFilename || batch.name}” and exactly ${count} question${count === 1 ? '' : 's'}? This cannot be undone.`)) return
    setDeleting(batch.id)
    try {
      const response = await fetch(`/api/admin/question-batches/${batch.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Batch deletion failed')
      toast({ title: `Deleted ${data.deleted} questions`, description: batch.name, variant: 'success' })
      router.refresh()
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Batch deletion failed', variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  return <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <thead className="border-b bg-gray-50"><tr>
        <th className="px-4 py-3 text-left">Import</th><th className="px-4 py-3 text-left">Certification</th>
        <th className="px-4 py-3 text-left">Content</th><th className="px-4 py-3 text-left">Questions</th>
        <th className="px-4 py-3 text-left">Imported</th><th className="px-4 py-3 text-right">Action</th>
      </tr></thead>
      <tbody className="divide-y">
        {batches.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No tracked imports yet.</td></tr>}
        {batches.map((batch) => <tr key={batch.id}>
          <td className="px-4 py-3">
            <div className="font-medium">{batch.sourceFilename || batch.name}</div>
            {batch.domains && batch.domains.length > 0 && <div className="mt-1 text-xs text-gray-500">{batch.domains.join(', ')}</div>}
            {batch.contentType === 'QUIZ' && batch.quizNumbers && batch.quizNumbers.length > 0 && <div className="text-xs text-gray-500">Quiz {batch.quizNumbers.join(', ')}</div>}
            {batch.sourceFilename && <div className="text-xs text-gray-400">{batch.name}</div>}
          </td><td className="px-4 py-3">{batch.certification.name}</td>
          <td className="px-4 py-3"><Badge variant="outline">{batch.contentType === 'PRACTICE_ONLY' ? 'Practice' : batch.contentType === 'MOCK_EXAM' ? 'Mock' : 'Quiz'}</Badge></td>
          <td className="px-4 py-3">{batch._count.questions}</td><td className="px-4 py-3">{new Date(batch.createdAt).toLocaleDateString()}</td>
          <td className="px-4 py-3 text-right"><Button size="sm" variant="destructive" loading={deleting === batch.id} onClick={() => remove(batch)}><Trash2 className="mr-1 h-4 w-4"/>Delete batch</Button></td>
        </tr>)}
      </tbody>
    </table>
  </div>
}
