import type { ApiGame, EnrichedGame, Prediction, PredictionResult, ApiStadium } from './types'

// Convert Jalali (Persian) month+day to a UTC midnight Date for WC 2026.
// The tournament runs entirely in Jalali months 3 (Khordad) and 4 (Tir) of year 1405:
//   Khordad 1  = May 22, 2026  → Khordad D = new Date(UTC(2026, 4, 21+D))
//   Tir 1      = June 22, 2026 → Tir D     = new Date(UTC(2026, 5, 21+D))
function jalaliToGregorianUTC(month: number, day: number): Date | null {
  if (month === 3) return new Date(Date.UTC(2026, 4, 21 + day))
  if (month === 4) return new Date(Date.UTC(2026, 5, 21 + day))
  return null
}

// Parse a "MM/DD/YYYY HH:MM" persian_date (Jalali date, Tehran IRDT = UTC+4:30)
// and return the equivalent UTC Date.
function parseFromPersianDate(persianDate: string): Date | null {
  try {
    const [datePart, timePart] = persianDate.split(' ')
    const [jMonth, jDay] = datePart.split('/').map(Number)
    const [ph, pm] = timePart.split(':').map(Number)

    // IRDT → UTC: subtract 4h30m
    let utcMins = pm - 30
    let utcHours = ph - 4
    if (utcMins < 0) { utcMins += 60; utcHours -= 1 }

    // If time went negative, UTC is the previous calendar day (from Tehran's perspective)
    let dayOffset = 0
    if (utcHours < 0) { utcHours += 24; dayOffset = -1 }

    const base = jalaliToGregorianUTC(jMonth, jDay)
    if (!base) return null
    base.setUTCDate(base.getUTCDate() + dayOffset)

    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), utcHours, utcMins))
  } catch {
    return null
  }
}

// Kept for callers that still import it — no longer affects time parsing
export function getVenueTimezone(_game: { stadium?: ApiStadium | null }): string {
  return 'UTC'
}

// Parse a match date to UTC. Uses persian_date (Tehran IRDT) when available
// because it is a reliable fixed-offset timestamp; falls back to treating
// local_date as UTC.
export function parseMatchDate(localDate: string, persianDate?: string): Date | null {
  try {
    if (persianDate) {
      const d = parseFromPersianDate(persianDate)
      if (d) return d
    }
    const [datePart, timePart] = localDate.split(' ')
    const [m, d, y] = datePart.split('/')
    const [h, min] = timePart.split(':')
    return new Date(Date.UTC(+y, +m - 1, +d, +h, +min))
  } catch {
    return null
  }
}

export function formatMatchDateTime(localDate: string, displayTz?: string, persianDate?: string): string {
  const d = parseMatchDate(localDate, persianDate)
  if (!d) return localDate
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...(displayTz ? { timeZone: displayTz } : {}),
  })
}

export function formatMatchDate(localDate: string, displayTz?: string, persianDate?: string): string {
  const d = parseMatchDate(localDate, persianDate)
  if (!d) return localDate
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(displayTz ? { timeZone: displayTz } : {}),
  })
}

export function formatTime(localDate: string, displayTz?: string, persianDate?: string): string {
  const d = parseMatchDate(localDate, persianDate)
  if (!d) return ''
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
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
