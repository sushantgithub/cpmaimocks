'use client'

import { cn } from '@/lib/utils'
import { answerLetters, explanationRows, type ExplanationRow } from '@/lib/answers'
import { CheckCircle2, XCircle } from 'lucide-react'

export interface ExplainedQuestion {
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  optionF?: string | null
  correctAnswer: string
  /** The key idea — one line naming the principle the question tests. */
  explanation: string
  explanationA?: string | null
  explanationB?: string | null
  explanationC?: string | null
  explanationD?: string | null
  explanationE?: string | null
  explanationF?: string | null
}

interface Props {
  question: ExplainedQuestion
  /** What the learner picked, e.g. "B" or "A,C". */
  selectedAnswer: string | null | undefined
  /** Results pages list every option at once; a live sitting does not. */
  expanded?: boolean
  className?: string
}

function OptionRow({ row }: { row: ExplanationRow }) {
  return (
    <li
      className={cn(
        'flex gap-3 rounded-lg border border-l-[3px] p-3',
        row.correct ? 'border-green-200 border-l-green-500 bg-green-50' : 'border-red-100 border-l-red-400 bg-red-50/60'
      )}
    >
      <span className={cn('flex-shrink-0 font-bold text-sm pt-px', row.correct ? 'text-green-700' : 'text-red-700')}>
        {row.key}
      </span>
      <span className="text-sm leading-relaxed text-gray-800">
        <span className={cn('font-bold', row.correct ? 'text-green-700' : 'text-red-700')}>
          {row.correct ? 'Correct.' : 'Incorrect.'}
        </span>{' '}
        {row.why}
        {row.chosen && (
          <span className="ml-1.5 align-middle text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            your answer
          </span>
        )}
      </span>
    </li>
  )
}

/**
 * Feedback after an answer, in the order it is meant to be read: the learner's
 * own option first, then the correct one, then the key idea, with the options
 * they did not pick folded away. Questions imported before per-option text
 * existed show the key idea alone, exactly as they always have.
 */
export function AnswerExplanation({ question, selectedAnswer, className }: Props) {
  const rows = explanationRows(question, selectedAnswer)
  const keyIdea = question.explanation?.trim()

  return (
    <div className={cn('space-y-3', className)}>
      {keyIdea && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 mb-1">Key idea</p>
          <p className="text-sm leading-relaxed text-blue-950">{keyIdea}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-2">Explanation</p>
          <ul className="space-y-2">
            {rows.map((row) => <OptionRow key={row.key} row={row} />)}
          </ul>
        </div>
      )}
    </div>
  )
}

/** The verdict line that sits above the explanation during a sitting. */
export function AnswerVerdict({ isCorrect, correctAnswer }: { isCorrect: boolean; correctAnswer: string }) {
  const letters = answerLetters(correctAnswer)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isCorrect ? (
        <>
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-800">Correct!</span>
        </>
      ) : (
        <>
          <XCircle className="h-5 w-5 text-red-600" />
          <span className="font-semibold text-red-800">Incorrect</span>
          <span className="text-sm text-red-700">
            — Correct answer: <strong>{letters.join(' and ')}</strong>
          </span>
        </>
      )}
    </div>
  )
}
