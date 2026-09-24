import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export function PublicFooter() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-primary mb-3">
              <BookOpen className="h-5 w-5" />
              <span>CertMocks</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Independent exam preparation platform for project management and agile certification candidates.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Not affiliated with or endorsed by PMI.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/exams" className="hover:text-foreground">Mock Exams</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
              <li><Link href="/faq" className="hover:text-foreground">FAQ</Link></li>
              <li><Link href="/about" className="hover:text-foreground">About</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/register" className="hover:text-foreground">Sign Up</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Sign In</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
              <li><Link href="/subscription" className="hover:text-foreground">Subscription</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/legal/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link href="/legal/refund" className="hover:text-foreground">Refund Policy</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} CertMocks. All rights reserved.</p>
          <p className="mt-1">PMI, PMP and CPMAI are registered marks of the Project Management Institute, Inc.</p>
        </div>
      </div>
    </footer>
  )
}
