import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
      <header className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-primary">
          <BookOpen className="h-5 w-5" />
          <span>CPMAI Prep</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>
      <footer className="p-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CPMAI Prep — Independent exam preparation platform. Not affiliated with PMI.
      </footer>
    </div>
  )
}
