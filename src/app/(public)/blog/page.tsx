import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import { CalendarDays } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog — CertMocks',
  description:
    'CPMAI exam tips, study guides, domain breakdowns, and preparation strategies for the PMI Certified Professional in AI and Machine Learning certification.',
  alternates: { canonical: '/blog' },
}

export const revalidate = 3600

export default async function BlogListPage() {
  let posts: {
    slug: string
    title: string
    excerpt: string | null
    publishedAt: Date | null
    tags: string[]
    coverImage: string | null
  }[] = []

  try {
    posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        tags: true,
        coverImage: true,
      },
    })
  } catch {
    // Database unavailable at build time — render empty list
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">CertMocks Blog</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          CPMAI study guides, exam tips, and preparation strategies to help you pass.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Blog posts coming soon. Follow us for CPMAI exam tips and study guides.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <Card className="transition-shadow group-hover:shadow-md">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {post.publishedAt && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {post.publishedAt.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {post.tags.length > 0 && (
                      <div className="flex gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
