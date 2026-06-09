import { NextResponse } from 'next/server'
import { fetchAllTeams } from '@/lib/espnClient'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const teams = await fetchAllTeams()
    return NextResponse.json({ teams })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch teams'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
