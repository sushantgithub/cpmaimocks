'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BlogEditor } from '@/components/admin/blog-editor'
import { toast } from '@/hooks/use-toast'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleSave(data: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to create post')
      toast({ title: 'Blog post created', variant: 'success' })
      router.push('/admin/blog')
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Blog Post</h1>
      <BlogEditor onSave={handleSave} saving={saving} />
    </div>
  )
}
