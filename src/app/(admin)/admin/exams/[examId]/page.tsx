'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, Trash2, Search, GripVertical } from 'lucide-react'

interface Question {
  id: string
  questionId: string
  text: string
  difficulty: string
  category?: { name: string } | null
}

interface AssignedQuestion {
  id: string
  sortOrder: number
  question: Question
}

interface Exam {
  id: string
  title: string
  certificationId: string
  certification?: { name: string } | null
  description: string | null
  timeLimitMinutes: number
  passingScore: number
  questionCount: number
  questionsPerAttempt: number | null
  status: string
  requireSubscription: boolean
  randomizeQuestions: boolean
  questions: AssignedQuestion[]
}

export default function EditExamPage() {
  const { examId } = useParams<{ examId: string }>()
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Question[]>([])
  const [searching, setSearching] = useState(false)
  const [assignedIds, setAssignedIds] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    questionCount: '120',
    timeLimitMinutes: '120',
    passingScore: '70',
    requireSubscription: true,
    status: 'DRAFT',
  })

  useEffect(() => {
    fetch(`/api/admin/exams/${examId}`)
      .then(r => r.json())
      .then((data: Exam) => {
        setExam(data)
        setForm({
          title: data.title,
          description: data.description ?? '',
          questionCount: String(data.questionCount),
          timeLimitMinutes: String(data.timeLimitMinutes),
          passingScore: String(data.passingScore),
          requireSubscription: data.requireSubscription,
          status: data.status,
        })
        setAssignedIds(data.questions.map(q => q.question.id))
      })
  }, [examId])

  const searchQuestions = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(
        `/api/admin/questions?search=${encodeURIComponent(searchQuery)}&status=PUBLISHED&contentType=MOCK_EXAM&limit=20&certificationId=${exam?.certificationId ?? ''}`
      )
      const data = await res.json()
      setSearchResults(data.questions ?? [])
    } finally { setSearching(false) }
  }, [searchQuery, exam?.certificationId])

  useEffect(() => {
    const t = setTimeout(searchQuestions, 400)
    return () => clearTimeout(t)
  }, [searchQuery, searchQuestions])

  function addQuestion(q: Question) {
    if (assignedIds.includes(q.id)) return
    setAssignedIds(prev => [...prev, q.id])
    setExam(prev => prev ? {
      ...prev,
      questions: [...prev.questions, { id: q.id, sortOrder: prev.questions.length, question: q }],
    } : prev)
  }

  function removeQuestion(qId: string) {
    setAssignedIds(prev => prev.filter(id => id !== qId))
    setExam(prev => prev ? { ...prev, questions: prev.questions.filter(q => q.question.id !== qId) } : prev)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          questionCount: parseInt(form.questionCount),
          timeLimitMinutes: parseInt(form.timeLimitMinutes),
          passingScore: parseInt(form.passingScore),
          requireSubscription: form.requireSubscription,
          status: form.status,
          questionIds: assignedIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setExam(data)
      setAssignedIds(data.questions.map((row: AssignedQuestion) => row.question.id))
      setForm((prev) => ({ ...prev, questionCount: String(data.questionCount) }))
      toast({ title: 'Mock Exam saved', variant: 'success' })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Save failed',
        variant: 'destructive',
      })
    } finally { setSaving(false) }
  }

  if (!exam) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/exams')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Exam</h1>
          <p className="text-sm text-gray-500">{exam.title}</p>
        </div>
      </div>

      {/* Exam settings */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Exam Settings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Target Question Count</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.questionCount}
              onChange={e => setForm(p => ({ ...p, questionCount: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Assigned: {assignedIds.length}. To reduce the target below the assigned count, remove questions and save first.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Time Limit (minutes)</label>
            <input type="number" min={1} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.timeLimitMinutes} onChange={e => setForm(p => ({ ...p, timeLimitMinutes: e.target.value }))} />
            <p className="text-xs text-muted-foreground mt-1">Mock Exams are always timed.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Passing Score (%)</label>
            <input type="number" min={1} max={100} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.passingScore} onChange={e => setForm(p => ({ ...p, passingScore: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 justify-end">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.requireSubscription} onChange={e => setForm(p => ({ ...p, requireSubscription: e.target.checked }))} className="rounded" />
              Requires paid subscription
            </label>
            <p className="text-xs text-muted-foreground">
              Every attempt serves the full assigned set in a new random question order. Answer option order stays fixed. Score and explanations appear only after submission.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Question assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-blue-50 border-blue-200 p-3">
              <p className="text-sm font-medium text-blue-900">Bulk question changes</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Use Import CSV to create a new mock or fill the exact missing count. Search below is for small manual corrections only.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Or search to add individually..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {searching && <p className="text-sm text-gray-500 text-center py-4">Searching...</p>}
              {!searching && searchResults.length === 0 && searchQuery && (
                <p className="text-sm text-gray-500 text-center py-4">No results</p>
              )}
              {searchResults.map(q => {
                const already = assignedIds.includes(q.id)
                return (
                  <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg border bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 line-clamp-2">{q.text}</p>
                      <div className="flex gap-1 mt-1">
                        <span className="text-xs text-gray-400 capitalize">{q.difficulty?.toLowerCase()}</span>
                        {q.category && <span className="text-xs text-gray-400">· {q.category.name}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => addQuestion(q)}
                      disabled={already}
                      className={`flex-shrink-0 p-1.5 rounded ${already ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Assigned questions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Assigned Questions</span>
              <Badge variant="secondary">{assignedIds.length}/{form.questionCount || exam.questionCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Removing a question here only removes it from this Mock Exam. The question remains in the Question Bank and Practice pool.
            </p>
            {assignedIds.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No questions assigned yet.<br/>Search and add questions from the left.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {exam.questions
                  .filter(q => assignedIds.includes(q.question.id))
                  .map((aq, idx) => (
                    <div key={aq.question.id} className="flex items-start gap-2 p-2 rounded-lg border bg-white">
                      <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-400 flex-shrink-0 w-5">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 line-clamp-2">{aq.question.text}</p>
                        <div className="flex gap-1 mt-1">
                          <span className="text-xs text-gray-400 capitalize">{aq.question.difficulty?.toLowerCase()}</span>
                          {aq.question.category && <span className="text-xs text-gray-400">· {aq.question.category.name}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => removeQuestion(aq.question.id)}
                        title="Remove from Mock — keeps the question in Practice"
                        aria-label="Remove question from Mock"
                        className="flex-shrink-0 p-1.5 rounded text-red-400 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/exams')}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save Changes</Button>
      </div>
    </div>
  )
}
