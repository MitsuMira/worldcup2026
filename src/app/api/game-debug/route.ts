import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }

  // ── Scoreboard ──────────────────────────────────────────────────────────
  const sbRes = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=202606',
    { cache: 'no-store', headers },
  )
  if (!sbRes.ok) return NextResponse.json({ error: `ESPN scoreboard ${sbRes.status}` }, { status: sbRes.status })
  const sbData = await sbRes.json() as Record<string, unknown>
  const events = (sbData.events ?? []) as Array<Record<string, unknown>>

  const groupSamples = events.slice(0, 5).map((ev) => {
    const c = (ev.competitions as Array<Record<string, unknown>> | undefined)?.[0]
    return {
      id: ev.id, name: ev.name, date: ev.date,
      comp_keys: c ? Object.keys(c) : [],
      notes: c?.notes,
      groups: c?.groups,
      type: c?.type,
      season: c?.season,
      headlines: c?.headlines,
    }
  })

  // ── Standings (two URL variants) ─────────────────────────────────────────
  const [s1Res, s2Res] = await Promise.all([
    fetch('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings', { cache: 'no-store', headers }),
    fetch('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026', { cache: 'no-store', headers }),
  ])

  const parseStandingsGroups = (d: Record<string, unknown>) => {
    let grps: Array<Record<string, unknown>> = []
    const s = d.standings
    if (Array.isArray(s)) grps = s as Array<Record<string, unknown>>
    else if (s && typeof s === 'object' && Array.isArray((s as Record<string, unknown>).groups))
      grps = (s as Record<string, unknown[]>).groups as Array<Record<string, unknown>>
    else if (Array.isArray(d.groups)) grps = d.groups as Array<Record<string, unknown>>
    return grps.slice(0, 3).map(g => ({
      name: g.name, abbr: g.abbreviation, short: g.shortName,
      keys: Object.keys(g),
      entries_count: ((g.entries as unknown[] | undefined) ?? []).length,
      first_entry: ((g.entries as Array<Record<string, unknown>> | undefined) ?? [])[0],
    }))
  }

  const s1Data = s1Res.ok ? parseStandingsGroups(await s1Res.json() as Record<string, unknown>) : { error: s1Res.status }
  const s2Data = s2Res.ok ? parseStandingsGroups(await s2Res.json() as Record<string, unknown>) : { error: s2Res.status }

  // ── Teams endpoint ───────────────────────────────────────────────────────
  const teamsRes = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams',
    { cache: 'no-store', headers },
  )
  let teamSample: unknown = { error: teamsRes.status }
  if (teamsRes.ok) {
    const td = await teamsRes.json() as { sports?: Array<{ leagues?: Array<{ teams?: Array<{ team: Record<string, unknown> }> }> }> }
    const tlist = td.sports?.[0]?.leagues?.[0]?.teams ?? []
    teamSample = tlist.slice(0, 5).map(t => ({
      id: t.team.id, abbr: t.team.abbreviation, name: t.team.displayName,
      standingSummary: t.team.standingSummary, keys: Object.keys(t.team),
    }))
  }

  return NextResponse.json({
    scoreboard_event_count: events.length,
    group_samples: groupSamples,
    standings_base: s1Data,
    standings_2026: s2Data,
    teams_sample: teamSample,
  })
}
