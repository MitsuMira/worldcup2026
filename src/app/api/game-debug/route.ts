import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Exposes raw ESPN response shape — use /api/game-debug to diagnose group/round parsing
export async function GET() {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=202606',
      { cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } },
    )
    if (!res.ok) return NextResponse.json({ error: `ESPN ${res.status}` }, { status: res.status })
    const data = await res.json()
    const events: unknown[] = data?.events ?? []
    const first = events[0] as Record<string, unknown> | undefined
    const comp = (first?.competitions as unknown[])?.[0] as Record<string, unknown> | undefined

    // Also probe the standings endpoint
    const sRes = await fetch(
      'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings',
      { cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } },
    )
    const standingsRaw = sRes.ok ? await sRes.json() : { error: `ESPN standings ${sRes.status}` }

    return NextResponse.json({
      scoreboard: {
        total_events: events.length,
        first_event_keys: first ? Object.keys(first) : [],
        first_comp_keys: comp ? Object.keys(comp) : [],
        sample: {
          id: first?.id,
          name: first?.name,
          date: first?.date,
          status: (first?.status as Record<string, unknown>)?.type,
          comp_type: comp?.type,
          comp_notes: comp?.notes,
          comp_groups: comp?.groups,
          comp_season: comp?.season,
          comp_situation: comp?.situation,
        },
        // Show first 3 events' group/notes fields
        group_samples: events.slice(0, 3).map((e) => {
          const ev = e as Record<string, unknown>
          const c = (ev.competitions as unknown[])?.[0] as Record<string, unknown> | undefined
          return { name: ev.name, notes: c?.notes, groups: c?.groups, type: c?.type }
        }),
      },
      standings_raw: standingsRaw,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
