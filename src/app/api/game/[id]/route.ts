import { NextResponse } from 'next/server'
import { fetchEnrichedGames } from '@/lib/espnClient'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    // Fetch all enriched games and find the one by id
    const games = await fetchEnrichedGames()
    const game = games.find((g) => g.id === id)
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    return NextResponse.json({ game })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch game'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
