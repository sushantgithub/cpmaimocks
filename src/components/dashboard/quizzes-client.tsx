'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { Lock, Trophy, RotateCcw, ArrowRight } from 'lucide-react'
import type { QuizSummary } from '@/lib/quizzes'

export function QuizzesClient({ quizzes, showCertification }: { quizzes: QuizSummary[]; showCertification: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function start(quiz: QuizSummary) {
    setBusy(quiz.key)
    try {
      const res = await fetch('/api/quizzes/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: quiz.key }),
      })
      const data = await res.json()
      if (res.status === 402) {
        toast({ title: 'Free limit reached', description: data.error, variant: 'destructive' })
        router.push('/subscription')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Could not start')
      router.push(`/practice/${data.attemptId}`)
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Could not start', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  async function restart(quiz: QuizSummary) {
    if (!confirm(`Start ${quiz.title} again from the beginning? Your progress on it resets.`)) return
    setBusy(quiz.key)
    try {
      const res = await fetch('/api/quizzes/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: quiz.key }),
      })
      if (!res.ok) throw new Error('Could not restart')
      router.refresh()
      toast({ title: `${quiz.title} reset`, variant: 'success' })
    } catch {
      toast({ title: 'Could not restart', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Quizzes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ten questions at a time, with the answer and explanation straight after each one. No timer.
        </p>
      </div>

      {quizzes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No quizzes yet. They appear once questions are published.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quizzes.map((quiz) => {
          const pct = quiz.total > 0 ? Math.round((quiz.answered / quiz.total) * 100) : 0
          const remaining = Math.max(0, quiz.total - quiz.answered)
          return (
            <Card key={quiz.key} className={quiz.mastered ? 'border-green-300' : ''}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold leading-tight">{quiz.title}</h3>
                  {quiz.mastered && (
                    <Badge variant="success" className="text-xs flex items-center gap-1 flex-shrink-0">
                      <Trophy className="h-3 w-3" />Mastered
                    </Badge>
                  )}
                </div>

                {showCertification && (
                  <Badge variant="secondary" className="text-xs mb-2">{quiz.certificationName}</Badge>
                )}
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mb-3">{quiz.description}</p>
                )}

                <div className="mt-3 mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{quiz.answered} of {quiz.total} answered</span>
                  {quiz.wrong > 0 && <span className="text-amber-600">{quiz.wrong} to revisit</span>}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${quiz.mastered ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-4">
                  {quiz.locked ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Your free 10-question session for this quiz is complete.
                      </p>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/subscription"><Lock className="h-4 w-4 mr-2" />View paid plans to continue</Link>
                      </Button>
                    </div>
                  ) : quiz.mastered ? (
                    <div className="space-y-2">
                      <p className="text-sm text-green-700">
                        Every question answered correctly. Nicely done.
                      </p>
                      <Button variant="outline" className="w-full" onClick={() => restart(quiz)} loading={busy === quiz.key}>
                        <RotateCcw className="h-4 w-4 mr-2" />Practise again
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full" onClick={() => start(quiz)} loading={busy === quiz.key}>
                      {quiz.answered > 0 ? 'Continue' : 'Start'}
                      <span className="text-xs opacity-80 ml-1.5">
                        · {Math.min(10, remaining + quiz.wrong)} questions
                      </span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
