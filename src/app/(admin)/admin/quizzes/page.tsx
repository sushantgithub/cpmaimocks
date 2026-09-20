'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Save, CheckCircle2 } from 'lucide-react'

interface Certification {
  id: string
  name: string
}

interface QuizSlot {
  number: number
  questionCount: number
}

interface DomainQuiz {
  id: string
  domainName: string
  certificationId: string
  certification: { id: string; name: string }
  questionCount: number
  quizCount: number
  slots: QuizSlot[]
}

interface TagQuiz {
  id: string
  title: string
  tag: string
  description: string | null
  isActive: boolean
  certificationId: string
  certification: { id: string; name: string }
  questionCount: number
}

interface QuizResponse {
  domainQuizzes: DomainQuiz[]
  tagQuizzes: TagQuiz[]
}

const EMPTY = {
  title: '',
  tag: '',
  description: '',
  certificationId: '',
}

export default function AdminQuizzesPage() {
  const [domainQuizzes, setDomainQuizzes] = useState<DomainQuiz[]>([])
  const [tagQuizzes, setTagQuizzes] = useState<TagQuiz[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [form, setForm] = useState(EMPTY)
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Record<string, Partial<TagQuiz>>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quizzes')
      const data = await res.json() as QuizResponse
      setDomainQuizzes(Array.isArray(data.domainQuizzes) ? data.domainQuizzes : [])
      setTagQuizzes(Array.isArray(data.tagQuizzes) ? data.tagQuizzes : [])
      setEdits({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch('/api/certifications')
      .then((r) => r.json())
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

  async function create() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create')
      toast({ title: `${data.title} created`, variant: 'success' })
      setForm({ ...EMPTY, certificationId: form.certificationId })
      setShowNew(false)
      load()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  async function save(quiz: TagQuiz) {
    const patch = edits[quiz.id]
    if (!patch) return
    setSavingId(quiz.id)
    try {
      const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      toast({ title: 'Tag quiz updated', variant: 'success' })
      load()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Save failed',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  async function remove(quiz: TagQuiz) {
    if (!confirm(`Delete the "${quiz.title}" tag quiz? Its questions are not affected.`)) return
    const res = await fetch(`/api/admin/quizzes/${quiz.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({ title: 'Could not delete', variant: 'destructive' })
      return
    }
    toast({ title: 'Tag quiz deleted', variant: 'success' })
    load()
  }

  function edit(id: string, patch: Partial<TagQuiz>) {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }))
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Quiz questions are grouped automatically into fixed sets of 10 within each domain.
            These are the quizzes learners see on the site.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowNew((value) => !value)}>
          <Plus className="h-4 w-4 mr-1" />
          New Tag Quiz
        </Button>
      </div>

      {showNew && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Tag Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Optional: create a special drill that groups Quiz questions by CSV tag across domains.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <Input
                  className="mt-1"
                  placeholder="Algorithms"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tag *</label>
                <Input
                  className="mt-1"
                  placeholder="algorithm"
                  value={form.tag}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, tag: event.target.value }))
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  Must match the tags column in the CSV.
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Certification</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.certificationId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    certificationId: event.target.value,
                  }))
                }
              >
                {certifications.map((certification) => (
                  <option key={certification.id} value={certification.id}>
                    {certification.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input
                className="mt-1"
                placeholder="Shown under the quiz name"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={create} loading={creating}>
                Create Tag Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Generated Domain Quizzes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            These are generated from published questions classified as Quiz.
          </p>
        </div>

        {loading ? (
          <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
        ) : domainQuizzes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-gray-500">
              No published Quiz questions are currently available in any domain.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {domainQuizzes.map((domain) => (
              <Card key={domain.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 leading-snug">
                        {domain.domainName}
                      </h3>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <Badge variant="outline" className="text-xs">
                          {domain.certification.name}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {domain.questionCount} Quiz questions
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {domain.quizCount} quiz{domain.quizCount === 1 ? '' : 'zes'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {domain.slots.map((slot) => (
                      <div
                        key={slot.number}
                        className="rounded-lg border bg-gray-50 px-3 py-3 min-w-0"
                      >
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>Quiz {slot.number}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {slot.questionCount} question{slot.questionCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Custom Tag Quizzes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Optional drills grouped by tag instead of by domain.
          </p>
        </div>

        {!loading && tagQuizzes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No custom tag quizzes.
          </p>
        ) : (
          <div className="space-y-4">
            {tagQuizzes.map((quiz) => {
              const patch = edits[quiz.id] ?? {}
              const dirty = Object.keys(patch).length > 0

              return (
                <Card key={quiz.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {quiz.certification.name}
                        </Badge>
                        <Badge
                          variant={quiz.isActive ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {quiz.isActive ? 'Live' : 'Hidden'}
                        </Badge>
                        <Badge
                          variant={quiz.questionCount > 0 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {quiz.questionCount} published question{quiz.questionCount === 1 ? '' : 's'}
                        </Badge>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => remove(quiz)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Name</label>
                        <Input
                          className="mt-1"
                          value={patch.title ?? quiz.title}
                          onChange={(event) =>
                            edit(quiz.id, { title: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Tag</label>
                        <Input
                          className="mt-1"
                          value={patch.tag ?? quiz.tag}
                          onChange={(event) =>
                            edit(quiz.id, { tag: event.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600">
                        Description
                      </label>
                      <Input
                        className="mt-1"
                        value={patch.description ?? quiz.description ?? ''}
                        onChange={(event) =>
                          edit(quiz.id, { description: event.target.value })
                        }
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded"
                        checked={patch.isActive ?? quiz.isActive}
                        onChange={(event) =>
                          edit(quiz.id, { isActive: event.target.checked })
                        }
                      />
                      Live
                    </label>

                    {dirty && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => save(quiz)}
                          loading={savingId === quiz.id}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save changes
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
