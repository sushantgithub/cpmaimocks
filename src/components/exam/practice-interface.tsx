'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { answerLetters, normalizeAnswer, isAnswerCorrect, expectedCount } from '@/lib/answers'
import { AnswerExplanation, AnswerVerdict } from '@/components/exam/answer-explanation'
import {
  ChevronLeft, ChevronRight, Send, AlertCircle, X, Menu,
  Bookmark, BookmarkCheck, CheckCircle2, XCircle, Lock
} from 'lucide-react'

interface PracticeQuestion {
  id: string
  questionId: string
  text: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  optionF?: string | null
  correctAnswer: string
  explanation: string
  explanationA?: string | null
  explanationB?: string | null
  explanationC?: string | null
  explanationD?: string | null
  explanationE?: string | null
  explanationF?: string | null
  difficulty: string
  category?: string
  topic?: string
  selectedAnswer?: string | null
}

interface Props {
  attemptId: string
  questions: PracticeQuestion[]
  mode?: 'PRACTICE' | 'QUIZ'
  sessionTitle?: string
  bookmarksEnabled?: boolean
  freeQuizSession?: boolean
}

export function PracticeInterface({
  attemptId,
  questions,
  mode = 'PRACTICE',
  sessionTitle,
  bookmarksEnabled = true,
  freeQuizSession = false,
}: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  // answers: questionId -> selected option key
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    questions.forEach((q) => { if (q.selectedAnswer) initial[q.id] = q.selectedAnswer })
    return initial
  })
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [showPanel, setShowPanel] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState<string | null>(null)
  const [answerSaving, setAnswerSaving] = useState<string | null>(null)
  const submitted = useRef(false)

  const q = questions[current]
  const selectCount = expectedCount(q.correctAnswer)
  const multi = selectCount > 1
  const [pending, setPending] = useState<string[]>([])
  const selectedAnswer = answers[q.id]
  const revealed = !!selectedAnswer
  const isCorrect = revealed && isAnswerCorrect(selectedAnswer, q.correctAnswer)
  const totalAnswered = Object.values(answers).filter(Boolean).length
  const correctLetters = answerLetters(q.correctAnswer)
  const chosenLetters = revealed ? answerLetters(selectedAnswer) : pending
  const hasPendingSelection = !revealed && pending.length > 0
  const pendingReady = multi ? pending.length === selectCount : pending.length === 1

  async function commitAnswer(selection: string[]) {
    if (answers[q.id] || answerSaving === q.id) return
    if ((!multi && selection.length !== 1) || (multi && selection.length !== selectCount)) return

    const committed = normalizeAnswer(selection.join(','))
    setAnswerSaving(q.id)
    try {
      // A checked answer is persisted before feedback is revealed. Reloading,
      // closing the browser, or returning later therefore resumes the same
      // quiz/practice state instead of losing progress.
      const res = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, selectedAnswer: committed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) {
          router.push(`/results/${attemptId}`)
          return
        }
        throw new Error(data.error ?? 'Could not save answer')
      }

      const savedAnswer = normalizeAnswer(data.selectedAnswer ?? committed)
      setAnswers((prev) => ({ ...prev, [q.id]: savedAnswer }))
      setPending([])

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const feedback = document.getElementById(`feedback-${q.id}`)
          feedback?.focus({ preventScroll: true })
          feedback?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      })
    } catch (error) {
      toast({
        title: 'Answer not saved',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setAnswerSaving(null)
    }
  }

  function selectAnswer(opt: string) {
    if (answers[q.id] || answerSaving === q.id) return

    if (!multi) {
      void commitAnswer([opt])
      return
    }

    const next = pending.includes(opt)
      ? pending.filter((k) => k !== opt)
      : pending.length >= selectCount ? pending : [...pending, opt]
    setPending(next)
  }

  function submitAnswer() {
    void commitAnswer(pending)
  }

  async function toggleBookmark(questionId: string) {
    if (!bookmarksEnabled) return
    setBookmarkLoading(questionId)
    const isBookmarked = bookmarks.has(questionId)
    try {
      const res = await fetch('/api/bookmarks', {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })
      if (!res.ok) throw new Error('Failed')
      setBookmarks((prev) => {
        const next = new Set(prev)
        isBookmarked ? next.delete(questionId) : next.add(questionId)
        return next
      })
    } catch {
      toast({ title: 'Failed to update bookmark', variant: 'destructive' })
    } finally {
      setBookmarkLoading(null)
    }
  }

  const submitPractice = useCallback(async () => {
    if (submitted.current) return
    submitted.current = true
    setSubmitting(true)
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // A retry can arrive after the server has already completed the
        // attempt but before the first response/navigation reached the client.
        // In that case the submission succeeded; take the learner to results.
        if (res.status === 409 && data.code === 'ALREADY_SUBMITTED') {
          router.push(`/results/${attemptId}`)
          return
        }
        throw new Error('Submission failed')
      }
      router.push(`/results/${attemptId}`)
    } catch {
      toast({ title: 'Submission failed. Please try again.', variant: 'destructive' })
      submitted.current = false
      setSubmitting(false)
    }
  }, [attemptId, answers, router])

  function getQuestionStatus(index: number) {
    const qId = questions[index].id
    const ans = answers[qId]
    if (!ans) return 'unanswered'
    return isAnswerCorrect(ans, questions[index].correctAnswer) ? 'correct' : 'incorrect'
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button className="md:hidden p-1" onClick={() => setShowPanel(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="font-semibold text-sm">
              {mode === 'QUIZ' ? (sessionTitle ?? 'Quiz') : 'Practice Mode'}
            </p>
            <p className="text-xs text-muted-foreground">Q {current + 1} of {questions.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="hidden sm:flex gap-1 items-center">
            <span className="text-green-600 font-bold">
              {questions.filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length}
            </span>
            <span className="text-muted-foreground">/</span>
            <span>{totalAnswered}</span>
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">{totalAnswered}/{questions.length} done</span>
        </div>

        <Button
          size="sm"
          onClick={() => hasPendingSelection ? submitAnswer() : setShowConfirm(true)}
          disabled={submitting || answerSaving === q.id || (hasPendingSelection && !pendingReady)}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {hasPendingSelection ? 'Check Answer' : 'Finish'}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main question area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            {/* Meta badges */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">{q.difficulty.toLowerCase()}</Badge>
              {q.category && <Badge variant="secondary" className="text-xs">{q.category}</Badge>}
              {q.topic && <Badge variant="outline" className="text-xs text-muted-foreground">{q.topic}</Badge>}
            </div>

            {/* Question text */}
            <div className="bg-white rounded-xl border p-5 mb-5 shadow-sm">
              <p className="text-base leading-relaxed font-medium">{q.text}</p>
              {multi && !revealed && (
                <p className="mt-3 text-sm font-semibold text-primary">
                  Select {selectCount === 2 ? 'two' : selectCount === 3 ? 'three' : selectCount}, then submit your answer.
                  {pending.length > 0 && ` ${pending.length} of ${selectCount} chosen.`}
                </p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {[
                { key: 'A', text: q.optionA },
                { key: 'B', text: q.optionB },
                { key: 'C', text: q.optionC },
                { key: 'D', text: q.optionD },
                { key: 'E', text: q.optionE },
                { key: 'F', text: q.optionF },
              ].filter((opt) => opt.text).map((opt) => {
                const isSelected = chosenLetters.includes(opt.key)
                const isRight = correctLetters.includes(opt.key)
                let optClass = 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 cursor-pointer'

                if (revealed) {
                  if (isRight) {
                    optClass = 'border-green-400 bg-green-50 cursor-default'
                  } else if (isSelected && !isRight) {
                    optClass = 'border-red-400 bg-red-50 cursor-default'
                  } else {
                    optClass = 'border-gray-200 bg-white opacity-60 cursor-default'
                  }
                } else if (isSelected) {
                  optClass = 'border-primary bg-blue-50 cursor-pointer'
                }

                return (
                  <button
                    key={opt.key}
                    onClick={() => selectAnswer(opt.key)}
                    disabled={revealed || answerSaving === q.id}
                    className={cn(
                      'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
                      optClass
                    )}
                  >
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 border-2 flex items-center justify-center text-sm font-bold',
                      multi ? 'rounded-md' : 'rounded-full',
                      revealed && isRight ? 'border-green-500 bg-green-500 text-white' :
                      revealed && isSelected && !isRight ? 'border-red-500 bg-red-500 text-white' :
                      isSelected ? 'border-primary bg-primary text-white' :
                      'border-gray-300'
                    )}>
                      {revealed && isRight ? <CheckCircle2 className="h-4 w-4" /> :
                       revealed && isSelected && !isRight ? <XCircle className="h-4 w-4" /> :
                       opt.key}
                    </span>
                    <span className="leading-relaxed text-sm pt-0.5">{opt.text}</span>
                  </button>
                )
              })}
            </div>

            {!revealed && multi && (
              <div className="mt-4">
                <Button
                  className="w-full"
                  onClick={submitAnswer}
                  disabled={!pendingReady || answerSaving === q.id}
                  loading={answerSaving === q.id}
                >
                  Check Answer
                </Button>
              </div>
            )}

            {/* Result + Explanation (shown after answering) */}
            {revealed && (
              <div id={`feedback-${q.id}`} tabIndex={-1} className={cn(
                'mt-5 rounded-xl border-2 p-4',
                isCorrect ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
              )}>
                <AnswerVerdict isCorrect={isCorrect} correctAnswer={q.correctAnswer} />
                <AnswerExplanation
                  question={q}
                  selectedAnswer={selectedAnswer}
                  className="border-t border-gray-200 pt-3 mt-3"
                />
              </div>
            )}

          </div>
          </div>

          {/* Action bar — explanations make these pages long, so keep the controls in reach */}
          <div className="border-t bg-white px-4 py-3 flex-shrink-0">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPending([]); setCurrent((c) => Math.max(0, c - 1)) }}
                disabled={current === 0 || answerSaving === q.id}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>

              <button
                onClick={() => toggleBookmark(q.id)}
                disabled={!bookmarksEnabled || bookmarkLoading === q.id}
                title={bookmarksEnabled ? undefined : 'Bookmarks are included with paid plans'}
                className={cn(
                  'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all',
                  !bookmarksEnabled
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : bookmarks.has(q.id)
                      ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600'
                )}
              >
                {!bookmarksEnabled
                  ? <><Lock className="h-4 w-4" />Save (Paid)</>
                  : bookmarks.has(q.id)
                    ? <><BookmarkCheck className="h-4 w-4" />Saved</>
                    : <><Bookmark className="h-4 w-4" />Save</>
                }
              </button>

              {hasPendingSelection ? (
                <Button size="sm" onClick={submitAnswer} disabled={!pendingReady || answerSaving === q.id} loading={answerSaving === q.id}>
                  Check Answer<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : current === questions.length - 1 ? (
                <Button size="sm" onClick={() => setShowConfirm(true)} disabled={submitting || answerSaving === q.id}>
                  <Send className="h-4 w-4 mr-1" />Finish
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => { setPending([]); setCurrent((c) => Math.min(questions.length - 1, c + 1)) }}
                  disabled={answerSaving === q.id}
                >
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Desktop navigator */}
        <aside className="hidden md:flex w-56 flex-col border-l bg-white p-3 overflow-y-auto flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Navigator</p>
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => {
              const status = getQuestionStatus(i)
              const isCurrent = i === current
              return (
                <button
                  key={i}
                  onClick={() => { setPending([]); setCurrent(i) }}
                  disabled={answerSaving === q.id}
                  className={cn(
                    'h-7 w-7 rounded text-xs font-medium border transition-colors',
                    isCurrent ? 'bg-primary text-white border-primary' :
                    status === 'correct' ? 'bg-green-100 border-green-300 text-green-800' :
                    status === 'incorrect' ? 'bg-red-100 border-red-300 text-red-800' :
                    'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />Correct</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />Incorrect</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />Not answered</div>
          </div>
          <div className="mt-4 pt-4 border-t text-xs space-y-1">
            <p><span className="font-semibold text-green-700">{questions.filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length}</span> correct</p>
            <p><span className="font-semibold text-red-700">{questions.filter((q) => answers[q.id] && !isAnswerCorrect(answers[q.id], q.correctAnswer)).length}</span> incorrect</p>
            <p className="text-muted-foreground">{questions.length - totalAnswered} remaining</p>
          </div>
        </aside>
      </div>

      {/* Mobile navigator overlay */}
      {showPanel && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-end" onClick={() => setShowPanel(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Question Navigator</p>
              <button onClick={() => setShowPanel(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-8 gap-2 mb-4">
              {questions.map((_, i) => {
                const status = getQuestionStatus(i)
                const isCurrent = i === current
                return (
                  <button
                    key={i}
                    onClick={() => { setPending([]); setCurrent(i); setShowPanel(false) }}
                    disabled={answerSaving === q.id}
                    className={cn(
                      'h-9 w-9 rounded-lg text-sm font-medium border',
                      isCurrent ? 'bg-primary text-white border-primary' :
                      status === 'correct' ? 'bg-green-100 border-green-300 text-green-800' :
                      status === 'incorrect' ? 'bg-red-100 border-red-300 text-red-800' :
                      'bg-white border-gray-200 text-gray-600'
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" />Correct</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" />Wrong</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-200" />Unanswered</span>
            </div>
          </div>
        </div>
      )}

      {/* Finish confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-blue-500" />
              <h3 className="font-bold text-lg">{mode === 'QUIZ' ? 'Finish Quiz?' : 'Finish Practice?'}</h3>
            </div>
            <div className="space-y-2 mb-6 text-sm">
              {freeQuizSession && (
                <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-800">
                  Finishing ends this quiz's one free session. If you leave without finishing, you can resume this same session later.
                </p>
              )}
              <p className="text-green-700">
                <strong>{questions.filter((q) => isAnswerCorrect(answers[q.id], q.correctAnswer)).length}</strong> correct
              </p>
              <p className="text-red-700">
                <strong>{questions.filter((q) => answers[q.id] && !isAnswerCorrect(answers[q.id], q.correctAnswer)).length}</strong> incorrect
              </p>
              {questions.length - totalAnswered > 0 && (
                <p className="text-muted-foreground">
                  <strong>{questions.length - totalAnswered}</strong> unanswered
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Continue</Button>
              <Button className="flex-1" onClick={() => { setShowConfirm(false); submitPractice() }} loading={submitting}>
                See Results
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
