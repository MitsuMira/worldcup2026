import { NextResponse } from 'next/server'
import { fetchEnrichedGames } from '@/lib/espnClient'

export const revalidate = 15

export async function GET() {
  try {
    const games = await fetchEnrichedGames()
    return NextResponse.json({ games })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch games'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
