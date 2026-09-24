'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BlogEditor } from '@/components/admin/blog-editor'
import { toast } from '@/hooks/use-toast'

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const [post, setPost] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/blog/${params.id}`)
      .then((r) => r.json())
      .then(setPost)
      .catch(() => toast({ title: 'Failed to load post', variant: 'destructive' }))
  }, [params.id])

  async function handleSave(data: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/blog/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update post')
      toast({ title: 'Blog post updated', variant: 'success' })
      router.push('/admin/blog')
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!post) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Blog Post</h1>
      <BlogEditor initialData={post} onSave={handleSave} saving={saving} />
    </div>
  )
}
