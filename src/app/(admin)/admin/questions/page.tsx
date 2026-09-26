import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { History, Plus, Upload } from 'lucide-react'
import { QuestionsTable } from '@/components/admin/questions-table'
import { TestQuestionsBanner } from '@/components/admin/test-questions-banner'
import { ImportBatchesTable } from '@/components/admin/import-batches-table'
import { QuestionBankFilters } from '@/components/admin/question-bank-filters'
import {
  buildQuestionBankPageHref,
  buildQuestionBankWhere,
  normalizeQuestionContentType,
  type QuestionBankSearchParams,
} from '@/lib/admin-question-filters'
import {
  buildMockQuestionSetOptions,
  buildQuestionSetWhere,
  buildQuizQuestionSetOptions,
  type AdminQuestionSetOption,
} from '@/lib/admin-question-sets'

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: QuestionBankSearchParams
}) {
  const requestedPage = Number(searchParams.page ?? 1)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = 20
  const skip = (page - 1) * pageSize
  const selectedContentType = normalizeQuestionContentType(searchParams.contentType)
  const certificationId = searchParams.certification || undefined

  const [certifications, testCount, practiceBatches] = await Promise.all([
    prisma.certification.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, _count: { select: { questions: true } } },
    }),
    prisma.question.count({ where: { isTest: true } }),
    prisma.questionImportBatch.findMany({
      where: { contentType: 'PRACTICE_ONLY' },
      include: {
        certification: { select: { name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  let contentSets: AdminQuestionSetOption[] = []

  if (selectedContentType === 'MOCK_EXAM') {
    const exams = await prisma.mockExam.findMany({
      where: {
        ...(certificationId ? { certificationId } : {}),
        questions: {
          some: {
            question: { contentType: 'MOCK_EXAM' },
          },
        },
      },
      select: {
        id: true,
        title: true,
        certificationId: true,
        certification: { select: { name: true } },
        questions: {
          where: {
            question: { contentType: 'MOCK_EXAM' },
          },
          select: { id: true },
        },
      },
      orderBy: [
        { certification: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    contentSets = buildMockQuestionSetOptions(
      exams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        certificationId: exam.certificationId,
        certificationName: exam.certification.name,
        questionCount: exam.questions.length,
      })),
    )
  } else if (selectedContentType === 'QUIZ') {
    const [domains, tagQuizzes, quizQuestions] = await Promise.all([
      prisma.category.findMany({
        where: {
          certification: { isActive: true, usesDomains: true },
          ...(certificationId ? { certificationId } : {}),
        },
        select: {
          id: true,
          name: true,
          certificationId: true,
          certification: { select: { name: true } },
        },
        orderBy: [
          { certification: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
        ],
      }),
      prisma.quiz.findMany({
        where: {
          isActive: true,
          certification: { isActive: true },
          ...(certificationId ? { certificationId } : {}),
        },
        select: {
          id: true,
          title: true,
          tag: true,
          certificationId: true,
          isActive: true,
          certification: { select: { name: true } },
        },
        orderBy: [
          { certification: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
        ],
      }),
      prisma.question.findMany({
        where: {
          status: 'PUBLISHED',
          contentType: 'QUIZ',
          ...(certificationId ? { certificationId } : {}),
        },
        select: {
          id: true,
          certificationId: true,
          categoryId: true,
          tags: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ])

    contentSets = buildQuizQuestionSetOptions({
      domains: domains.map((domain) => ({
        id: domain.id,
        name: domain.name,
        certificationId: domain.certificationId,
        certificationName: domain.certification.name,
      })),
      tagQuizzes: tagQuizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        tag: quiz.tag,
        certificationId: quiz.certificationId,
        certificationName: quiz.certification.name,
        isActive: quiz.isActive,
      })),
      questions: quizQuestions,
    })
  }

  const activeContentSet = contentSets.some(
    (set) =>
      set.value === searchParams.contentSet &&
      set.contentType === selectedContentType,
  )
    ? searchParams.contentSet
    : undefined

  const effectiveSearchParams: QuestionBankSearchParams = {
    ...searchParams,
    contentSet: activeContentSet,
  }

  const where = {
    ...buildQuestionBankWhere(effectiveSearchParams),
    ...buildQuestionSetWhere(
      activeContentSet,
      selectedContentType,
      contentSets,
    ),
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        category: { select: { name: true } },
        topic: { select: { name: true } },
        certification: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Question Bank</h1>
          <p className="text-sm text-gray-500">{total} questions total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/questions/import-history"><History className="h-4 w-4 mr-1" />Import History</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/questions/import"><Upload className="h-4 w-4 mr-1" />Import CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/questions/new"><Plus className="h-4 w-4 mr-1" />Add Question</Link>
          </Button>
        </div>
      </div>

      <QuestionBankFilters
        searchParams={effectiveSearchParams}
        certifications={certifications}
        contentSets={contentSets.map(({ value, label, count }) => ({ value, label, count }))}
      />

      {testCount > 0 && <TestQuestionsBanner count={testCount} />}

      {selectedContentType === 'PRACTICE_ONLY' && (
        <section className="space-y-2">
          <div>
            <h2 className="text-lg font-semibold">Practice Import Batches</h2>
            <p className="text-sm text-gray-500">
              Delete a Practice import and exactly the questions that belong to it.
            </p>
          </div>
          <ImportBatchesTable batches={practiceBatches} />
        </section>
      )}

      <Card>
        <CardContent className="p-0 sm:p-3">
          <QuestionsTable questions={questions} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Showing {skip + 1}–{Math.min(skip + pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildQuestionBankPageHref(effectiveSearchParams, page - 1)}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildQuestionBankPageHref(effectiveSearchParams, page + 1)}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
