import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Tag, ArrowRight } from 'lucide-react'

/**
 * Plans used to be editable here as well as under Admin > Plans, and the two
 * editors had drifted: this one could not set a plan's certification, and its
 * currency control was never saved by the API. One editor now owns plans.
 */
export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Platform configuration.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Tag className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Subscription plans</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pricing, currency, duration, free trials, features and which certification
                each plan covers are all managed in one place.
              </p>
              <Link
                href="/admin/plans"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Go to Plans <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-gray-400">
        Nothing else is configurable here yet.
      </p>
    </div>
  )
}
