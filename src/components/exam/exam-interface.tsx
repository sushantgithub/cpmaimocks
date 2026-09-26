'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { ExamQuestion } from '@/types'
import { answerLetters, normalizeAnswer } from '@/lib/answers'
import { nextResumeIndex, nextReviewIndex } from '@/lib/exam-progress'
import { AnswerExplanation, AnswerVerdict } from '@/components/exam/answer-explanation'
import {
  Flag, ChevronLeft, ChevronRight, Send, AlertCircle, X, Menu
} from 'lucide-react'

interface FeedbackData {
  selectedAnswer: string
  isCorrect: boolean
  correctAnswer: string
  explanation: string
  explanationA?: string | null
  explanationB?: string | null
  explanationC?: string | null
  explanationD?: string | null
  explanationE?: string | null
  explanationF?: string | null
}

interface Props {
  attemptId: string
  exam: { id: string; title: string; timeLimitMinutes: number; passingScore: number; showExplanations: boolean }
  timeLeftSeconds: number
  questions: ExamQuestion[]
  initialAnswers?: Record<string, string>
  initialMarked?: string[]
  initialChecked?: string[]
  initialFeedback?: Record<string, FeedbackData>
  initialQuestionIndex?: number
}

export function ExamInterface({ attemptId, exam, timeLeftSeconds, questions, initialAnswers = {}, initialMarked = [], initialChecked = [], initialFeedback = {}, initialQuestionIndex = 0 }: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(() => Math.min(Math.max(0, initialQuestionIndex), Math.max(0, questions.length - 1)))
  const [answers, setAnswers] = useState<Record<string, string>>(() => initialAnswers)
  const [marked, setMarked] = useState<Set<string>>(() => new Set(initialMarked))
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initialChecked))
  const [timeLeft, setTimeLeft] = useState(timeLeftSeconds)
  const [showPanel, setShowPanel] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, FeedbackData>>(() => initialFeedback)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const submitted = useRef(false)
  const deadline = useRef(timeLeftSeconds > 0 ? Date.now() + timeLeftSeconds * 1000 : null)
  const dirty = useRef<Set<string>>(new Set())
  const answersRef = useRef(answers)
  const markedRef = useRef(marked)
  const resumeUnansweredOnly = useRef((() => {
    const completedAtLoad = exam.showExplanations
      ? initialChecked.length
      : Object.values(initialAnswers).filter(Boolean).length
    return completedAtLoad > 0 && completedAtLoad < questions.length
  })())

  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { markedRef.current = marked }, [marked])

  const q = questions[current]
  const totalAnswered = exam.showExplanations
    ? checked.size
    : Object.values(answers).filter(Boolean).length
  const unanswered = questions.length - totalAnswered

  const submitExam = useCallback(async (auto = false) => {
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
        const body = await res.json().catch(() => ({}))
        if (body.code === 'ALREADY_SUBMITTED') {
          router.push(`/results/${attemptId}`)
          return
        }
        throw new Error(body.error || 'Submission failed')
      }
      const result = await res.json()
      if (auto || result.expired) {
        toast({ title: 'Time up! Exam submitted with your saved answers.', variant: 'default' })
      }
      router.push(`/results/${attemptId}`)
    } catch {
      toast({ title: 'Submission failed. Please try again.', variant: 'destructive' })
      submitted.current = false
      setSubmitting(false)
    }
  }, [attemptId, answers, router])

  const saveDirty = useCallback(async () => {
    const ids = Array.from(dirty.current)
    if (ids.length === 0 || submitted.current) return

    ids.forEach((id) => dirty.current.delete(id))
    const payload = ids.map((questionId) => ({
      questionId,
      selectedAnswer: answersRef.current[questionId] ?? null,
      isMarked: markedRef.current.has(questionId),
    }))

    try {
      const res = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
        keepalive: true,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.code === 'ATTEMPT_CLOSED' || body.code === 'TIME_EXPIRED') return
        throw new Error(body.error || 'Autosave failed')
      }
    } catch {
      ids.forEach((id) => dirty.current.add(id))
    }
  }, [attemptId])

  // Save only changed questions after a short idle period.
  useEffect(() => {
    if (dirty.current.size === 0) return
    const timer = window.setTimeout(() => { void saveDirty() }, 150)
    return () => window.clearTimeout(timer)
  }, [answers, marked, saveDirty])

  // Best-effort flush when the tab/app is backgrounded.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void saveDirty()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [saveDirty])

  // Derive the timer from an absolute deadline so background-tab throttling
  // cannot grant extra client-side answering time.
  useEffect(() => {
    if (deadline.current === null) return

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline.current! - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining > 0 && remaining <= 3) void saveDirty()
      if (remaining === 0) void submitExam(true)
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [saveDirty, submitExam])

  const multi = (q.selectCount ?? 1) > 1
  const chosen = answerLetters(answers[q.id])

  function selectAnswer(opt: string) {
    if (timeLeft <= 0 && deadline.current !== null) return
    if (feedback[q.id] || checked.has(q.id)) return
    dirty.current.add(q.id)
    setAnswers((prev) => {
      if (!multi) return { ...prev, [q.id]: opt }
      // Multiple-response: toggle, and stop at the number asked for so the
      // taker cannot tick every option and be marked correct by accident.
      const current = answerLetters(prev[q.id])
      const next = current.includes(opt)
        ? current.filter((k) => k !== opt)
        : current.length >= q.selectCount ? current : [...current, opt]
      return { ...prev, [q.id]: normalizeAnswer(next.join(',')) }
    })
  }

  async function revealCurrentFeedback() {
    const selected = answers[q.id]
    if (!selected || feedback[q.id] || feedbackLoading) return
    if (multi && answerLetters(selected).length !== q.selectCount) {
      toast({ title: `Select ${q.selectCount} answers first.`, variant: 'destructive' })
      return
    }

    setFeedbackLoading(true)
    try {
      const res = await fetch(`/api/attempts/${attemptId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, selectedAnswer: selected }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not load feedback')

      // The server has now persisted and locked this answer, so it no longer
      // needs to participate in the normal autosave queue.
      dirty.current.delete(q.id)
      setAnswers((prev) => ({ ...prev, [q.id]: data.selectedAnswer }))
      setFeedback((prev) => ({ ...prev, [q.id]: data }))
      setChecked((prev) => {
        const next = new Set(prev)
        next.add(q.id)
        return next
      })
      requestAnimationFrame(() => {
        document.getElementById(`exam-feedback-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Could not load feedback', variant: 'destructive' })
    } finally {
      setFeedbackLoading(false)
    }
  }

  function nextQuestion() {
    // During missed-question review, only reviewed/missed questions participate.
    // A selected answer is still incomplete until Check Answer has returned.
    if (reviewMode) {
      if (exam.showExplanations && answers[q.id] && !checked.has(q.id)) {
        void revealCurrentFeedback()
        return
      }

      const pendingReview = reviewQueue.filter(
        (index) => index !== current && !checked.has(questions[index].id),
      )
      const nextIndex = nextReviewIndex(current, pendingReview)

      if (nextIndex !== null) {
        setCurrent(nextIndex)
      } else {
        // This review pass is complete. Questions deliberately skipped during
        // review remain unanswered and are reported by the final confirmation,
        // but the queue never wraps back to an earlier item.
        setReviewMode(false)
        setReviewQueue([])
        setShowConfirm(true)
      }
      return
    }

    if (exam.showExplanations && answers[q.id] && !checked.has(q.id)) {
      void revealCurrentFeedback()
      return
    }

    if (resumeUnansweredOnly.current) {
      const pending = questions
        .map((question, index) => ({ question, index }))
        .filter(({ question, index }) =>
          index !== current && (exam.showExplanations
            ? !checked.has(question.id)
            : !answers[question.id])
        )
        .map(({ index }) => index)

      const nextIndex = nextResumeIndex(current, pending)
      if (nextIndex !== null) {
        setCurrent(nextIndex)
        return
      }

      // The resumed unanswered pass is complete. If the current question was
      // deliberately skipped, let the existing review flow handle it;
      // otherwise the attempt is ready for final confirmation.
      resumeUnansweredOnly.current = false
      const currentIncomplete = exam.showExplanations
        ? !checked.has(q.id)
        : !answers[q.id]
      if (currentIncomplete) setShowReview(true)
      else setShowConfirm(true)
      return
    }

    // An unanswered learning-mock question is a deliberate skip.
    if (exam.showExplanations && !answers[q.id]) {
      setCurrent((current) => Math.min(questions.length - 1, current + 1))
      return
    }
    if (exam.showExplanations && !checked.has(q.id)) {
      void revealCurrentFeedback()
      return
    }
    setCurrent((current) => Math.min(questions.length - 1, current + 1))
  }

  const hasResumePending = resumeUnansweredOnly.current && questions.some(
    (question, index) => index !== current && (exam.showExplanations
      ? !checked.has(question.id)
      : !answers[question.id])
  )

  const needsReview = questions
    .map((question, index) => ({
      question,
      index,
      // In learning mocks a selection is only provisional until Check Answer
      // returns feedback. This prevents a selected-but-unchecked Q1 from making
      // Submit incorrectly report only Q10 (or any other missing placeholder).
      unanswered: exam.showExplanations ? !checked.has(question.id) : !answers[question.id],
      marked: marked.has(question.id),
    }))
    .filter((item) => item.unanswered || (!exam.showExplanations && item.marked))

  function openReviewQuestion(index: number, queue?: number[]) {
    setReviewQueue(queue ?? needsReview.filter((item) => item.unanswered).map((item) => item.index))
    setReviewMode(true)
    setCurrent(index)
    setShowReview(false)
  }

  function startUnansweredReview() {
    const queue = needsReview.filter((item) => item.unanswered).map((item) => item.index)
    if (queue.length > 0) openReviewQuestion(queue[0], queue)
  }

  function toggleMark() {
    if (timeLeft <= 0 && deadline.current !== null) return
    dirty.current.add(q.id)
    setMarked((prev) => {
      const next = new Set(prev)
      next.has(q.id) ? next.delete(q.id) : next.add(q.id)
      return next
    })
  }

  const untimed = deadline.current === null
  const isWarning = !untimed && timeLeft < 300 // last 5 minutes

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button className="md:hidden p-1" onClick={() => setShowPanel(true)} disabled={reviewMode}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{exam.title}</p>
            <p className="text-xs text-muted-foreground">Q {current + 1} of {questions.length}</p>
          </div>
        </div>

        {!untimed && (
          <div className={cn(
            'font-mono font-bold text-lg tabular-nums px-3 py-1 rounded-lg',
            isWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-800'
          )}>
            {formatTime(timeLeft)}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => reviewMode ? nextQuestion() : (needsReview.length > 0 ? setShowReview(true) : setShowConfirm(true))}
          disabled={submitting || feedbackLoading}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {reviewMode ? (answers[q.id] && !checked.has(q.id) ? 'Check' : 'Continue') : 'Submit'}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            {/* Difficulty + marks */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs capitalize">{q.difficulty.toLowerCase()}</Badge>
              {q.category && <Badge variant="secondary" className="text-xs">{q.category}</Badge>}
              {marked.has(q.id) && <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">Marked for review</Badge>}
            </div>

            {/* Question text */}
            <div className="bg-white rounded-xl border p-5 mb-5 shadow-sm">
              <p className="text-base leading-relaxed font-medium">{q.text}</p>
              {multi && (
                <p className="mt-3 text-sm font-semibold text-primary">
                  Select {q.selectCount === 2 ? 'two' : q.selectCount === 3 ? 'three' : q.selectCount}.
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
                const selected = chosen.includes(opt.key)
                return (
                  <button
                    key={opt.key}
                    onClick={() => selectAnswer(opt.key)}
                    className={cn(
                      'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all active:scale-[0.99]',
                      selected
                        ? 'border-primary bg-blue-50 text-primary'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 border-2 flex items-center justify-center text-sm font-bold',
                      multi ? 'rounded-md' : 'rounded-full',
                      selected ? 'border-primary bg-primary text-white' : 'border-gray-300'
                    )}>
                      {opt.key}
                    </span>
                    <span className="leading-relaxed text-sm pt-0.5">{opt.text}</span>
                  </button>
                )
              })}
            </div>

            {exam.showExplanations && feedback[q.id] && (
              <div
                id={`exam-feedback-${q.id}`}
                tabIndex={-1}
                className={cn(
                  'mt-5 rounded-xl border-2 p-4',
                  feedback[q.id].isCorrect ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
                )}
              >
                <AnswerVerdict
                  isCorrect={feedback[q.id].isCorrect}
                  correctAnswer={feedback[q.id].correctAnswer}
                />
                <AnswerExplanation
                  question={{ ...q, ...feedback[q.id] }}
                  selectedAnswer={feedback[q.id].selectedAnswer}
                  className="border-t border-gray-200 pt-3 mt-3"
                />
              </div>
            )}

          </div>
          </div>

          {/* Action bar — stays put instead of scrolling away on long questions */}
          <div className="border-t bg-white px-4 py-3 flex-shrink-0">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={reviewMode || current === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>

              {!exam.showExplanations && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMark}
                  className={marked.has(q.id) ? 'border-yellow-400 text-yellow-700' : ''}
                >
                  <Flag className="h-3.5 w-3.5 mr-1" />
                  {marked.has(q.id) ? 'Unmark' : 'Mark'}
                </Button>
              )}

              {reviewMode ? (
                <Button size="sm" onClick={nextQuestion} loading={feedbackLoading}>
                  {answers[q.id] && !checked.has(q.id)
                    ? 'Check Answer'
                    : checked.has(q.id)
                      ? (nextReviewIndex(current, reviewQueue.filter((index) => index !== current && !checked.has(questions[index].id))) !== null ? 'Next Unanswered' : 'Finish Review')
                      : 'Next Unanswered'}
                  {!feedbackLoading && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              ) : current === questions.length - 1 && !hasResumePending ? (
                <Button size="sm" onClick={() => needsReview.length > 0 ? setShowReview(true) : setShowConfirm(true)} disabled={submitting}>
                  <Send className="h-3.5 w-3.5 mr-1.5" />Finish
                </Button>
              ) : (
                <Button size="sm" onClick={nextQuestion} loading={feedbackLoading}>
                  {exam.showExplanations && answers[q.id] && !checked.has(q.id)
                    ? 'Check Answer'
                    : resumeUnansweredOnly.current
                      ? 'Next Unanswered'
                      : 'Next'}
                  {!feedbackLoading && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Desktop question navigator */}
        {!reviewMode && (
        <aside className="hidden md:flex w-56 flex-col border-l bg-white p-3 overflow-y-auto flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Navigator</p>
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => {
              const qId = questions[i].id
              const isAnswered = exam.showExplanations ? checked.has(qId) : !!answers[qId]
              const isMarked = marked.has(qId)
              const isCurrent = i === current
              return (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    'h-7 w-7 rounded text-xs font-medium border transition-colors',
                    isCurrent ? 'bg-primary text-white border-primary' :
                    isMarked ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                    isAnswered ? 'bg-green-100 border-green-300 text-green-800' :
                    'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />Answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" />Marked</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />Not answered</div>
          </div>
          <div className="mt-4 pt-4 border-t text-xs">
            <p><span className="font-semibold">{totalAnswered}</span> answered</p>
            <p className="text-muted-foreground">{unanswered} remaining</p>
          </div>
        </aside>
        )}
      </div>

      {/* Mobile question panel overlay */}
      {showPanel && !reviewMode && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-end" onClick={() => setShowPanel(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Question Navigator</p>
              <button onClick={() => setShowPanel(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {questions.map((_, i) => {
                const qId = questions[i].id
                const isAnswered = exam.showExplanations ? checked.has(qId) : !!answers[qId]
                const isMarked = marked.has(qId)
                const isCurrent = i === current
                return (
                  <button
                    key={i}
                    onClick={() => { setCurrent(i); setShowPanel(false) }}
                    className={cn(
                      'h-9 w-9 rounded-lg text-sm font-medium border',
                      isCurrent ? 'bg-primary text-white border-primary' :
                      isMarked ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                      isAnswered ? 'bg-green-100 border-green-300 text-green-800' :
                      'bg-white border-gray-200 text-gray-600'
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Review unanswered and marked questions before final submission */}
      {showReview && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="font-bold text-lg">Needs Review</h3>
              <button onClick={() => setShowReview(false)} aria-label="Close review"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {exam.showExplanations
                ? `${needsReview.length} unanswered question${needsReview.length === 1 ? '' : 's'} before submission.`
                : `${needsReview.length} question${needsReview.length === 1 ? '' : 's'} need attention before submission.`}
            </p>
            <div className="space-y-2 overflow-y-auto mb-4">
              {needsReview.map((item) => (
                <button
                  key={item.question.id}
                  onClick={() => {
                    const queue = needsReview.filter((reviewItem) => reviewItem.unanswered).map((reviewItem) => reviewItem.index)
                    openReviewQuestion(item.index, queue.filter((index) => index >= item.index))
                  }}
                  className="w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-gray-50"
                >
                  <span className="font-medium">Q{item.index + 1}</span>
                  <span className="flex gap-1.5 flex-wrap justify-end">
                    {item.unanswered && <Badge variant="outline" className="text-xs">Unanswered</Badge>}
                    {!exam.showExplanations && item.marked && <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">Marked</Badge>}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={exam.showExplanations ? startUnansweredReview : () => needsReview[0] && openReviewQuestion(needsReview[0].index)}>
                {exam.showExplanations ? 'Review Unanswered' : 'Keep Reviewing'}
              </Button>
              <Button className="flex-1" onClick={() => { setShowReview(false); setShowConfirm(true) }}>Submit Anyway</Button>
            </div>
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <h3 className="font-bold text-lg">Submit Exam?</h3>
            </div>
            <div className="rounded-xl border divide-y mb-4 text-sm">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Answered</span>
                <strong>{totalAnswered}</strong>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Unanswered</span>
                <strong>{unanswered}</strong>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Marked for Review</span>
                <strong>{marked.size}</strong>
              </div>
            </div>
            {unanswered > 0 && (
              <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3 mb-4">
                Unanswered questions will remain unanswered in the final result.
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              Final submission cannot be undone. You can review this exact attempt after it is submitted.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowConfirm(false)
                  if (needsReview.length > 0) setShowReview(true)
                }}
              >
                Back to Exam
              </Button>
              <Button className="flex-1" onClick={() => { setShowConfirm(false); submitExam() }} loading={submitting}>
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
