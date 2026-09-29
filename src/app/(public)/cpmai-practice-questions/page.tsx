import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PracticeQuizJsonLd } from '@/components/seo/json-ld'
import { OPTION_KEYS, answerLetters } from '@/lib/answers'
import { FREE_SAMPLE_PAGE_PATH } from '@/lib/free-sample'
import { getFreeSampleQuestions, type FreeSampleQuestion } from '@/lib/free-sample-questions'

export const revalidate = 3600

const TITLE = 'Free PMI CPMAI Practice Questions with Answers'
const DESCRIPTION =
  'Try free PMI CPMAI practice questions with answers and explanations. Scenario-based questions across the CPMAI exam domains, no sign-up needed.'

async function loadQuestions(): Promise<FreeSampleQuestion[]> {
  try {
    return await getFreeSampleQuestions()
  } catch {
    return []
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const questions = await loadQuestions()
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: FREE_SAMPLE_PAGE_PATH },
    openGraph: { title: TITLE, description: DESCRIPTION, url: FREE_SAMPLE_PAGE_PATH },
    // Keep an empty page out of Google until questions are marked as free samples.
    ...(questions.length === 0 && { robots: { index: false, follow: true } }),
  }
}

function optionsOf(q: FreeSampleQuestion) {
  const text: Record<string, string | null> = {
    A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD, E: q.optionE, F: q.optionF,
  }
  const why: Record<string, string | null> = {
    A: q.explanationA, B: q.explanationB, C: q.explanationC,
    D: q.explanationD, E: q.explanationE, F: q.explanationF,
  }
  const correct = answerLetters(q.correctAnswer)
  return OPTION_KEYS.filter((k) => text[k]?.trim()).map((k) => ({
    key: k,
    text: text[k]!.trim(),
    why: why[k]?.trim() || null,
    correct: correct.includes(k),
  }))
}

function CtaBox({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-xl bg-blue-50 border border-blue-200 p-6 text-center">
      <h2 className="font-bold text-lg mb-2">{heading}</h2>
      <p className="text-sm text-muted-foreground mb-4">{body}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/register"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          Start Free Today
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-white px-6 py-2.5 text-sm font-medium text-primary hover:bg-blue-50"
        >
          See Full Mock Exams
        </Link>
      </div>
    </div>
  )
}

export default async function FreePracticeQuestionsPage() {
  const questions = await loadQuestions()
  const rendered = questions.map((q) => ({ q, options: optionsOf(q) }))
  const midpoint = Math.ceil(rendered.length / 2)

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
      {rendered.length > 0 && (
        <PracticeQuizJsonLd
          name={TITLE}
          about="PMI Certified Professional in Managing AI (CPMAI) exam"
          questions={rendered.map(({ q, options }) => ({
            text: q.text,
            options,
            explanation: q.explanation,
          }))}
        />
      )}

      <h1 className="text-3xl md:text-4xl font-bold mb-4">Free PMI CPMAI Practice Questions</h1>
      <div className="space-y-3 text-muted-foreground leading-relaxed mb-8">
        <p>
          These free PMI CPMAI practice questions are written in the scenario style of the real exam:
          you are managing an AI initiative and must choose the best next step. Each question comes
          with the correct answer and an explanation of the reasoning.
        </p>
        <p>
          Read each scenario, pick your answer, then tap <strong>Show answer</strong> to check it.
          For the exam format, domains and a study plan, see our{' '}
          <Link href="/blog/pmi-cpmai-exam-guide-2026" className="text-primary underline">
            PMI CPMAI exam guide
          </Link>
          .
        </p>
      </div>

      {rendered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">Sample questions are being added. Sign up free to practise now.</p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              Start Free Today
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {rendered.map(({ q, options }, i) => {
            const correctCount = options.filter((o) => o.correct).length
            return (
              <div key={q.id} className="space-y-5">
                {i === midpoint && rendered.length >= 6 && (
                  <CtaBox
                    heading="Want the full question bank?"
                    body="Full-length 120-question CPMAI mock exams with a real exam timer, domain-wise scoring and detailed explanations."
                  />
                )}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-primary">Question {i + 1}</span>
                      {q.category && <Badge variant="outline" className="text-xs">{q.category.name}</Badge>}
                    </div>
                    <p className="font-medium leading-relaxed whitespace-pre-line">{q.text}</p>
                    {correctCount > 1 && (
                      <p className="text-xs font-medium text-muted-foreground">Select {correctCount}.</p>
                    )}
                    <ol className="space-y-2">
                      {options.map((o) => (
                        <li key={o.key} className="flex gap-3 rounded-lg border px-3 py-2.5 text-sm">
                          <span className="font-semibold text-muted-foreground">{o.key}.</span>
                          <span>{o.text}</span>
                        </li>
                      ))}
                    </ol>
                    <details className="group rounded-lg bg-gray-50 border">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
                        Show answer
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="px-4 pb-4 space-y-3 text-sm">
                        <p className="flex items-center gap-2 font-semibold text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Correct answer: {options.filter((o) => o.correct).map((o) => o.key).join(', ')}
                        </p>
                        <p className="leading-relaxed">{q.explanation}</p>
                        {options.some((o) => o.why) && (
                          <ul className="space-y-2 border-t pt-3">
                            {options.filter((o) => o.why).map((o) => (
                              <li key={o.key} className="leading-relaxed">
                                <span className={o.correct ? 'font-semibold text-green-700' : 'font-semibold text-gray-700'}>
                                  {o.key}{o.correct ? ' (correct)' : ''}:
                                </span>{' '}
                                <span className="text-muted-foreground">{o.why}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-10">
        <CtaBox
          heading="Ready for the real thing?"
          body="Practise with full CPMAI mock exams that match the real exam: 120 questions in 160 minutes, with explanations for every answer."
        />
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center">
        CertMocks is an independent exam-prep platform and is not affiliated with or endorsed by PMI.
        All questions are independently written for practice.
      </p>
    </div>
  )
}
