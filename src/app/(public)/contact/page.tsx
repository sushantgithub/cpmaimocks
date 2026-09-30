import type { Metadata } from 'next'
import { ContactForm } from '@/components/public/contact-form'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Questions about CertMocks or the PMI CPMAI certification? Get in touch and we typically respond within 24 hours.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return <ContactForm />
}
