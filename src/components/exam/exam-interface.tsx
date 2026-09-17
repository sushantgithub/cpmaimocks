'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { ExamQuestion } from '@/types'
import {
  Flag, ChevronLeft, ChevronRight, Send, AlertCircle, X, Menu
} from 'lucide-react'

interface Props {
  attemptId: string
  exam: { id: string; title: string; timeLimitMinutes: number; passingScore: number }
  questions: ExamQuestion[]
}

export function ExamInterface({ attemptId, exam, questions }: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [timeLeft, setTimeLeft] = useState(exam.timeLimitMinutes * 60)
  const [showPanel, setShowPanel] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitted = useRef(false)

  const q = questions[current]
  const totalAnswered = Object.keys(answers).length
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
      if (!res.ok) throw new Error('Submission failed')
      if (auto) toast({ title: 'Time up! Exam auto-submitted.', variant: 'default' })
      router.push(`/results/${attemptId}`)
    } catch {
      toast({ title: 'Submission failed. Please try again.', variant: 'destructive' })
      submitted.current = false
      setSubmitting(false)
    }
  }, [attemptId, answers, router])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer)
          submitExam(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [submitExam])

  function selectAnswer(opt: string) {
    setAnswers((prev) => ({ ...prev, [q.id]: opt }))
  }

  function clearAnswer() {
    setAnswers((prev) => { const next = { ...prev }; delete next[q.id]; return next })
  }

  function toggleMark() {
    setMarked((prev) => {
      const next = new Set(prev)
      next.has(q.id) ? next.delete(q.id) : next.add(q.id)
      return next
    })
  }

  const isWarning = timeLeft < 300 // last 5 minutes

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button className="md:hidden p-1" onClick={() => setShowPanel(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{exam.title}</p>
            <p className="text-xs text-muted-foreground">Q {current + 1} of {questions.length}</p>
          </div>
        </div>

        <div className={cn(
          'font-mono font-bold text-lg tabular-nums px-3 py-1 rounded-lg',
          isWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-800'
        )}>
          {formatTime(timeLeft)}
        </div>

        <Button variant="outline" size="sm" onClick={() => setShowConfirm(true)} disabled={submitting}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Submit
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
            </div>

            {/* Options */}
            <div className="space-y-3">
              {[
                { key: 'A', text: q.optionA },
                { key: 'B', text: q.optionB },
                { key: 'C', text: q.optionC },
                { key: 'D', text: q.optionD },
              ].map((opt) => {
                const selected = answers[q.id] === opt.key
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
                      'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold',
                      selected ? 'border-primary bg-primary text-white' : 'border-gray-300'
                    )}>
                      {opt.key}
                    </span>
                    <span className="leading-relaxed text-sm pt-0.5">{opt.text}</span>
                  </button>
                )
              })}
            </div>

          </div>
          </div>

          {/* Action bar — stays put instead of scrolling away on long questions */}
          <div className="border-t bg-white px-4 py-3 flex-shrink-0">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>

              <div className="flex gap-2">
                {answers[q.id] && (
                  <Button variant="ghost" size="sm" onClick={clearAnswer} className="text-muted-foreground">
                    <X className="h-3.5 w-3.5 mr-1" />Clear
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMark}
                  className={marked.has(q.id) ? 'border-yellow-400 text-yellow-700' : ''}
                >
                  <Flag className="h-3.5 w-3.5 mr-1" />
                  {marked.has(q.id) ? 'Unmark' : 'Mark'}
                </Button>
              </div>

              {current === questions.length - 1 ? (
                <Button size="sm" onClick={() => setShowConfirm(true)} disabled={submitting}>
                  <Send className="h-3.5 w-3.5 mr-1.5" />Finish
                </Button>
              ) : (
                <Button size="sm" onClick={() => setCurrent((c) => c + 1)}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* Desktop question navigator */}
        <aside className="hidden md:flex w-56 flex-col border-l bg-white p-3 overflow-y-auto flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Navigator</p>
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => {
              const qId = questions[i].id
              const isAnswered = !!answers[qId]
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
      </div>

      {/* Mobile question panel overlay */}
      {showPanel && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-end" onClick={() => setShowPanel(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Question Navigator</p>
              <button onClick={() => setShowPanel(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {questions.map((_, i) => {
                const qId = questions[i].id
                const isAnswered = !!answers[qId]
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

      {/* Submit confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <h3 className="font-bold text-lg">Submit Exam?</h3>
            </div>
            {unanswered > 0 && (
              <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3 mb-4">
                You have <strong>{unanswered} unanswered</strong> questions. They will be marked incorrect.
              </p>
            )}
            {marked.size > 0 && (
              <p className="text-sm text-yellow-800 bg-yellow-50 rounded-lg p-3 mb-4">
                <strong>{marked.size}</strong> still marked for review.
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              {totalAnswered} of {questions.length} answered. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowConfirm(false)
                  // Send them to the first gap rather than dumping them where they were
                  const firstGap = questions.findIndex((question) => !answers[question.id])
                  if (firstGap !== -1) setCurrent(firstGap)
                }}
              >
                Review
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
