import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }
  const base = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world'

  // ── Core API: groups list ─────────────────────────────────────────────────
  const gListRes = await fetch(`${base}/seasons/2026/types/2/groups?limit=20`, { cache: 'no-store', headers })
  const gListData = gListRes.ok ? await gListRes.json() : { error: gListRes.status }

  // If we got group refs, fetch the first group's detail
  let firstGroupDetail: unknown = null
  const firstRef = (gListData as { items?: Array<{ $ref: string }> })?.items?.[0]?.$ref
  if (firstRef) {
    const fgRes = await fetch(firstRef, { cache: 'no-store', headers })
    firstGroupDetail = fgRes.ok ? await fgRes.json() : { error: fgRes.status }
  }

  // ── Core API: season types ────────────────────────────────────────────────
  const typesRes = await fetch(`${base}/seasons/2026/types`, { cache: 'no-store', headers })
  const typesData = typesRes.ok ? await typesRes.json() : { error: typesRes.status }

  // ── Scoreboard: first event full structure ────────────────────────────────
  const sbRes = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=202606',
    { cache: 'no-store', headers },
  )
  const sbData = sbRes.ok ? await sbRes.json() as Record<string, unknown> : {}
  const events = (sbData.events ?? []) as Array<Record<string, unknown>>
  const firstEvent = events[0]
  const firstComp = (firstEvent?.competitions as Array<Record<string, unknown>> | undefined)?.[0]

  return NextResponse.json({
    core_groups_list: gListData,
    core_first_group_detail: firstGroupDetail,
    core_season_types: typesData,
    scoreboard_first_event_keys: firstEvent ? Object.keys(firstEvent) : [],
    scoreboard_first_comp_keys: firstComp ? Object.keys(firstComp) : [],
    scoreboard_first_comp_status: firstComp?.status,
    scoreboard_first_comp_format: firstComp?.format,
    scoreboard_first_comp_notes: firstComp?.notes,
    scoreboard_total: events.length,
  })
}
