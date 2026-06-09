import { NextResponse } from 'next/server'
import { fetchEnrichedGroups } from '@/lib/espnClient'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const groups = await fetchEnrichedGroups()
    return NextResponse.json({ groups })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch groups'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
