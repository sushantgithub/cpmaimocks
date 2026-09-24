/**
 * Reusable JSON-LD structured data components for SEO.
 *
 * Each component renders a <script type="application/ld+json"> tag.
 * Google uses these to power rich results (FAQ dropdowns, course cards, etc.).
 */

interface JsonLdProps {
  data: Record<string, unknown>
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/** WebSite schema — enables sitelinks search box in Google */
export function WebSiteJsonLd({ url }: { url: string }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'CertMocks',
        url,
        description:
          'Independent exam preparation platform for PMI CPMAI certification with mock exams, practice questions, and performance analytics.',
      }}
    />
  )
}

/** FAQPage schema — enables expandable FAQ snippets in search results */
export function FAQPageJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[]
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }}
    />
  )
}

/** Course schema — shows course info in search results */
export function CourseJsonLd({
  url,
  providerName,
  courseName,
  description,
}: {
  url: string
  providerName: string
  courseName: string
  description: string
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: courseName,
        description,
        provider: {
          '@type': 'Organization',
          name: providerName,
          sameAs: url,
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT40H',
        },
      }}
    />
  )
}

/** Product + Offer schema for pricing pages */
export function ProductJsonLd({
  name,
  description,
  url,
  offers,
}: {
  name: string
  description: string
  url: string
  offers: { price: number; currency: string; name: string }[]
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        description,
        url,
        offers: offers.map((o) => ({
          '@type': 'Offer',
          name: o.name,
          price: o.price,
          priceCurrency: o.currency,
          availability: 'https://schema.org/InStock',
          url,
        })),
      }}
    />
  )
}
