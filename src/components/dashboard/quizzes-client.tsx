'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import {
  ArrowRight,
  CheckCircle2,
  History,
  Lock,
  RotateCcw,
  Target,
} from 'lucide-react'
import type { QuizSlotSummary, QuizStartAction, QuizSummary } from '@/lib/quizzes'

function scoreLabel(score: number | null) {
  return score === null ? '—' : Math.round(score) + '%'
}

function historyDate(value: string) {
  return new Date(value).toLocaleDateString()
}

export function QuizzesClient({
  quizzes,
  showCertification,
}: {
  quizzes: QuizSummary[]
  showCertification: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function launch(
    quiz: QuizSummary,
    quizNumber: number | null,
    action: QuizStartAction,
  ) {
    const busyKey = quiz.key + ':' + (quizNumber ?? 'mixed') + ':' + action
    setBusy(busyKey)
    try {
      const res = await fetch('/api/quizzes/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: quiz.key, quizNumber, action }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 402) {
        toast({
          title: 'Paid plan required',
          description: data.error,
          variant: 'destructive',
        })
        router.push('/subscription')
        return
      }

      if (!res.ok) throw new Error(data.error ?? 'Could not start quiz')
      router.push('/practice/' + data.attemptId)
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Could not start quiz',
        variant: 'destructive',
      })
    } finally {
      setBusy(null)
    }
  }

  function slotActions(quiz: QuizSummary, slot: QuizSlotSummary) {
    const startBusy = busy === quiz.key + ':' + slot.number + ':start'
    const retakeBusy = busy === quiz.key + ':' + slot.number + ':retake'
    const retryBusy = busy === quiz.key + ':' + slot.number + ':retryIncorrect'

    if (slot.activeAttemptId) {
      return (
        <Button
          className="w-full"
          onClick={() => launch(quiz, slot.number, 'start')}
          loading={startBusy}
        >
          Resume Quiz {slot.number}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )
    }

    if (slot.completed && slot.latestAttemptId) {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <Link href={'/results/' + slot.latestAttemptId}>Review latest</Link>
            </Button>
            {quiz.premiumAccess ? (
              <Button
                variant="outline"
                onClick={() => launch(quiz, slot.number, 'retake')}
                loading={retakeBusy}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/subscription">
                  <Lock className="h-4 w-4 mr-2" />
                  Retake
                </Link>
              </Button>
            )}
          </div>

          {quiz.premiumAccess && slot.latestIncorrect > 0 && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => launch(quiz, slot.number, 'retryIncorrect')}
              loading={retryBusy}
            >
              <Target className="h-4 w-4 mr-2" />
              Retry {slot.latestIncorrect} incorrect
            </Button>
          )}

          {slot.history.length > 1 && (
            <details className="rounded-lg border bg-gray-50 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Attempt history ({slot.history.length})
              </summary>
              <div className="mt-2 space-y-1">
                {slot.history.map((attempt, index) => (
                  <Link
                    key={attempt.id}
                    href={'/results/' + attempt.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-white"
                  >
                    <span>
                      Attempt {slot.history.length - index} · {historyDate(attempt.submittedAt)}
                    </span>
                    <span className="font-semibold">{scoreLabel(attempt.score)}</span>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>
      )
    }

    if (slot.lockReason === 'SUBSCRIPTION') {
      return (
        <Button variant="outline" className="w-full" asChild>
          <Link href="/subscription">
            <Lock className="h-4 w-4 mr-2" />
            Paid quiz
          </Link>
        </Button>
      )
    }

    if (slot.lockReason === 'PREVIOUS') {
      return (
        <Button variant="outline" className="w-full" disabled>
          Complete Quiz {slot.number - 1} first
        </Button>
      )
    }

    if (slot.lockReason === 'FREE_USED') {
      return (
        <Button variant="outline" className="w-full" asChild>
          <Link href="/subscription">
            <Lock className="h-4 w-4 mr-2" />
            Free attempt used
          </Link>
        </Button>
      )
    }

    return (
      <Button
        className="w-full"
        onClick={() => launch(quiz, slot.number, 'start')}
        loading={startBusy}
      >
        Start Quiz {slot.number}
        <span className="text-xs opacity-80 ml-1.5">· {slot.questionCount} questions</span>
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Quizzes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Each domain is split into fixed 10-question quizzes. No timer, with feedback after each answer.
        </p>
      </div>

      {quizzes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No quizzes yet. They appear once questions are published.
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {quizzes.map((quiz) => {
          const pct =
            quiz.quizCount > 0
              ? Math.round((quiz.completedQuizzes / quiz.quizCount) * 100)
              : 0
          const mixedBusy = busy === quiz.key + ':mixed:mixedReview'

          return (
            <Card key={quiz.key} className={quiz.mastered ? 'border-green-300' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold leading-tight">{quiz.title}</h3>
                    {showCertification && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        {quiz.certificationName}
                      </Badge>
                    )}
                  </div>
                  {quiz.mastered && (
                    <Badge variant="success" className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Mastered
                    </Badge>
                  )}
                </div>

                {quiz.description && (
                  <p className="text-sm text-muted-foreground mt-2">{quiz.description}</p>
                )}

                <div className="mt-4 mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {quiz.completedQuizzes} of {quiz.quizCount} quizzes completed
                  </span>
                  <span>{quiz.total} questions</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={quiz.mastered ? 'h-full rounded-full bg-green-500' : 'h-full rounded-full bg-primary'}
                    style={{ width: pct + '%' }}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                  {quiz.slots.map((slot) => (
                    <div key={slot.number} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold">Quiz {slot.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {slot.questionCount} questions · Untimed
                          </p>
                        </div>
                        {slot.activeAttemptId ? (
                          <Badge variant="secondary" className="text-xs">In progress</Badge>
                        ) : slot.completed ? (
                          <Badge variant="success" className="text-xs">Completed</Badge>
                        ) : slot.number === 1 && !quiz.premiumAccess ? (
                          <Badge variant="secondary" className="text-xs">Free</Badge>
                        ) : slot.lockReason ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : null}
                      </div>

                      {slot.completed && (
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          <div className="rounded bg-gray-50 p-2">
                            <div className="text-xs text-muted-foreground">Latest</div>
                            <div className="font-semibold">{scoreLabel(slot.latestScore)}</div>
                          </div>
                          <div className="rounded bg-gray-50 p-2">
                            <div className="text-xs text-muted-foreground">Best</div>
                            <div className="font-semibold">{scoreLabel(slot.bestScore)}</div>
                          </div>
                          <div className="rounded bg-gray-50 p-2">
                            <div className="text-xs text-muted-foreground">Attempts</div>
                            <div className="font-semibold">{slot.attemptCount}</div>
                          </div>
                        </div>
                      )}

                      {slotActions(quiz, slot)}
                    </div>
                  ))}
                </div>

                {quiz.premiumAccess && quiz.completedQuizzes === quiz.quizCount && (
                  <div className="mt-4 rounded-xl border bg-blue-50/50 p-3">
                    {quiz.mixedReviewAvailable ? (
                      <>
                        <p className="text-sm font-medium">Weak-question review</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-2">
                          Practise questions you currently have wrong across this domain.
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => launch(quiz, null, 'mixedReview')}
                          loading={mixedBusy}
                        >
                          Start Mixed Review
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-green-700">
                        No weak questions remain across this domain.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
