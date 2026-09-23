'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Upload, AlertCircle, CheckCircle2, X, FileText } from 'lucide-react'

const REQUIRED_COLS = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation']
const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'easy', 'medium', 'hard']
const ANSWER_PATTERN = /^[A-Fa-f](\s*,\s*[A-Fa-f])*$/

type ContentType = 'QUIZ' | 'MOCK_EXAM' | 'PRACTICE_ONLY'
type MockMode = 'EXISTING' | 'NEW'

interface Certification {
  id: string
  name: string
  slug: string
  fullName?: string | null
  usesDomains: boolean
}

interface MockExam {
  id: string
  title: string
  certificationId: string
  questionCount: number
  timeLimitMinutes: number
  passingScore: number
  requireSubscription: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  _count: { questions: number }
}

interface RowData {
  question_id?: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e?: string
  option_f?: string
  correct_answer: string
  explanation: string
  explanation_a?: string
  explanation_b?: string
  explanation_c?: string
  explanation_d?: string
  explanation_e?: string
  explanation_f?: string
  domain?: string
  topic?: string
  difficulty?: string
  source?: string
  tags?: string
  is_test?: string
}

interface ValidationResult {
  row: number
  errors: string[]
}

interface Preview {
  valid: RowData[]
  errors: ValidationResult[]
  total: number
}

const NEW_MOCK_DEFAULTS = {
  title: '',
  questionCount: '120',
  timeLimitMinutes: '120',
  passingScore: '70',
  requireSubscription: true,
}

function validateRow(row: RowData, requireDomain: boolean): string[] {
  const errors: string[] = []
  if (!row.question?.trim()) errors.push('Missing question text')
  if (!row.option_a?.trim()) errors.push('Missing option A')
  if (!row.option_b?.trim()) errors.push('Missing option B')
  if (!row.option_c?.trim()) errors.push('Missing option C')
  if (!row.option_d?.trim()) errors.push('Missing option D')
  if (!row.correct_answer?.trim()) errors.push('Missing correct answer')
  else if (!ANSWER_PATTERN.test(row.correct_answer.trim())) {
    errors.push('Correct answer must be A-F, or several separated by commas (e.g. A,C)')
  }
  if (!row.explanation?.trim()) errors.push('Missing explanation')
  if (requireDomain && !row.domain?.trim()) errors.push('Missing domain for this certification')

  for (const key of ['a', 'b', 'c', 'd', 'e', 'f'] as const) {
    const why = row[`explanation_${key}` as keyof RowData] as string | undefined
    const option = row[`option_${key}` as keyof RowData] as string | undefined
    if (why?.trim() && !option?.trim()) {
      errors.push(`explanation_${key} is filled in but option_${key} is empty`)
    }
  }

  if (row.difficulty && !VALID_DIFFICULTIES.includes(row.difficulty.trim())) {
    errors.push('Difficulty must be EASY, MEDIUM, or HARD')
  }
  return errors
}

