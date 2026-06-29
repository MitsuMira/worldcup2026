import type { ApiGame, EnrichedGame, Prediction, PredictionResult, ApiStadium } from './types'

// city_en values from the API → IANA timezone for all WC 2026 venues.
// Multiple variants per city handle different API spellings.
const CITY_TIMEZONE: Record<string, string> = {
  // US Eastern (EDT = UTC-4 in summer)
  'East Rutherford': 'America/New_York',
  'New York/New Jersey (East Rutherford)': 'America/New_York',
  'New York': 'America/New_York',
  'Foxborough': 'America/New_York',
  'Boston': 'America/New_York',
  'Philadelphia': 'America/New_York',
  'Miami': 'America/New_York',
  'Miami Gardens': 'America/New_York',
  'Miami (Miami Gardens)': 'America/New_York',
  // US Central (CDT = UTC-5 in summer)
  'Arlington': 'America/Chicago',
  'Dallas': 'America/Chicago',
  'Dallas (Arlington)': 'America/Chicago',
  'Houston': 'America/Chicago',
  'Kansas City': 'America/Chicago',
  // US Mountain (MDT = UTC-6 in summer)
  'Denver': 'America/Denver',
  // US Pacific (PDT = UTC-7 in summer)
  'Santa Clara': 'America/Los_Angeles',
  'San Francisco': 'America/Los_Angeles',
  'San Francisco (Santa Clara)': 'America/Los_Angeles',
  'San Francisco Bay Area': 'America/Los_Angeles',
  'Inglewood': 'America/Los_Angeles',
  'Los Angeles': 'America/Los_Angeles',
  'Los Angeles (Inglewood)': 'America/Los_Angeles',
  'Pasadena': 'America/Los_Angeles',
  'Los Angeles (Pasadena)': 'America/Los_Angeles',
  'Seattle': 'America/Los_Angeles',
  // Canada
  'Toronto': 'America/Toronto',
  'Vancouver': 'America/Vancouver',
  // Mexico
  'Mexico City': 'America/Mexico_City',
  'Monterrey': 'America/Mexico_City',
  'Guadalajara': 'America/Mexico_City',
}

export function getVenueTimezone(game: { stadium?: ApiStadium | null }): string {
  const city = game.stadium?.city_en
  if (!city) return 'America/New_York'
  if (CITY_TIMEZONE[city]) return CITY_TIMEZONE[city]
  // ESPN appends US state to city_en (e.g. "Inglewood, California") — try bare city name
  const shortCity = city.split(',')[0].trim()
  return CITY_TIMEZONE[shortCity] ?? 'America/New_York'
}

/**
 * Convert a "MM/DD/YYYY HH:MM" venue-local time to UTC using the venue's
 * IANA timezone. Uses iterative Intl.DateTimeFormat to handle DST correctly.
 */
function parseLocalInTimezone(localDate: string, tz: string): Date | null {
  try {
    const [datePart, timePart] = localDate.split(' ')
    const [m, d, y] = datePart.split('/')
    const [h, min] = timePart.split(':')
    const targetH = +h, targetMin = +min

    let guess = new Date(Date.UTC(+y, +m - 1, +d, targetH, targetMin))

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: false,
    })

    for (let i = 0; i < 3; i++) {
      const parts = fmt.formatToParts(guess)
      const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
      const repH = get('hour') % 24
      const represented = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), repH, get('minute')))
      const target = new Date(Date.UTC(+y, +m - 1, +d, targetH, targetMin))
      const diffMs = target.getTime() - represented.getTime()
      if (diffMs === 0) break
      guess = new Date(guess.getTime() + diffMs)
    }

    return guess
  } catch {
    return null
  }
}

// Parse a match date string to UTC Date.
// Handles ISO 8601 UTC strings from ESPN (e.g. "2026-06-11T19:00:00Z")
// and legacy "MM/DD/YYYY HH:MM" venue-local strings from the old API.
export function parseMatchDate(localDate: string, venueTimezone?: string): Date | null {
  if (!localDate) return null
  try {
    // ISO 8601 (ESPN) — parse directly, no timezone conversion needed
    if (/^\d{4}-\d{2}-\d{2}T/.test(localDate)) {
      const d = new Date(localDate)
      return isNaN(d.getTime()) ? null : d
    }
    // Legacy "MM/DD/YYYY HH:MM" venue-local time
    if (venueTimezone && venueTimezone !== 'UTC') {
      return parseLocalInTimezone(localDate, venueTimezone)
    }
    const [datePart, timePart] = localDate.split(' ')
    const [m, d, y] = datePart.split('/')
    const [h, min] = timePart.split(':')
    return new Date(Date.UTC(+y, +m - 1, +d, +h, +min))
  } catch {
    return null
  }
}

