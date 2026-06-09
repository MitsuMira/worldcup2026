import { type NextRequest, NextResponse } from 'next/server'
import { acquireToken } from '@/lib/apiClient'

export const dynamic = 'force-dynamic'

// One-time helper: visit /api/token?secret=YOUR_TOKEN_SECRET to retrieve the JWT.
// Set TOKEN_SECRET in Vercel env vars. Remove it (or this route) once you've
// copied WORLDCUP_API_TOKEN.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const expected = process.env.TOKEN_SECRET

  if (!expected) {
    return NextResponse.json({ error: 'TOKEN_SECRET env var not set' }, { status: 403 })
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const token = await acquireToken()
    return NextResponse.json({ token })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to acquire token' },
      { status: 500 },
    )
  }
}
