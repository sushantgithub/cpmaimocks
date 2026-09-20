'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

interface Certification {
  id: string
  name: string
  fullName?: string | null
}

interface Exam {
  id: string
  title: string
  description: string | null
  certification?: { id: string; name: string } | null
  questionCount: number
  timeLimitMinutes: number
  passingScore: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  requireSubscription: boolean
  _count: { questions: number; attempts: number }
}

const INITIAL_FORM = {
  title: '',
  description: '',
  questionCount: '120',
  timeLimitMinutes: '120',
  passingScore: '70',
  requireSubscription: true,
  certificationId: '',
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [form, setForm] = useState(INITIAL_FORM)

  async function loadExams() {
    const response = await fetch('/api/admin/exams')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Could not load Mock Exams')
    setExams(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    loadExams()
      .catch((error) => {
        toast({
          title: error instanceof Error ? error.message : 'Could not load Mock Exams',
          variant: 'destructive',
        })
      })
      .finally(() => setLoading(false))

    fetch('/api/certifications')
      .then((response) => response.json())
      .then((certs: Certification[]) => {
        setCertifications(certs)
        if (certs.length > 0) {
          setForm((current) => ({
            ...current,
            certificationId: current.certificationId || certs[0].id,
          }))
        }
      })
      .catch(() => {})
  }, [])

  async function createExam() {
    if (!form.title.trim()) {
      toast({ title: 'Mock Exam name is required', variant: 'destructive' })
      return
    }
    if (!form.certificationId) {
      toast({ title: 'Pick a certification first', variant: 'destructive' })
      return
    }

    const questionCount = Number(form.questionCount)
    const timeLimitMinutes = Number(form.timeLimitMinutes)
    const passingScore = Number(form.passingScore)

    if (!Number.isInteger(questionCount) || questionCount < 1) {
      toast({ title: 'Question Count must be a positive whole number', variant: 'destructive' })
      return
    }
    if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1) {
      toast({ title: 'Time Limit must be a positive whole number', variant: 'destructive' })
      return
    }
    if (!Number.isInteger(passingScore) || passingScore < 1 || passingScore > 100) {
      toast({ title: 'Passing Score must be between 1 and 100', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId: form.certificationId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          questionCount,
          timeLimitMinutes,
          passingScore,
          requireSubscription: form.requireSubscription,
        }),
      })
      const exam = await response.json()
      if (!response.ok) throw new Error(exam.error ?? 'Could not create Mock Exam')

      setShowForm(false)
      setForm((current) => ({
        ...INITIAL_FORM,
        certificationId: current.certificationId,
      }))
      await loadExams()
      toast({ title: 'Mock Exam created as Draft', variant: 'success' })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed to create Mock Exam',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  async function deleteExam(id: string, title: string) {
    if (!confirm(`Delete "${title}"? All attempts for this Mock Exam will be lost.`)) return

    try {
      const response = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error ?? 'Could not delete Mock Exam')
      setExams((current) => current.filter((exam) => exam.id !== id))
      toast({ title: 'Mock Exam deleted', variant: 'success' })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed to delete Mock Exam',
        variant: 'destructive',
      })
    }
  }

  async function toggleStatus(exam: Exam) {
    const newStatus = exam.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      const response = await fetch(`/api/admin/exams/${exam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not update Mock Exam status')

      setExams((current) =>
        current.map((item) =>
          item.id === exam.id ? { ...item, status: data.status ?? newStatus } : item
        )
      )
      toast({
        title: newStatus === 'PUBLISHED' ? 'Mock Exam published' : 'Mock Exam moved to Draft',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mock Exams</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {exams.length} mock exam{exams.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Mock Exam
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold">New Mock Exam</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Create the Draft container first, then import exactly the configured number of Mock questions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Certification *</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.certificationId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      certificationId: event.target.value,
                    }))
                  }
                >
                  {certifications.length === 0 && (
                    <option value="">No certifications — create one first</option>
                  )}
                  {certifications.map((certification) => (
                    <option key={certification.id} value={certification.id}>
                      {certification.fullName
                        ? `${certification.name} — ${certification.fullName}`
                        : certification.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Mock Exam Name *</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CPMAI Full Mock 1"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Optional description..."
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Question Count *</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.questionCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      questionCount: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Time Limit (minutes) *</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.timeLimitMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      timeLimitMinutes: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Passing Score (%) *</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.passingScore}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      passingScore: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Access Type *</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.requireSubscription ? 'PAID' : 'FREE'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requireSubscription: event.target.value === 'PAID',
                    }))
                  }
                >
                  <option value="FREE">Free</option>
                  <option value="PAID">Subscriber / Paid</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={createExam} loading={creating}>
                Create Draft Mock
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No Mock Exams yet</p>
            <p className="text-sm mt-1">
              Create a Draft Mock Exam here or from Bulk Import, then add its exact question set.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const assigned = exam._count.questions
            const missing = Math.max(0, exam.questionCount - assigned)
            const complete = assigned === exam.questionCount

            return (
              <Card key={exam.id}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 leading-snug break-words">
                          {exam.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {exam.certification && (
                            <Badge variant="outline" className="text-xs">
                              {exam.certification.name}
                            </Badge>
                          )}
                          <Badge
                            variant={exam.status === 'PUBLISHED' ? 'success' : 'secondary'}
                            className="text-xs"
                          >
                            {exam.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {exam.requireSubscription ? 'Paid' : 'Free'}
                          </Badge>
                          {!complete && (
                            <Badge variant="destructive" className="text-xs">
                              {missing} missing
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        onClick={() => deleteExam(exam.id, exam.title)}
                        aria-label={`Delete ${exam.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {exam.description && (
                      <p className="text-sm text-gray-500">{exam.description}</p>
                    )}

                    {!complete && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>
                          This Mock is incomplete. Import {missing} more question{missing === 1 ? '' : 's'} before publishing.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg border bg-gray-50 px-3 py-2">
                        <span className="flex items-center gap-1 text-gray-500">
                          <FileText className="h-3.5 w-3.5" />
                          Assigned / Target
                        </span>
                        <strong className="block mt-1 text-gray-900">
                          {assigned} / {exam.questionCount}
                        </strong>
                      </div>
                      <div className="rounded-lg border bg-gray-50 px-3 py-2">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          Time
                        </span>
                        <strong className="block mt-1 text-gray-900">
                          {exam.timeLimitMinutes} min
                        </strong>
                      </div>
                      <div className="rounded-lg border bg-gray-50 px-3 py-2">
                        <span className="flex items-center gap-1 text-gray-500">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Pass
                        </span>
                        <strong className="block mt-1 text-gray-900">
                          {exam.passingScore}%
                        </strong>
                      </div>
                      <div className="rounded-lg border bg-gray-50 px-3 py-2">
                        <span className="flex items-center gap-1 text-gray-500">
                          <Users className="h-3.5 w-3.5" />
                          Attempts
                        </span>
                        <strong className="block mt-1 text-gray-900">
                          {exam._count.attempts}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(exam)}
                        disabled={exam.status !== 'PUBLISHED' && !complete}
                        title={
                          exam.status !== 'PUBLISHED' && !complete
                            ? `Import ${missing} more question${missing === 1 ? '' : 's'} before publishing`
                            : undefined
                        }
                      >
                        {exam.status === 'PUBLISHED' ? 'Move to Draft' : 'Publish'}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/exams/${exam.id}`}>
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit Mock
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