export function formatMatchDateTime(localDate: string, displayTz?: string, venueTimezone?: string): string {
  const d = parseMatchDate(localDate, venueTimezone)
  if (!d) return localDate
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    ...(displayTz ? { timeZone: displayTz } : {}),
  })
}

export function formatMatchDate(localDate: string, displayTz?: string, venueTimezone?: string): string {
  const d = parseMatchDate(localDate, venueTimezone)
  if (!d) return localDate
  return d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(displayTz ? { timeZone: displayTz } : {}),
  })
}

export function formatTime(localDate: string, displayTz?: string, venueTimezone?: string): string {
  const d = parseMatchDate(localDate, venueTimezone)
  if (!d) return ''
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', hour12: false,
    ...(displayTz ? { timeZone: displayTz } : {}),
  })
}

export type MatchStatus = 'live' | 'finished' | 'scheduled'

export function getMatchStatus(game: ApiGame): MatchStatus {
  if (game.finished === 'TRUE') return 'finished'
  if (game.time_elapsed && game.time_elapsed !== 'notstarted') return 'live'
  return 'scheduled'
}

export function canPredict(game: ApiGame): boolean {
  const status = getMatchStatus(game)
  if (status === 'scheduled') return true
  if (status === 'live') {
    const elapsed = game.time_elapsed
    if (!elapsed || elapsed === 'HT' || elapsed === 'notstarted') return false
    const min = parseInt(elapsed)
    return !isNaN(min) && min <= 15
  }
  return false
}

export function minutesUntilLock(game: ApiGame): number | null {
  const status = getMatchStatus(game)
  if (status === 'finished') return null
  if (status === 'live') {
    const elapsed = game.time_elapsed
    if (!elapsed || elapsed === 'HT' || elapsed === 'notstarted') return null
    const min = parseInt(elapsed)
    if (isNaN(min) || min > 15) return null
    return 15 - min
  }
  if (status === 'scheduled') {
    const kickoff = parseMatchDate(game.local_date)
    if (!kickoff) return null
    const minsUntilKickoff = (kickoff.getTime() - Date.now()) / 60000
    if (minsUntilKickoff < 0) return null
    const total = Math.round(minsUntilKickoff + 15)
    return total <= 120 ? total : null
  }
  return null
}