export function CsvImportClient() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [importResult, setImportResult] = useState<{ count: number; examTitle?: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [publishNow, setPublishNow] = useState(true)
  const [replaceOrphanedMockQuestions, setReplaceOrphanedMockQuestions] = useState(false)

  const [certifications, setCertifications] = useState<Certification[]>([])
  const [certificationId, setCertificationId] = useState('')
  const [contentType, setContentType] = useState<ContentType | ''>('')

  const [exams, setExams] = useState<MockExam[]>([])
  const [mockMode, setMockMode] = useState<MockMode>('EXISTING')
  const [examId, setExamId] = useState('')
  const [newMock, setNewMock] = useState(NEW_MOCK_DEFAULTS)

  useEffect(() => {
    fetch('/api/certifications')
      .then((response) => response.json())
      .then((certs: Certification[]) => setCertifications(certs))
      .catch(() => {})

    fetch('/api/admin/exams')
      .then((response) => response.json())
      .then((rows: MockExam[]) => setExams(Array.isArray(rows) ? rows : []))
      .catch(() => {})
  }, [])

  const selectedCertification = useMemo(
    () => certifications.find((cert) => cert.id === certificationId) ?? null,
    [certifications, certificationId]
  )

  const matchingExams = useMemo(
    () => exams.filter((exam) => exam.certificationId === certificationId && exam.status !== 'ARCHIVED'),
    [exams, certificationId]
  )

  const selectedExam = useMemo(
    () => matchingExams.find((exam) => exam.id === examId) ?? null,
    [matchingExams, examId]
  )

  const missingForSelectedExam = selectedExam
    ? Math.max(0, selectedExam.questionCount - selectedExam._count.questions)
    : null

  function clearFileState() {
    setPreview(null)
    setImported(false)
    setImportResult(null)
  }

  function chooseCertification(value: string) {
    setCertificationId(value)
    setExamId('')
    setReplaceOrphanedMockQuestions(false)
    clearFileState()
  }

  function chooseContentType(value: ContentType | '') {
    setContentType(value)
    setExamId('')
    setReplaceOrphanedMockQuestions(false)
    clearFileState()
  }

  function processFile(file: File) {
    if (!certificationId) {
      toast({ title: 'Select a certification first', variant: 'destructive' })
      return
    }
    if (!contentType) {
      toast({ title: 'Select a content type first', variant: 'destructive' })
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: 'Please choose a CSV file', variant: 'destructive' })
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as RowData[]
        const headers = Object.keys(rows[0] ?? {})
        const missingCols = REQUIRED_COLS.filter((column) => !headers.includes(column))
        if (missingCols.length > 0) {
          toast({
            title: `Missing required columns: ${missingCols.join(', ')}`,
            variant: 'destructive',
          })
          return
        }

        const valid: RowData[] = []
        const errors: ValidationResult[] = []
        const requireDomain = selectedCertification?.usesDomains ?? false

        rows.forEach((row, index) => {
          const rowErrors = validateRow(row, requireDomain)
          if (rowErrors.length > 0) {
            errors.push({ row: index + 2, errors: rowErrors })
          } else {
            valid.push(row)
          }
        })

        setPreview({ valid, errors, total: rows.length })
      },
      error: () =>
        toast({ title: 'Failed to parse file. Check the CSV format.', variant: 'destructive' }),
    })
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setDragOver(false)
      const file = event.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [certificationId, contentType, selectedCertification]
  )

  function mockValidationError() {
    if (contentType !== 'MOCK_EXAM' || !preview) return null
    if (preview.errors.length > 0) {
      return 'Mock imports are all-or-nothing. Fix every invalid row before importing.'
    }

    if (mockMode === 'EXISTING') {
      if (!selectedExam) return 'Choose an existing Mock Exam.'
      if (missingForSelectedExam === 0) {
        return 'The selected Mock Exam is already full. Increase its question count first.'
      }
      if (preview.valid.length !== missingForSelectedExam) {
        return `This Mock Exam needs exactly ${missingForSelectedExam} more question${missingForSelectedExam === 1 ? '' : 's'}, but this CSV has ${preview.valid.length} valid rows.`
      }
      return null
    }

    const questionCount = Number(newMock.questionCount)
    const timeLimit = Number(newMock.timeLimitMinutes)
    const passingScore = Number(newMock.passingScore)
    if (!newMock.title.trim()) return 'Enter a name for the new Mock Exam.'
    if (!Number.isInteger(questionCount) || questionCount <= 0) {
      return 'Question count must be a positive whole number.'
    }
    if (!Number.isInteger(timeLimit) || timeLimit <= 0) {
      return 'Time limit must be a positive whole number of minutes.'
    }
    if (!Number.isInteger(passingScore) || passingScore < 1 || passingScore > 100) {
      return 'Passing percentage must be between 1 and 100.'
    }
    if (preview.valid.length !== questionCount) {
      return `The new Mock Exam expects exactly ${questionCount} questions, but this CSV has ${preview.valid.length} valid rows.`
    }
    return null
  }


  async function importQuestions() {
    if (!preview?.valid.length || !certificationId || !contentType) return

    const mockError = mockValidationError()
    if (mockError) {
      toast({ title: mockError, variant: 'destructive' })
      return
    }

    setImporting(true)
    const targetExamId =
      contentType === 'MOCK_EXAM' && mockMode === 'EXISTING' ? examId : undefined

    try {
      const response = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId,
          contentType,
          examId: targetExamId,
          newMock:
            contentType === 'MOCK_EXAM' && mockMode === 'NEW'
              ? {
                  title: newMock.title.trim(),
                  questionCount: Number(newMock.questionCount),
                  timeLimitMinutes: Number(newMock.timeLimitMinutes),
                  passingScore: Number(newMock.passingScore),
                  requireSubscription: newMock.requireSubscription,
                }
              : undefined,
          publishMock: contentType === 'MOCK_EXAM' ? publishNow : undefined,
          replaceOrphanedMockQuestions:
            contentType === 'MOCK_EXAM' ? replaceOrphanedMockQuestions : undefined,
          questions: preview.valid.map((question) => ({
            ...question,
            status: publishNow ? 'PUBLISHED' : 'DRAFT',
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        const details = Array.isArray(data.errors) && data.errors.length > 0
          ? ` ${data.errors[0]}`
          : ''
        throw new Error((data.error ?? 'Import failed') + details)
      }

      toast({
        title: `${data.imported} questions imported successfully`,
        description:
          data.replacedQuestionCount > 0
            ? `${data.replacedQuestionCount} orphaned Mock question${data.replacedQuestionCount === 1 ? '' : 's'} were safely replaced before import.`
            : contentType === 'MOCK_EXAM' && publishNow
              ? data.examStatus === 'PUBLISHED'
                ? 'Mock Exam published successfully.'
                : 'Questions were published, but the Mock Exam stayed in Draft because not all assigned questions are published.'
              : undefined,
        variant: 'success',
      })
      setImportResult({
        count: data.imported,
        examTitle: data.examTitle ?? selectedExam?.title,
      })
      setImported(true)
      setPreview(null)
      setReplaceOrphanedMockQuestions(false)

      if (contentType === 'MOCK_EXAM') {
        fetch('/api/admin/exams')
          .then((res) => res.json())
          .then((rows: MockExam[]) => setExams(Array.isArray(rows) ? rows : []))
          .catch(() => {})
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Import failed')
      toast({
        title: err.message,
        description:
          'No new Mock Exam or questions were created by the failed import. Fix the reported row/ID and retry.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const mockError = mockValidationError()
  const quizError =
    contentType === 'QUIZ' && preview?.errors.length
      ? 'Quiz imports are all-or-nothing. Fix every invalid row before importing so each persisted Quiz has exactly 10 questions.'
      : null

  return (
    <div className="space-y-6">
      {!imported && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">1. Certification *</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={certificationId}
                onChange={(event) => chooseCertification(event.target.value)}
              >
                <option value="">Select certification…</option>
                {certifications.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.fullName ? `${cert.name} — ${cert.fullName}` : cert.name}
                  </option>
                ))}
              </select>
              {selectedCertification && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedCertification.usesDomains
                    ? 'Domain is required for questions in this certification.'
                    : 'This certification does not require Domain or Topic.'}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">2. Content Type *</label>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={contentType}
                onChange={(event) => chooseContentType(event.target.value as ContentType | '')}
                disabled={!certificationId}
              >
                <option value="">Select content type…</option>
                <option value="QUIZ">Quiz</option>
                <option value="MOCK_EXAM">Mock Exam</option>
                <option value="PRACTICE_ONLY">Practice Only</option>
              </select>
              {contentType && (
                <p className="text-xs text-muted-foreground mt-1">
                  {contentType === 'QUIZ' && 'Quiz imports create persisted Quiz records in fixed sets of 10 within each Domain. Quiz questions stay in Quiz only.'}
                  {contentType === 'MOCK_EXAM' && 'Mock questions are assigned only to the selected Mock Exam.'}
                  {contentType === 'PRACTICE_ONLY' && 'Practice-only questions never enter Quiz or Mock automatically.'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!imported && contentType === 'MOCK_EXAM' && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold">Mock Exam</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Use an existing mock or define a new timed mock before importing its exact question set.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mockMode === 'EXISTING' ? 'default' : 'outline'}
                onClick={() => { setMockMode('EXISTING'); setPreview(null) }}
              >
                Existing Mock
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mockMode === 'NEW' ? 'default' : 'outline'}
                onClick={() => { setMockMode('NEW'); setExamId(''); setPreview(null) }}
              >
                Create New Mock
              </Button>
            </div>

            {mockMode === 'EXISTING' ? (
              <div>
                <label className="text-sm font-medium text-gray-700">Existing Mock Exam</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={examId}
                  onChange={(event) => { setExamId(event.target.value); setPreview(null) }}
                >
                  <option value="">Select mock…</option>
                  {matchingExams.map((exam) => {
                    const missing = Math.max(0, exam.questionCount - exam._count.questions)
                    return (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} — {exam._count.questions}/{exam.questionCount} ({missing} missing)
                      </option>
                    )
                  })}
                </select>
                {selectedExam && (
                  <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {selectedExam.title}
                    </p>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div>
                        <span className="block text-gray-500">Assigned / Target</span>
                        <strong>{selectedExam._count.questions} / {selectedExam.questionCount}</strong>
                      </div>
                      <div>
                        <span className="block text-gray-500">Missing</span>
                        <strong className={missingForSelectedExam && missingForSelectedExam > 0 ? 'text-amber-700' : 'text-green-700'}>
                          {missingForSelectedExam ?? 0}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-gray-500">Time</span>
                        <strong>{selectedExam.timeLimitMinutes} min</strong>
                      </div>
                      <div>
                        <span className="block text-gray-500">Pass</span>
                        <strong>{selectedExam.passingScore}%</strong>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="block text-gray-500">Status / Access</span>
                        <strong>
                          {selectedExam.status} · {selectedExam.requireSubscription ? 'Paid' : 'Free'}
                        </strong>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      The next Mock CSV must contain exactly {missingForSelectedExam ?? 0} valid question{missingForSelectedExam === 1 ? '' : 's'}.
                    </p>
                  </div>
                )}
                {matchingExams.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">No mocks exist yet for this certification. Choose Create New Mock.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Mock Exam Name *</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Full Mock 1 or Mini Mock 1"
                    value={newMock.title}
                    onChange={(event) => setNewMock((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Question Count *</label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={newMock.questionCount}
                    onChange={(event) => setNewMock((prev) => ({ ...prev, questionCount: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Time Limit (minutes) *</label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={newMock.timeLimitMinutes}
                    onChange={(event) => setNewMock((prev) => ({ ...prev, timeLimitMinutes: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Passing Percentage *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={newMock.passingScore}
                    onChange={(event) => setNewMock((prev) => ({ ...prev, passingScore: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Access Type *</label>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={newMock.requireSubscription ? 'PAID' : 'FREE'}
                    onChange={(event) =>
                      setNewMock((prev) => ({
                        ...prev,
                        requireSubscription: event.target.value === 'PAID',
                      }))
                    }
                  >
                    <option value="FREE">Free</option>
                    <option value="PAID">Subscriber / Paid</option>
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!imported && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">CSV Template</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Your CSV must have these column headers (case sensitive):
            </p>
            <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto">
              question_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation,explanation_a,explanation_b,explanation_c,explanation_d,domain,topic,difficulty,source,tags,is_test,option_e,option_f,explanation_e,explanation_f
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {[
                { col: 'question_id', req: false, note: 'Auto-generated if blank' },
                { col: 'question', req: true, note: 'Full question text' },
                { col: 'option_a', req: true, note: 'Option A text' },
                { col: 'option_b', req: true, note: 'Option B text' },
                { col: 'option_c', req: true, note: 'Option C text' },
                { col: 'option_d', req: true, note: 'Option D text' },
                { col: 'correct_answer', req: true, note: 'A-F, or A,C for select-two' },
                { col: 'explanation', req: true, note: 'Key idea — the principle tested' },
                { col: 'explanation_a', req: false, note: 'Why option A is right or wrong' },
                { col: 'explanation_b', req: false, note: 'Why option B is right or wrong' },
                { col: 'explanation_c', req: false, note: 'Why option C is right or wrong' },
                { col: 'explanation_d', req: false, note: 'Why option D is right or wrong' },
                { col: 'domain', req: selectedCertification?.usesDomains ?? false, note: 'Required only when certification uses domains' },
                { col: 'topic', req: false, note: 'Optional topic within domain' },
                { col: 'difficulty', req: false, note: 'EASY, MEDIUM, or HARD' },
                { col: 'source', req: false, note: 'Optional reference' },
                { col: 'tags', req: false, note: 'Comma-separated labels' },
                { col: 'is_test', req: false, note: 'true for throwaway test data' },
                { col: 'option_e', req: false, note: 'Only for 5-option questions' },
                { col: 'option_f', req: false, note: 'Only for 6-option questions' },
                { col: 'explanation_e', req: false, note: 'Only if option_e is used' },
                { col: 'explanation_f', req: false, note: 'Only if option_f is used' },
              ].map((column) => (
                <div key={column.col} className="flex items-start gap-1">
                  <span className={`font-mono ${column.req ? 'text-red-600' : 'text-gray-500'}`}>{column.col}</span>
                  {column.req && <span className="text-red-500">*</span>}
                  <span className="text-gray-400">— {column.note}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!preview && !imported && (
        <div
          onDragOver={(event) => { event.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            dragOver ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          } ${!certificationId || !contentType ? 'opacity-60' : ''}`}
        >
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700 mb-1">Drop your CSV file here</p>
          <p className="text-sm text-gray-500 mb-4">
            {!certificationId || !contentType
              ? 'Select Certification and Content Type first'
              : 'or click to browse'}
          </p>
          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            !certificationId || !contentType
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'cursor-pointer bg-primary text-white hover:bg-primary/90'
          }`}>
            <FileText className="h-4 w-4" />
            Choose CSV File
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFileChange}
              disabled={!certificationId || !contentType}
            />
          </label>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Preview ({preview.total} rows)</h3>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          </div>

          <div className="flex gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4" />
              <span><strong>{preview.valid.length}</strong> valid questions</span>
            </div>
            {preview.errors.length > 0 && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4" />
                <span><strong>{preview.errors.length}</strong> rows with errors</span>
              </div>
            )}
          </div>

          {contentType === 'QUIZ' && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${
              quizError ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
            }`}>
              {quizError ?? 'Quiz import is all-or-nothing. Every Domain must contain a multiple of 10 questions; each set becomes a persisted Quiz.'}
            </div>
          )}

          {contentType === 'MOCK_EXAM' && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${
              mockError ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
            }`}>
              {mockError ?? 'Question count matches the Mock Exam target. Ready to import.'}
            </div>
          )}

          {preview.errors.length > 0 && (
            <Card className="border-red-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-red-700 mb-3 text-sm">
                  {contentType === 'MOCK_EXAM'
                    ? 'Rows with errors — Mock import is blocked until these are fixed:'
                    : 'Rows with errors — these rows will not be imported:'}
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {preview.errors.map((error) => (
                    <div key={error.row} className="text-xs text-red-600">
                      <span className="font-mono font-semibold">Row {error.row}:</span>{' '}
                      {error.errors.join(' • ')}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {preview.valid.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Question</th>
                        <th className="text-left px-3 py-2 font-medium">Answer</th>
                        <th className="text-left px-3 py-2 font-medium">Domain</th>
                        <th className="text-left px-3 py-2 font-medium">Tags</th>
                        <th className="text-left px-3 py-2 font-medium">Difficulty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.valid.slice(0, 10).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 max-w-xs"><p className="truncate">{row.question}</p></td>
                          <td className="px-3 py-2 font-semibold text-primary">{row.correct_answer.toUpperCase()}</td>
                          <td className="px-3 py-2 text-gray-500">{row.domain?.trim() || '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{row.tags?.trim() || '—'}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {(row.difficulty ?? 'medium').toLowerCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.valid.length > 10 && (
                    <p className="text-xs text-muted-foreground px-3 py-2 text-center">
                      ...and {preview.valid.length - 10} more questions
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {contentType === 'MOCK_EXAM' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <label className="flex items-start gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={replaceOrphanedMockQuestions}
                  onChange={(event) => setReplaceOrphanedMockQuestions(event.target.checked)}
                  className="h-4 w-4 rounded border-amber-300 mt-0.5"
                />
                <span>
                  <strong>Re-import a deleted Mock using the same question IDs</strong>
                  <span className="block text-xs font-normal mt-1">
                    Replace only matching orphaned MOCK_EXAM questions that are no longer assigned to any Mock and have no learner answers or bookmarks. Anything with history or another assignment is blocked and will not be deleted.
                  </span>
                </span>
              </label>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(event) => setPublishNow(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            {contentType === 'MOCK_EXAM'
              ? 'Publish questions and Mock Exam after successful import'
              : 'Publish questions immediately'}
          </label>
          <p className="text-xs text-muted-foreground -mt-2">
            {contentType === 'MOCK_EXAM'
              ? 'The Mock Exam is published automatically only when its full configured question set is assigned and every assigned question is published.'
              : contentType === 'QUIZ'\n                ? 'Published Quiz questions appear only in their persisted 10-question Quiz.'\n                : 'Published Practice questions appear only in Practice.'}
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button
              onClick={importQuestions}
              loading={importing}
              disabled={
                preview.valid.length === 0 ||
                (contentType === 'MOCK_EXAM' && Boolean(mockError)) ||
                (contentType === 'QUIZ' && Boolean(quizError))
              }
            >
              Import {preview.valid.length} Questions
            </Button>
          </div>
        </div>
      )}

      {imported && (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Import Complete!</h3>
          <p className="text-muted-foreground text-sm mb-1">
            {importResult?.count ?? 0} questions were imported as {publishNow ? 'published' : 'draft'}.
          </p>
          {contentType === 'MOCK_EXAM' && importResult?.examTitle && (
            <p className="text-muted-foreground text-sm mb-4">
              Assigned to {importResult.examTitle}. The Mock Exam remains Draft until you publish it.
            </p>
          )}
          {contentType !== 'MOCK_EXAM' && <div className="mb-4" />}
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setImported(false)
                setImportResult(null)
                setExamId('')
                setNewMock(NEW_MOCK_DEFAULTS)
                setReplaceOrphanedMockQuestions(false)
              }}
            >
              Import More
            </Button>
            <Button asChild><a href="/admin/questions">View Questions</a></Button>
          </div>
        </div>
      )}
    </div>
  )
}
