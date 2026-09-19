import { auth } from '@/lib/auth'
import { getAttemptResults } from '@/lib/quiz'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatTime, getScoreGrade } from '@/lib/utils'
import Link from 'next/link'
import { CheckCircle2, XCircle, MinusCircle, Trophy, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { answerLetters } from '@/lib/answers'
import { AnswerExplanation } from '@/components/exam/answer-explanation'
import { prisma } from '@/lib/db'

export default async function ResultsPage({ params, searchParams }: { params: { attemptId: string }; searchParams?: { review?: string } }) {
  const session = await auth()
  const result = await getAttemptResults(params.attemptId, session!.user.id)
  if (!result) {
    const attempt = await prisma.examAttempt.findFirst({
      where: { id: params.attemptId, userId: session!.user.id },
      select: { status: true, mode: true, examId: true },
    })
    if (attempt?.status === 'IN_PROGRESS') {
      if (attempt.mode === 'EXAM' && attempt.examId) redirect(`/exams/${attempt.examId}`)
      redirect(`/practice/${params.attemptId}`)
    }
    redirect('/dashboard')
  }

  const score = Math.round(result.score ?? 0)
  const grade = getScoreGrade(score)
  const timeTaken = result.timeTakenSeconds ?? 0
  const reviewFilter = ['correct', 'incorrect', 'unanswered'].includes(searchParams?.review ?? '') ? searchParams!.review! : 'all'
  const reviewAnswers = result.answers.filter((answer) =>
    reviewFilter === 'all' ? true :
    reviewFilter === 'correct' ? answer.isCorrect === true :
    reviewFilter === 'incorrect' ? answer.isCorrect === false :
    !answer.selectedAnswer
  )

  // Domain breakdown
  const domainMap = new Map<string, { correct: number; total: number }>()
  result.answers.forEach((a) => {
    const cat = a.question.category?.name ?? 'General'
    const entry = domainMap.get(cat) ?? { correct: 0, total: 0 }
    entry.total++
    if (a.isCorrect) entry.correct++
    domainMap.set(cat, entry)
  })

  return (
    <div className="max-w-3xl mx-auto pb-20 md:pb-6 space-y-6">
      {/* Score card */}
      <Card className={cn('border-2', result.passed ? 'border-green-400' : 'border-red-300')}>
        <CardContent className="p-6 text-center">
          <Trophy className={cn('h-12 w-12 mx-auto mb-3', result.passed ? 'text-yellow-500' : 'text-gray-400')} />
          <h1 className="text-4xl font-bold mb-1">{score}%</h1>
          <p className={cn('text-lg font-semibold mb-4', grade.color)}>{grade.label}</p>
          <Badge className={result.passed ? 'bg-green-100 text-green-800 border-green-200 text-sm px-4 py-1' : 'bg-red-100 text-red-800 border-red-200 text-sm px-4 py-1'}>
            {result.passed ? `✓ Passed (${result.passingScore}% required)` : `✗ Did not pass (${result.passingScore}% required)`}
          </Badge>
          <p className="text-sm text-muted-foreground mt-3">{result.exam?.title}</p>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle2, label: 'Correct', value: result.correctCount ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: XCircle, label: 'Incorrect', value: result.incorrectCount ?? 0, color: 'text-red-500', bg: 'bg-red-50' },
          { icon: MinusCircle, label: 'Unanswered', value: result.unansweredCount ?? 0, color: 'text-gray-400', bg: 'bg-gray-50' },
          { icon: Clock, label: 'Time Taken', value: formatTime(timeTaken), color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className={cn('p-4 text-center', s.bg)}>
              <s.icon className={cn('h-5 w-5 mx-auto mb-1', s.color)} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Domain breakdown */}
      {domainMap.size > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Domain Performance</h3>
            <div className="space-y-3">
              {Array.from(domainMap.entries()).map(([domain, data]) => {
                const pct = Math.round((data.correct / data.total) * 100)
                return (
                  <div key={domain}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{domain}</span>
                      <span className={cn('font-semibold', getScoreGrade(pct).color)}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{data.correct}/{data.total} correct</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed review */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-lg">Question Review</h3>
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'All'],
              ['correct', `Correct (${result.correctCount ?? 0})`],
              ['incorrect', `Incorrect (${result.incorrectCount ?? 0})`],
              ['unanswered', `Unanswered (${result.unansweredCount ?? 0})`],
            ].map(([value, label]) => (
              <Button key={value} size="sm" variant={reviewFilter === value ? 'default' : 'outline'} asChild>
                <Link href={value === 'all' ? `/results/${params.attemptId}` : `/results/${params.attemptId}?review=${value}`}>
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {reviewAnswers.map((answer) => {
            const i = result.answers.findIndex((item) => item.id === answer.id)
            const q = answer.question
            const isCorrect = answer.isCorrect
            const isUnanswered = !answer.selectedAnswer

            return (
              <Card key={answer.id} className={cn('border-l-4', isCorrect ? 'border-l-green-400' : isUnanswered ? 'border-l-gray-300' : 'border-l-red-400')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /> :
                     isUnanswered ? <MinusCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" /> :
                     <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                    <p className="text-sm font-medium leading-relaxed">{i + 1}. {q.text}</p>
                  </div>

                  <div className="ml-6 space-y-1.5 mb-3">
                    {[
                      { key: 'A', text: q.optionA },
                      { key: 'B', text: q.optionB },
                      { key: 'C', text: q.optionC },
                      { key: 'D', text: q.optionD },
                      { key: 'E', text: q.optionE },
                      { key: 'F', text: q.optionF },
                    ].filter((opt) => opt.text).map((opt) => {
                      const isSelected = answerLetters(answer.selectedAnswer).includes(opt.key)
                      const isRight = answerLetters(q.correctAnswer).includes(opt.key)
                      return (
                        <div
                          key={opt.key}
                          className={cn(
                            'flex items-start gap-2 rounded-lg p-2 text-sm',
                            isRight ? 'bg-green-50 text-green-800' :
                            isSelected && !isRight ? 'bg-red-50 text-red-800' :
                            'text-muted-foreground'
                          )}
                        >
                          <span className="font-semibold flex-shrink-0">{opt.key}.</span>
                          <span>{opt.text}</span>
                          {isRight && <span className="ml-auto text-xs font-semibold text-green-700">✓ Correct</span>}
                          {isSelected && !isRight && <span className="ml-auto text-xs font-semibold text-red-700">Your answer</span>}
                        </div>
                      )
                    })}
                  </div>

                  <AnswerExplanation
                    question={q}
                    selectedAnswer={answer.selectedAnswer}
                    expanded
                    className="ml-6"
                  />

                  <div className="ml-6 mt-2 flex gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{q.difficulty.toLowerCase()}</Badge>
                    {q.category && <Badge variant="secondary" className="text-xs">{q.category.name}</Badge>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/exams">All Exams</Link>
        </Button>
        <Button className="flex-1" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
