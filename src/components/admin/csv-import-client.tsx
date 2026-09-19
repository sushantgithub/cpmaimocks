'use client'

import { useState, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Upload, AlertCircle, CheckCircle2, X, FileText } from 'lucide-react'

const REQUIRED_COLS = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation']
const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'easy', 'medium', 'hard']
// One letter, or several comma separated for a multiple-response question.
const ANSWER_PATTERN = /^[A-Fa-f](\s*,\s*[A-Fa-f])*$/

interface Certification {
  id: string; name: string; slug: string; fullName?: string | null
}

interface RowData {
  question_id?: string; question: string; option_a: string; option_b: string
  option_c: string; option_d: string; option_e?: string; option_f?: string
  correct_answer: string; explanation: string
  explanation_a?: string; explanation_b?: string; explanation_c?: string
  explanation_d?: string; explanation_e?: string; explanation_f?: string
  domain?: string; topic?: string; difficulty?: string; source?: string
  tags?: string
  is_test?: string
}

interface ValidationResult {
  row: number; errors: string[]
}

interface Preview { valid: RowData[]; errors: ValidationResult[]; total: number }

function validateRow(row: RowData, index: number): string[] {
  const errors: string[] = []
  if (!row.question?.trim()) errors.push('Missing question text')
  if (!row.option_a?.trim()) errors.push('Missing option A')
  if (!row.option_b?.trim()) errors.push('Missing option B')
  if (!row.option_c?.trim()) errors.push('Missing option C')
  if (!row.option_d?.trim()) errors.push('Missing option D')
  if (!row.correct_answer?.trim()) errors.push('Missing correct answer')
  else if (!ANSWER_PATTERN.test(row.correct_answer.trim())) errors.push('Correct answer must be A-F, or several separated by commas (e.g. A,C)')
  if (!row.explanation?.trim()) errors.push('Missing explanation')
  // Per-option explanations are optional, but one written against an option
  // that does not exist means the columns have slipped.
  for (const k of ['a', 'b', 'c', 'd', 'e', 'f'] as const) {
    const why = row[`explanation_${k}` as keyof RowData] as string | undefined
    const opt = row[`option_${k}` as keyof RowData] as string | undefined
    if (why?.trim() && !opt?.trim()) errors.push(`explanation_${k} is filled in but option_${k} is empty`)
  }
  if (row.difficulty && !VALID_DIFFICULTIES.includes(row.difficulty.trim())) errors.push('Difficulty must be EASY, MEDIUM, or HARD')
  return errors
}

export function CsvImportClient() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [publishNow, setPublishNow] = useState(true)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [certificationId, setCertificationId] = useState('')

  useEffect(() => {
    fetch('/api/certifications')
      .then(r => r.json())
      .then((certs: Certification[]) => {
        setCertifications(certs)
        if (certs.length > 0) setCertificationId(certs[0].id)
      })
      .catch(() => {})
  }, [])

  function processFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as RowData[]
        const headers = Object.keys(rows[0] ?? {})
        const missingCols = REQUIRED_COLS.filter((c) => !headers.includes(c))
        if (missingCols.length > 0) {
          toast({ title: `Missing required columns: ${missingCols.join(', ')}`, variant: 'destructive' })
          return
        }

        const valid: RowData[] = []
        const errors: ValidationResult[] = []

        rows.forEach((row, i) => {
          const rowErrors = validateRow(row, i + 2)
          if (rowErrors.length > 0) {
            errors.push({ row: i + 2, errors: rowErrors })
          } else {
            valid.push(row)
          }
        })

        setPreview({ valid, errors, total: rows.length })
      },
      error: () => toast({ title: 'Failed to parse file. Check format.', variant: 'destructive' }),
    })
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  async function importQuestions() {
    if (!preview?.valid.length) return
    setImporting(true)
    try {
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId,
          questions: preview.valid.map((q) => ({ ...q, status: publishNow ? 'PUBLISHED' : 'DRAFT' })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: `${data.imported} questions imported successfully!`, variant: 'success' })
      setImported(true)
      setPreview(null)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Import failed')
      toast({ title: error.message, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Template download */}
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
              { col: 'domain', req: false, note: 'CPMAI domain name' },
              { col: 'topic', req: false, note: 'Topic within domain' },
              { col: 'difficulty', req: false, note: 'EASY, MEDIUM, or HARD' },
              { col: 'source', req: false, note: 'Optional reference' },
              { col: 'tags', req: false, note: 'Comma-separated, e.g. algorithm' },
              { col: 'is_test', req: false, note: 'true to mark as throwaway test data' },
              { col: 'option_e', req: false, note: 'Only for 5-option questions' },
              { col: 'option_f', req: false, note: 'Only for 6-option questions' },
              { col: 'explanation_e', req: false, note: 'Only if option_e is used' },
              { col: 'explanation_f', req: false, note: 'Only if option_f is used' },
            ].map((c) => (
              <div key={c.col} className="flex items-start gap-1">
                <span className={`font-mono ${c.req ? 'text-red-600' : 'text-gray-500'}`}>{c.col}</span>
                {c.req && <span className="text-red-500">*</span>}
                <span className="text-gray-400">— {c.note}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Certification — chosen before upload, and stays visible through preview */}
      {!imported && (
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-medium text-gray-700">Import into certification</label>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={certificationId}
              onChange={(e) => setCertificationId(e.target.value)}
            >
              {certifications.length === 0 && <option value="">Loading…</option>}
              {certifications.map(c => (
                <option key={c.id} value={c.id}>{c.fullName ? `${c.name} — ${c.fullName}` : c.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              These questions, and any new domains they create, belong to this certification.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload area */}
      {!preview && !imported && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragOver ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-700 mb-1">Drop your CSV file here</p>
          <p className="text-sm text-gray-500 mb-4">or click to browse</p>
          <label className="cursor-pointer inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <FileText className="h-4 w-4" />
            Choose CSV File
            <input type="file" accept=".csv" className="hidden" onChange={onFileChange} />
          </label>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Preview ({preview.total} rows)</h3>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          </div>

          <div className="flex gap-4 text-sm">
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

          {preview.errors.length > 0 && (
            <Card className="border-red-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-red-700 mb-3 text-sm">Rows with errors (will be skipped):</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {preview.errors.map((e) => (
                    <div key={e.row} className="text-xs text-red-600">
                      <span className="font-mono font-semibold">Row {e.row}:</span> {e.errors.join(' • ')}
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
                      {preview.valid.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 max-w-xs">
                            <p className="truncate">{row.question}</p>
                          </td>
                          <td className="px-3 py-2 font-semibold text-primary">{row.correct_answer.toUpperCase()}</td>
                          <td className="px-3 py-2 text-gray-500">{row.domain ?? '—'}</td>
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

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Publish immediately (unpublished questions never appear in exams or practice)
          </label>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button onClick={importQuestions} loading={importing} disabled={preview.valid.length === 0}>
              Import {preview.valid.length} Questions
            </Button>
          </div>
        </div>
      )}

      {imported && (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Import Complete!</h3>
          <p className="text-muted-foreground text-sm mb-4">Questions have been added to your question bank as drafts.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setImported(false)}>Import More</Button>
            <Button asChild><a href="/admin/questions">View Questions</a></Button>
          </div>
        </div>
      )}
    </div>
  )
}
