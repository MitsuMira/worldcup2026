import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const res = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
    { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' },
  )
  if (!res.ok) return NextResponse.json({ error: `ESPN ${res.status}` }, { status: res.status })
  const data = await res.json()

  // Return a slim version: only the fields relevant for round detection
  const events = (data.events ?? []).map((e: Record<string, unknown>) => {
    const comp = (e.competitions as Record<string, unknown>[])?.[0] ?? {}
    return {
      id: e.id,
      name: e.name,
      notes: comp.notes,
      groups: comp.groups,
      type: comp.type,
      teams: (comp.competitors as Record<string, unknown>[])?.map(
        (c: Record<string, unknown>) => (c.team as Record<string, unknown>)?.displayName
      ),
    }
  })

  return NextResponse.json({ events })
}
