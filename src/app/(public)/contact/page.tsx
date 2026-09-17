'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Mail } from 'lucide-react'
import type { Metadata } from 'next'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // In production: send to your email via API
    await new Promise((r) => setTimeout(r, 1000))
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl">
      <div className="text-center mb-8">
        <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold">Contact Us</h1>
        <p className="text-muted-foreground mt-2">We typically respond within 24 hours.</p>
      </div>

      {sent ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold">Message Sent!</h2>
            <p className="text-muted-foreground mt-2">We&apos;ll get back to you soon.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="mt-1" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required className="mt-1" /></div>
              <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} required className="mt-1" /></div>
              <div>
                <Label>Message</Label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({...form, message: e.target.value})}
                  required
                  rows={5}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>
              <Button type="submit" className="w-full" loading={loading}>Send Message</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
