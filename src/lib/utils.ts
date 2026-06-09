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
  return (city && CITY_TIMEZONE[city]) ?? 'America/New_York'
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

// Parse "MM/DD/YYYY HH:MM" venue local time to UTC.
// venueTimezone should be an IANA string from getVenueTimezone().
export function parseMatchDate(localDate: string, venueTimezone?: string): Date | null {
  try {
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
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    ...(displayTz ? { timeZone: displayTz } : {}),
  })
}

export function formatMatchDate(localDate: string, displayTz?: string, venueTimezone?: string): string {
  const d = parseMatchDate(localDate, venueTimezone)
  if (!d) return localDate
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(displayTz ? { timeZone: displayTz } : {}),
  })
}

export function formatTime(localDate: string, displayTz?: string, venueTimezone?: string): string {
  const d = parseMatchDate(localDate, venueTimezone)
  if (!d) return ''
  return d.toLocaleTimeString('en-US', {
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

export function getStatusLabel(game: ApiGame & { stadium?: ApiStadium | null }, timezone?: string): string {
  const s = getMatchStatus(game)
  if (s === 'finished') return 'FT'
  if (s === 'live') return `${game.time_elapsed}'`
  return formatTime(game.local_date, timezone, getVenueTimezone(game))
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

export function groupGamesByDate(games: EnrichedGame[]): Map<string, EnrichedGame[]> {
  const map = new Map<string, EnrichedGame[]>()
  for (const g of games) {
    const date = g.local_date?.split(' ')[0] ?? 'Unknown'
    const list = map.get(date) ?? []
    list.push(g)
    map.set(date, list)
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
