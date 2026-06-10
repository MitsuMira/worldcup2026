import { NextResponse } from 'next/server'
import { fetchEnrichedGames } from '@/lib/espnClient'
import { BRACKET_POSITIONS } from '@/lib/bracketStructure'
import { getVenueTimezone } from '@/lib/utils'
import { parseMatchDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const games = await fetchEnrichedGames()
  const knockout = games.filter((g) => g.type !== 'group')

  const rows = knockout.map((g) => {
    const rawCity = g.stadium?.city_en ?? ''
    const shortCity = rawCity.split(',')[0].trim()
    const tz = getVenueTimezone(g)
    const d = parseMatchDate(g.local_date)
    const dateStr = d ? d.toLocaleDateString('sv-SE', { timeZone: tz }) : '?'
    const exactKey = `${dateStr}_${rawCity}`
    const shortKey = `${dateStr}_${shortCity}`
    const bpos = BRACKET_POSITIONS.get(exactKey) ?? BRACKET_POSITIONS.get(shortKey)
    return {
      type: g.type,
      id: g.id,
      date_utc: g.local_date,
      venue_date_local: dateStr,
      timezone_used: tz,
      city_en_raw: rawCity,
      city_en_short: shortCity,
      exact_key: exactKey,
      key_matched: !!bpos,
      bracket_pos: bpos ?? null,
      home: g.home_team_name_en,
      away: g.away_team_name_en,
    }
  })

  // Sort by date then type
  rows.sort((a, b) => a.date_utc.localeCompare(b.date_utc))

  return NextResponse.json({
    total: rows.length,
    unmatched: rows.filter((r) => !r.key_matched).map((r) => r.exact_key),
    games: rows,
  })
}
