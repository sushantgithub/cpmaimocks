'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import {
  ChevronRight,
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react'

interface AdminQuiz {
  id: string
  title: string
  description: string | null
  isActive: boolean
  sortOrder: number
  certificationId: string
  categoryId: string
  certification: { id: string; name: string }
  category: { id: string; name: string }
  questionCount: number
  publishedQuestionCount: number
}

interface QuizResponse {
  quizzes: AdminQuiz[]
}

interface EditForm {
  title: string
  description: string
  isActive: boolean
}

interface DomainGroup {
  id: string
  name: string
  quizzes: AdminQuiz[]
}

interface CertificationGroup {
  id: string
  name: string
  domains: DomainGroup[]
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quizzes', { cache: 'no-store' })
      const data = await res.json() as QuizResponse
      if (!res.ok) throw new Error('Could not load quizzes')
      setQuizzes(Array.isArray(data.quizzes) ? data.quizzes : [])
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Could not load quizzes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const groups = useMemo<CertificationGroup[]>(() => {
    const certifications = new Map<string, CertificationGroup>()

    for (const quiz of quizzes) {
      let certification = certifications.get(quiz.certificationId)
      if (!certification) {
        certification = {
          id: quiz.certificationId,
          name: quiz.certification.name,
          domains: [],
        }
        certifications.set(quiz.certificationId, certification)
      }

      let domain = certification.domains.find((item) => item.id === quiz.categoryId)
      if (!domain) {
        domain = {
          id: quiz.categoryId,
          name: quiz.category.name,
          quizzes: [],
        }
        certification.domains.push(domain)
      }

      domain.quizzes.push(quiz)
    }

    return Array.from(certifications.values())
  }, [quizzes])

  const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.questionCount, 0)

  function toggleDomain(domainId: string) {
    setOpenDomains((current) => ({
      ...current,
      [domainId]: !current[domainId],
    }))
  }

  function beginEdit(quiz: AdminQuiz) {
    setEditingId(quiz.id)
    setEditForm({
      title: quiz.title,
      description: quiz.description ?? '',
      isActive: quiz.isActive,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function save(quiz: AdminQuiz) {
    if (!editForm) return

    setSavingId(quiz.id)
    try {
      const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')

      toast({ title: 'Quiz updated', variant: 'success' })
      cancelEdit()
      await load()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Save failed',
        variant: 'destructive',
      })
    } finally {
      setSavingId(null)
    }
  }

  async function remove(quiz: AdminQuiz) {
    const confirmed = confirm(
      `Delete "${quiz.title}"?\n\nThis permanently deletes its ${quiz.questionCount} Quiz questions and related learner Quiz history/bookmarks. This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(quiz.id)
    try {
      const res = await fetch(`/api/admin/quizzes/${quiz.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not delete quiz')

      toast({
        title: `Quiz deleted with ${data.deletedQuestions ?? quiz.questionCount} questions`,
        variant: 'success',
      })
      await load()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Could not delete quiz',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Quizzes are created automatically from Quiz CSV imports and kept under
          their certification and domain.
        </p>
        {!loading && quizzes.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            <Badge variant="secondary">
              {quizzes.length} quizzes
            </Badge>
            <Badge variant="secondary">
              {totalQuestions} questions
            </Badge>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="animate-pulse h-20 bg-gray-100 rounded-xl" />
          <div className="animate-pulse h-20 bg-gray-100 rounded-xl" />
        </div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-500">
            No persisted quizzes are available. Import Quiz questions to create
            fixed 10-question quizzes automatically.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((certification) => {
            const certificationQuizCount = certification.domains.reduce(
              (sum, domain) => sum + domain.quizzes.length,
              0
            )
            const certificationQuestionCount = certification.domains.reduce(
              (sum, domain) =>
                sum + domain.quizzes.reduce(
                  (domainSum, quiz) => domainSum + quiz.questionCount,
                  0
                ),
              0
            )

            return (
              <section key={certification.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {certification.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {certificationQuizCount} quizzes · {certificationQuestionCount} questions
                  </p>
                </div>

                <div className="space-y-3">
                  {certification.domains.map((domain) => {
                    const isOpen = Boolean(openDomains[domain.id])
                    const domainQuestionCount = domain.quizzes.reduce(
                      (sum, quiz) => sum + quiz.questionCount,
                      0
                    )

                    return (
                      <Card key={domain.id} className="overflow-hidden">
                        <button
                          type="button"
                          className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
                          onClick={() => toggleDomain(domain.id)}
                          aria-expanded={isOpen}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ChevronRight
                              className={`h-5 w-5 text-gray-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                            />
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 leading-snug">
                                {domain.name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {domain.quizzes.length} quizzes · {domainQuestionCount} questions
                              </p>
                            </div>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t divide-y">
                            {domain.quizzes.map((quiz) => {
                              const isEditing = editingId === quiz.id
                              const allPublished =
                                quiz.questionCount === quiz.publishedQuestionCount

                              return (
                                <div key={quiz.id}>
                                  <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-gray-900">
                                          {quiz.title}
                                        </p>
                                        <Badge
                                          variant={quiz.isActive ? 'success' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {quiz.isActive ? 'Live' : 'Hidden'}
                                        </Badge>
                                        <Badge
                                          variant={
                                            quiz.questionCount === 10
                                              ? 'secondary'
                                              : 'destructive'
                                          }
                                          className="text-xs"
                                        >
                                          {quiz.questionCount} questions
                                        </Badge>
                                        {!allPublished && (
                                          <Badge variant="outline" className="text-xs">
                                            {quiz.publishedQuestionCount} published
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          isEditing ? cancelEdit() : beginEdit(quiz)
                                        }
                                        aria-label={isEditing ? 'Cancel editing' : `Edit ${quiz.title}`}
                                      >
                                        {isEditing ? (
                                          <X className="h-4 w-4" />
                                        ) : (
                                          <Pencil className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => remove(quiz)}
                                        disabled={deletingId === quiz.id}
                                        aria-label={`Delete ${quiz.title}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>

                                  {isEditing && editForm && (
                                    <div className="px-3 pb-4 sm:px-4 bg-gray-50 border-t">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">
                                            Name
                                          </label>
                                          <Input
                                            className="mt-1"
                                            value={editForm.title}
                                            onChange={(event) =>
                                              setEditForm((current) =>
                                                current
                                                  ? { ...current, title: event.target.value }
                                                  : current
                                              )
                                            }
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">
                                            Description
                                          </label>
                                          <Input
                                            className="mt-1"
                                            value={editForm.description}
                                            placeholder="Optional"
                                            onChange={(event) =>
                                              setEditForm((current) =>
                                                current
                                                  ? {
                                                      ...current,
                                                      description: event.target.value,
                                                    }
                                                  : current
                                              )
                                            }
                                          />
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                                        <label className="flex items-center gap-2 text-sm text-gray-700">
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded"
                                            checked={editForm.isActive}
                                            onChange={(event) =>
                                              setEditForm((current) =>
                                                current
                                                  ? {
                                                      ...current,
                                                      isActive: event.target.checked,
                                                    }
                                                  : current
                                              )
                                            }
                                          />
                                          Live
                                        </label>

                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={cancelEdit}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => save(quiz)}
                                            loading={savingId === quiz.id}
                                          >
                                            <Save className="h-4 w-4 mr-1" />
                                            Save
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
