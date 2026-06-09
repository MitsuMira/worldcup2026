import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }
  const base = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world'

  // ── Core API: types/1 groups (group stage) ────────────────────────────────
  const gListRes = await fetch(`${base}/seasons/2026/types/1/groups?limit=20`, { cache: 'no-store', headers })
  const gListData = gListRes.ok ? await gListRes.json() : { error: gListRes.status }

  // Fetch first two group details to see structure
  const groupRefs = ((gListData as { items?: Array<{ $ref: string }> })?.items ?? []).slice(0, 2)
  const groupDetails = await Promise.all(
    groupRefs.map(({ $ref }) => fetch($ref, { cache: 'no-store', headers }).then(r => r.ok ? r.json() : { error: r.status }))
  )

  // If first group has a teams.$ref, probe it
  let teamsListSample: unknown = null
  const firstGroupTeamsRef = (groupDetails[0] as Record<string, unknown>)?.teams
  if (firstGroupTeamsRef && typeof firstGroupTeamsRef === 'object' && '$ref' in firstGroupTeamsRef) {
    const tRes = await fetch((firstGroupTeamsRef as { $ref: string }).$ref, { cache: 'no-store', headers })
    if (tRes.ok) {
      const tData = await tRes.json() as { items?: Array<{ $ref: string }> }
      // Fetch first team
      const firstTeamRef = tData.items?.[0]?.$ref
      const firstTeamData = firstTeamRef
        ? await fetch(firstTeamRef, { cache: 'no-store', headers }).then(r => r.ok ? r.json() : null)
        : null
      teamsListSample = { items_count: tData.items?.length, first_item_ref: firstTeamRef, first_team_data: firstTeamData }
    }
  }

  // ── Scoreboard: event season field ────────────────────────────────────────
  const sbRes = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=202606',
    { cache: 'no-store', headers },
  )
  const sbData = sbRes.ok ? await sbRes.json() as Record<string, unknown> : {}
  const events = (sbData.events ?? []) as Array<Record<string, unknown>>
  const firstEvent = events[0]

  return NextResponse.json({
    type1_groups_count: (gListData as { count?: number }).count,
    type1_groups_list: gListData,
    group_details_sample: groupDetails,
    teams_list_sample: teamsListSample,
    scoreboard_first_event_season: firstEvent?.season,
    scoreboard_first_event_name: firstEvent?.name,
    scoreboard_total: events.length,
  })
}
