import { NextResponse } from 'next/server'
import { acquireToken } from '@/lib/apiClient'

export const dynamic = 'force-dynamic'

// Returns the raw first game object with ALL fields from the API (for debugging time fields)
export async function GET() {
  const base = process.env.WORLDCUP_API_BASE_URL ?? 'https://worldcup26.ir'
  try {
    const token = await acquireToken()
    const res = await fetch(`${base}/get/games`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ error: `API ${res.status}` }, { status: res.status })
    const data = await res.json()
    const games: unknown[] = data?.games ?? []
    const first = games[0] ?? null
    return NextResponse.json({
      total_games: games.length,
      first_game_all_fields: first,
      first_game_keys: first ? Object.keys(first as object) : [],
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
