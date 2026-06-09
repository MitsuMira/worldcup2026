import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }
  const base = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world'

  // Probe standings for Group A — check both items and entries
  const standingsRes = await fetch(
    `${base}/seasons/2026/types/1/groups/1/standings`,
    { cache: 'no-store', headers },
  )
  const standingsData = standingsRes.ok ? await standingsRes.json() as Record<string, unknown> : {}

  // Also try the group 1 competitors endpoint which might exist
  const compRes = await fetch(
    `${base}/seasons/2026/types/1/groups/1/competitors?limit=10`,
    { cache: 'no-store', headers },
  )
  const compData = compRes.ok ? await compRes.json() : { error: compRes.status }

  // Try fetching an individual standings item if items exist
  const items = (standingsData.items as Array<{ $ref?: string }> | undefined) ?? []
  let firstItemData: unknown = null
  if (items[0]?.$ref) {
    const ir = await fetch(items[0].$ref, { cache: 'no-store', headers })
    firstItemData = ir.ok ? await ir.json() : { error: ir.status }
  }

  // Try fetching the group 1 detail with an expanded param
  const grpRes = await fetch(
    `${base}/seasons/2026/types/1/groups/1?enable=competitors`,
    { cache: 'no-store', headers },
  )
  const grpData = grpRes.ok ? await grpRes.json() : { error: grpRes.status }

  return NextResponse.json({
    standings_full: standingsData,
    standings_items_count: items.length,
    standings_first_item_ref: items[0]?.$ref,
    standings_first_item_data: firstItemData,
    competitors_endpoint_status: compRes.status,
    competitors_endpoint_data: compData,
    group1_with_expand: grpData,
  })
}
