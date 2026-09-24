'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { Search, Trash2, X } from 'lucide-react'
import {
  filterImportHistoryBatches,
  type ImportHistoryContentType,
} from '@/lib/import-history'

type Batch = {
  id: string
  name: string
  contentType: ImportHistoryContentType
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
  const [query, setQuery] = useState('')
  const [certification, setCertification] = useState('ALL')
  const [contentType, setContentType] = useState<'ALL' | ImportHistoryContentType>('ALL')

  const certifications = useMemo(
    () =>
      Array.from(new Set(batches.map((batch) => batch.certification.name))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [batches]
  )

  const filteredBatches = useMemo(
    () =>
      filterImportHistoryBatches(batches, {
        query,
        certification,
        contentType,
      }),
    [batches, query, certification, contentType]
  )

  const hasFilters =
    query.trim().length > 0 || certification !== 'ALL' || contentType !== 'ALL'

  function clearFilters() {
    setQuery('')
    setCertification('ALL')
    setContentType('ALL')
  }

  async function remove(batch: Batch) {
    const count = batch._count.questions
    if (
      !confirm(
        `Delete import “${batch.sourceFilename || batch.name}” and exactly ${count} question${count === 1 ? '' : 's'}? This cannot be undone.`
      )
    ) {
      return
    }

    setDeleting(batch.id)
    try {
      const response = await fetch(`/api/admin/question-batches/${batch.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Batch deletion failed')

      toast({
        title: `Deleted ${data.deleted} questions${data.deletedQuizzes ? ` and ${data.deletedQuizzes} quiz${data.deletedQuizzes === 1 ? '' : 'zes'}` : ''}`,
        description: batch.sourceFilename || batch.name,
        variant: 'success',
      })
      router.refresh()
    } catch (error) {
      toast({
        title:
          error instanceof Error ? error.message : 'Batch deletion failed',
        variant: 'destructive',
      })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-3 sm:p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search filename, domain or Quiz number..."
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={certification}
            onChange={(event) => setCertification(event.target.value)}
            aria-label="Filter by certification"
          >
            <option value="ALL">All Certifications</option>
            {certifications.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={contentType}
            onChange={(event) =>
              setContentType(event.target.value as 'ALL' | ImportHistoryContentType)
            }
            aria-label="Filter by content type"
          >
            <option value="ALL">All Content Types</option>
            <option value="QUIZ">Quiz</option>
            <option value="PRACTICE_ONLY">Practice</option>
            <option value="MOCK_EXAM">Mock</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-gray-500">
            Showing {filteredBatches.length} of {batches.length} imports
          </p>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Import</th>
              <th className="px-4 py-3 text-left">Certification</th>
              <th className="px-4 py-3 text-left">Content</th>
              <th className="px-4 py-3 text-left">Questions</th>
              <th className="px-4 py-3 text-left">Imported</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {batches.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No tracked imports yet.
                </td>
              </tr>
            )}

            {batches.length > 0 && filteredBatches.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No imports match these filters.
                </td>
              </tr>
            )}

            {filteredBatches.map((batch) => (
              <tr key={batch.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {batch.sourceFilename || batch.name}
                  </div>
                  {batch.domains && batch.domains.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {batch.domains.join(', ')}
                    </div>
                  )}
                  {batch.contentType === 'QUIZ' &&
                    batch.quizNumbers &&
                    batch.quizNumbers.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Quiz {batch.quizNumbers.join(', ')}
                      </div>
                    )}
                  {batch.sourceFilename && (
                    <div className="text-xs text-gray-400">{batch.name}</div>
                  )}
                </td>
                <td className="px-4 py-3">{batch.certification.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {batch.contentType === 'PRACTICE_ONLY'
                      ? 'Practice'
                      : batch.contentType === 'MOCK_EXAM'
                        ? 'Mock'
                        : 'Quiz'}
                  </Badge>
                </td>
                <td className="px-4 py-3">{batch._count.questions}</td>
                <td className="px-4 py-3">
                  {new Date(batch.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="destructive"
                    loading={deleting === batch.id}
                    onClick={() => remove(batch)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete batch
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
