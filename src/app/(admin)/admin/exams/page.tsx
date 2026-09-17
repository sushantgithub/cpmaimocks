'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Users, Clock, CheckCircle, FileText } from 'lucide-react'
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
  status: string
  requireSubscription: boolean
  _count: { questions: number; attempts: number }
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [form, setForm] = useState({
    title: '', description: '', timeLimitMinutes: '120', passingScore: '70',
    requireSubscription: true, certificationId: '',
  })

  useEffect(() => {
    fetch('/api/admin/exams').then(r => r.json()).then(setExams).finally(() => setLoading(false))
    fetch('/api/certifications')
      .then(r => r.json())
      .then((certs: Certification[]) => {
        setCertifications(certs)
        if (certs.length > 0) setForm(p => ({ ...p, certificationId: certs[0].id }))
      })
      .catch(() => {})
  }, [])

  async function createExam() {
    if (!form.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return }
    if (!form.certificationId) {
      toast({ title: 'Pick a certification first', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, timeLimitMinutes: parseInt(form.timeLimitMinutes), passingScore: parseInt(form.passingScore) }),
      })
      const exam = await res.json()
      if (!res.ok) throw new Error(exam.error)
      setExams(prev => [...prev, exam])
      setShowForm(false)
      setForm(p => ({
        title: '', description: '', timeLimitMinutes: '120', passingScore: '70',
        requireSubscription: true, certificationId: p.certificationId,
      }))
      toast({ title: 'Exam created', variant: 'success' })
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setCreating(false) }
  }

  async function deleteExam(id: string, title: string) {
    if (!confirm(`Delete "${title}"? All attempts will be lost.`)) return
    try {
      await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' })
      setExams(prev => prev.filter(e => e.id !== id))
      toast({ title: 'Exam deleted', variant: 'success' })
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
  }

  async function toggleStatus(exam: Exam) {
    const newStatus = exam.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      await fetch(`/api/admin/exams/${exam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setExams(prev => prev.map(e => e.id === exam.id ? { ...e, status: newStatus } : e))
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-sm text-gray-500 mt-0.5">{exams.length} mock exams</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />New Exam
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold">New Exam</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Certification *</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.certificationId}
                  onChange={e => setForm(p => ({ ...p, certificationId: e.target.value }))}
                >
                  {certifications.length === 0 && <option value="">No certifications — create one first</option>}
                  {certifications.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName ? `${c.name} — ${c.fullName}` : c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Only questions from this certification can be added to the exam.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CPMAI Mock Exam 1"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Optional description..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Time Limit (minutes)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.timeLimitMinutes}
                  onChange={e => setForm(p => ({ ...p, timeLimitMinutes: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Passing Score (%)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.passingScore}
                  onChange={e => setForm(p => ({ ...p, passingScore: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requireSub"
                  checked={form.requireSubscription}
                  onChange={e => setForm(p => ({ ...p, requireSubscription: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="requireSub" className="text-sm text-gray-700">Requires paid subscription</label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={createExam} loading={creating}>Create Exam</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exams list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No exams yet</p>
            <p className="text-sm mt-1">Create your first exam then assign questions to it.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => (
            <Card key={exam.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                      {exam.certification && (
                        <Badge variant="outline" className="text-xs">{exam.certification.name}</Badge>
                      )}
                      <Badge variant={exam.status === 'PUBLISHED' ? 'success' : 'secondary'} className="text-xs">
                        {exam.status}
                      </Badge>
                      {exam.requireSubscription && (
                        <Badge variant="outline" className="text-xs">Paid</Badge>
                      )}
                    </div>
                    {exam.description && <p className="text-sm text-gray-500 mb-2">{exam.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{exam._count.questions} questions</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{exam.timeLimitMinutes} min</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Pass: {exam.passingScore}%</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{exam._count.attempts} attempts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(exam)}
                    >
                      {exam.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Link href={`/admin/exams/${exam.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3.5 w-3.5 mr-1" />Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteExam(exam.id, exam.title)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
