import type { ApiGame, EnrichedGame, Prediction, PredictionResult } from './types'

// Iran Daylight Time (IRDT) = UTC+4:30 (April–September)
// Iran Standard Time (IRST) = UTC+3:30 (October–March)
// WC 2026 runs June–July → always IRDT (UTC+4:30 = 270 minutes ahead of UTC)
const IRAN_SUMMER_OFFSET_MIN = 4 * 60 + 30 // 270 minutes

/**
 * Derive UTC from the persian_date field.
 * persian_date format: "YYYY/MM/DD HH:MM" in Tehran time (IRDT = UTC+4:30 in summer).
 * We ignore the Jalali calendar date and only use the time portion together with the
 * Gregorian date from local_date, then subtract the Tehran offset to get UTC.
 */
function parseUTCFromPersian(localDate: string, persianDate: string): Date | null {
  try {
    const persianTime = persianDate.split(' ')[1] // "HH:MM"
    if (!persianTime) return null
    const [ph, pm] = persianTime.split(':').map(Number)
    if (isNaN(ph) || isNaN(pm)) return null

    // Use the Gregorian date from local_date, time from persian_date
    const [datePart] = localDate.split(' ')
    const [m, d, y] = datePart.split('/').map(Number)

    // Persian time in minutes since midnight
    const tehranMinutes = ph * 60 + pm
    // Convert to UTC: subtract IRDT offset (270 min)
    let utcMinutes = tehranMinutes - IRAN_SUMMER_OFFSET_MIN
    let dayOffset = 0
    if (utcMinutes < 0) { utcMinutes += 24 * 60; dayOffset = -1 }
    if (utcMinutes >= 24 * 60) { utcMinutes -= 24 * 60; dayOffset = 1 }

    const utcH = Math.floor(utcMinutes / 60)
    const utcM = utcMinutes % 60

    // Apply day offset to the Gregorian date
    const base = new Date(Date.UTC(y, m - 1, d + dayOffset, utcH, utcM))
    return base
  } catch {
    return null
  }
}

export function parseMatchDate(localDate: string, persianDate?: string): Date | null {
  try {
    // If we have persian_date, use it to derive UTC (Tehran time - 4:30 = UTC)
    if (persianDate && persianDate !== 'null' && persianDate.includes(' ')) {
      const fromPersian = parseUTCFromPersian(localDate, persianDate)
      if (fromPersian) return fromPersian
    }
    // Fallback: treat local_date as UTC
    const [datePart, timePart] = localDate.split(' ')
    const [m, d, y] = datePart.split('/')
    const [h, min] = timePart.split(':')
    return new Date(Date.UTC(+y, +m - 1, +d, +h, +min))
  } catch {
    return null
  }
}

export function formatMatchDateTime(localDate: string, timezone?: string, persianDate?: string): string {
  const d = parseMatchDate(localDate, persianDate)
  if (!d) return localDate
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(timezone ? { timeZone: timezone } : {}),
  })
}

export function formatMatchDate(localDate: string, timezone?: string, persianDate?: string): string {
  const d = parseMatchDate(localDate, persianDate)
  if (!d) return localDate
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(timezone ? { timeZone: timezone } : {}),
  })
}

export function formatTime(localDate: string, timezone?: string, persianDate?: string): string {
  const d = parseMatchDate(localDate, persianDate)
  if (!d) return ''
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...(timezone ? { timeZone: timezone } : {}),
  })
}

export type MatchStatus = 'live' | 'finished' | 'scheduled'

export function getMatchStatus(game: ApiGame): MatchStatus {
  if (game.finished === 'TRUE') return 'finished'
  if (game.time_elapsed && game.time_elapsed !== 'notstarted') return 'live'
  return 'scheduled'
}

export function getStatusLabel(game: ApiGame, timezone?: string): string {
  const s = getMatchStatus(game)
  if (s === 'finished') return 'FT'
  if (s === 'live') return `${game.time_elapsed}'`
  return formatTime(game.local_date, timezone, game.persian_date)
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

// Group all games by date string (local date, first 10 chars: MM/DD/YYYY)
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

// Flag emoji from ISO 3166-1 alpha-2 country code
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