export function formatLockCountdown(minutes: number): string {
  if (minutes <= 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function getStatusLabel(game: ApiGame, timezone?: string): string {
  const s = getMatchStatus(game)
  if (s === 'finished') return 'FT'
  if (s === 'live') return game.time_elapsed === 'PEN' ? 'PEN' : `${game.time_elapsed}'`
  return formatTime(game.local_date, timezone)
}

export function getStageLabel(game: ApiGame): string {
  const labels: Record<string, string> = {
    group: `Group ${game.group}`,
    r32: 'Round of 32',
    r16: 'Round of 16',
    qf: 'Quarter-final',
    sf: 'Semi-final',
    third: '3rd Place',
    final: 'Final',
  }
  return labels[game.type] ?? game.type.toUpperCase()
}

export function getScorers(raw: string): string[] {
  if (!raw || raw === 'null') return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export function getTeamName(game: EnrichedGame, side: 'home' | 'away'): string {
  if (side === 'home') {
    return game.homeTeam?.name_en ?? game.home_team_name_en ?? game.home_team_label ?? 'TBD'
  }
  return game.awayTeam?.name_en ?? game.away_team_name_en ?? game.away_team_label ?? 'TBD'
}

export function isKnockoutGame(game: ApiGame): boolean {
  return game.type !== 'group'
}

export function getKnockoutPredictionPoints(pred: Prediction, game: ApiGame): number {
  if (game.finished !== 'TRUE') return 0
  const ah = parseInt(game.home_score)
  const aa = parseInt(game.away_score)
  let pts = 0

  // 3 pts: exact regulation score and game ended in regulation
  if (pred.homeScore === ah && pred.awayScore === aa && game.decidedBy === 'regulation') pts += 3
  // 1 pt: correct ET winner
  if (game.decidedBy === 'et' || game.decidedBy === 'penalties') {
    if (pred.etHomeScore !== undefined && pred.etAwayScore !== undefined) {
      const etH = pred.etHomeScore, etA = pred.etAwayScore
      const actualH = ah, actualA = aa
      const predWinner = etH > etA ? 'home' : etH < etA ? 'away' : 'draw'
      const actualWinner = actualH > actualA ? 'home' : actualH < actualA ? 'away' : 'draw'
      if (predWinner === actualWinner && actualWinner !== 'draw') pts += 1
    }
  }
  // 1 pt: correct penalty score
  if (game.decidedBy === 'penalties' && pred.penHomeScore !== undefined && pred.penAwayScore !== undefined) {
    if (game.pen_home_score && game.pen_away_score) {
      if (pred.penHomeScore === parseInt(game.pen_home_score) && pred.penAwayScore === parseInt(game.pen_away_score)) pts += 1
    }
  }
  return pts
}

export function getPredictionResult(
  pred: Prediction,
  game: ApiGame,
): PredictionResult {
  if (game.finished !== 'TRUE') return 'pending'
  const ah = parseInt(game.home_score)
  const aa = parseInt(game.away_score)
  if (pred.homeScore === ah && pred.awayScore === aa) return 'correct'
  const predWinner = pred.homeScore > pred.awayScore ? 'home' : pred.homeScore < pred.awayScore ? 'away' : 'draw'
  const actualWinner = ah > aa ? 'home' : ah < aa ? 'away' : 'draw'
  if (predWinner === actualWinner) return 'correct-winner'
  return 'wrong'
}

export function groupGamesByDate(games: EnrichedGame[], timezone?: string): Map<string, EnrichedGame[]> {
  const map = new Map<string, EnrichedGame[]>()
  for (const g of games) {
    const d = parseMatchDate(g.local_date)
    // Use 'sv-SE' locale which always returns YYYY-MM-DD — correct for lexicographic sort
    const dateKey = d
      ? d.toLocaleDateString('sv-SE', timezone ? { timeZone: timezone } : undefined)
      : 'Unknown'
    const list = map.get(dateKey) ?? []
    list.push(g)
    map.set(dateKey, list)
  }
  return map
}

function toFlagEmoji(countryCode: string): string {
  return [...countryCode.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

const FIFA_TO_ISO: Record<string, string> = {
  ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BOL: 'BO', BRA: 'BR',
  CAN: 'CA', CHI: 'CL', CHN: 'CN', COL: 'CO', CRC: 'CR', CRO: 'HR',
  CZE: 'CZ', DEN: 'DK', ECU: 'EC', EGY: 'EG', ENG: 'GB', ESP: 'ES',
  FRA: 'FR', GER: 'DE', GHA: 'GH', GRE: 'GR', HUN: 'HU', IND: 'IN',
  IRN: 'IR', ITA: 'IT', JAM: 'JM', JPN: 'JP', JOR: 'JO', KOR: 'KR',
  MAR: 'MA', MEX: 'MX', NED: 'NL', NGA: 'NG', NOR: 'NO', NZL: 'NZ',
  PAR: 'PY', PER: 'PE', POL: 'PL', POR: 'PT', QAT: 'QA', RSA: 'ZA',
  RUS: 'RU', SAU: 'SA', SCO: 'GB-SCT', SEN: 'SN', SRB: 'RS',
  SUI: 'CH', SWE: 'SE', TUN: 'TN', TUR: 'TR', URU: 'UY',
  USA: 'US', UZB: 'UZ', VEN: 'VE', WAL: 'GB-WLS', CMR: 'CM', CIV: 'CI',
  ALG: 'DZ', HON: 'HN', PAN: 'PA', SVN: 'SI', ISL: 'IS',
}

export function getFlagEmoji(fifaCode: string): string {
  const iso = FIFA_TO_ISO[fifaCode?.toUpperCase()]
  if (!iso || iso.includes('-')) return '🏴'
  return toFlagEmoji(iso)
}

/**
 * Returns true if the team at `idx` can still mathematically reach `targetPos` (0-based).
 * Uses simple pts projection: remaining games × 3 pts each.
 */
export function canReachPosition(group: import('./types').EnrichedGroup, idx: number, targetPos: number): boolean {
  if (idx <= targetPos) return true // already at or above target
  const standings = group.standings
  if (!standings || standings.length < 4) return true
  const team = standings[idx]
  const target = standings[targetPos]
  if (!team || !target) return true
  const remaining = 3 - (team.played ?? 0)
  const maxPossible = Number(team.pts ?? 0) + remaining * 3
  return maxPossible >= Number(target.pts ?? 0)
}
