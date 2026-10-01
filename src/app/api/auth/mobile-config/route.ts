import { NextResponse } from 'next/server'
import { stagingGoogleOAuthAllowed } from '@/lib/environment-safety'

export const dynamic = 'force-dynamic'

export async function GET() {
  const clientId =
    stagingGoogleOAuthAllowed() && process.env.GOOGLE_CLIENT_ID
      ? process.env.GOOGLE_CLIENT_ID
      : null

  return NextResponse.json({
    googleEnabled: Boolean(clientId),
    googleClientId: clientId,
  })
}
