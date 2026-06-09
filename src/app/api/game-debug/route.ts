import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }
  const base = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world'

  // Probe the standings for Group A (group id=1)
  const standingsRes = await fetch(
    `${base}/seasons/2026/types/1/groups/1/standings`,
    { cache: 'no-store', headers },
  )
  const standingsData = standingsRes.ok ? await standingsRes.json() : { error: standingsRes.status }

  // Also probe a potential /teams endpoint for group 1
  const teamsEpRes = await fetch(
    `${base}/seasons/2026/types/1/groups/1/teams?limit=10`,
    { cache: 'no-store', headers },
  )
  const teamsEpData = teamsEpRes.ok ? await teamsEpRes.json() : { error: teamsEpRes.status }

  // If standings has entries, follow the first team $ref
  const entries = (standingsData as { entries?: Array<Record<string, unknown>> })?.entries ?? []
  let firstTeamData: unknown = null
  const firstTeamRef = (entries[0]?.team as { $ref?: string } | undefined)?.$ref
  if (firstTeamRef) {
    const tr = await fetch(firstTeamRef, { cache: 'no-store', headers })
    firstTeamData = tr.ok ? await tr.json() : { error: tr.status }
  }

  return NextResponse.json({
    standings_status: standingsRes.status,
    standings_keys: standingsData && typeof standingsData === 'object' ? Object.keys(standingsData) : [],
    standings_entries_count: entries.length,
    standings_first_entry: entries[0],
    standings_first_team_ref: firstTeamRef,
    standings_first_team_data: firstTeamData,
    teams_endpoint_status: teamsEpRes.status,
    teams_endpoint_data: teamsEpData,
  })
}
