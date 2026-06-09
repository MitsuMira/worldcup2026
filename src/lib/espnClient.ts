import 'server-only'
import type { EnrichedGame, EnrichedGroup, ApiTeam, ApiStadium } from './types'

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

// ── Minimal ESPN raw types ──────────────────────────────────────────────────

interface EspnTeam {
  id: string
  abbreviation: string
  displayName: string
  shortDisplayName?: string
  logo?: string
}

interface EspnCompetitor {
  id: string
  homeAway: 'home' | 'away'
  team: EspnTeam
  score?: string
  winner?: boolean
}

interface EspnStatusType {
  name: string   // STATUS_SCHEDULED | STATUS_IN_PROGRESS | STATUS_HALFTIME | STATUS_FULL_TIME | STATUS_FINAL
  state: 'pre' | 'in' | 'post'
  completed: boolean
}

interface EspnStatus {
  clock?: number       // elapsed seconds in current period
  displayClock?: string
  period?: number      // 1 = first half, 2 = second half
  type: EspnStatusType
}

interface EspnDetail {
  type?: { id: string; text: string }
  clock?: { value: number; displayValue: string }
  team?: { id: string }
  athletesInvolved?: Array<{ id: string; displayName: string }>
}

interface EspnVenue {
  id?: string
  fullName?: string
  address?: { city?: string; country?: string }
}

interface EspnCompetition {
  competitors: EspnCompetitor[]
  status: EspnStatus
  details?: EspnDetail[]
  notes?: Array<{ type?: string; headline?: string }>
  groups?: { name?: string; shortName?: string; abbreviation?: string }
  venue?: EspnVenue
}

interface EspnEvent {
  id: string
  date: string  // ISO 8601 UTC e.g. "2026-06-11T19:00:00Z"
  name: string
  competitions: EspnCompetition[]
  status: EspnStatus
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseRound(comp: EspnCompetition): { type: string; group: string } {
  // 1. competition.groups object (e.g. { name: "Group A", shortName: "A" })
  const groupObj = comp.groups
  if (groupObj) {
    const src = [groupObj.name, groupObj.shortName, groupObj.abbreviation].filter(Boolean).join(' ')
    const gm = src.match(/\b([A-L])\b/i) ?? src.match(/Group\s+([A-L])/i)
    if (gm) return { type: 'group', group: gm[1].toUpperCase() }
  }

  // 2. competition.notes[].headline (e.g. "Group A" or "FIFA World Cup 2026 - Group A")
  for (const note of comp.notes ?? []) {
    const h = note.headline ?? ''
    const nm = h.match(/Group\s+([A-L])\b/i)
    if (nm) return { type: 'group', group: nm[1].toUpperCase() }
    const kh = h.toLowerCase()
    if (kh.includes('round of 32')) return { type: 'r32', group: '' }
    if (kh.includes('round of 16')) return { type: 'r16', group: '' }
    if (kh.includes('quarter'))     return { type: 'qf',  group: '' }
    if (kh.includes('semi'))        return { type: 'sf',  group: '' }
    if (kh.includes('third') || kh.includes('3rd place')) return { type: 'third', group: '' }
    if (kh.includes('final'))       return { type: 'final', group: '' }
  }

  // 3. competition.type.id / abbreviation (numeric ESPN types)
  const typeId = (comp as unknown as Record<string, unknown>)?.type as Record<string, string> | undefined
  if (typeId?.abbreviation) {
    const a = typeId.abbreviation.toUpperCase()
    if (['R32', 'ROUND32', 'R-32'].includes(a)) return { type: 'r32', group: '' }
    if (['R16', 'ROUND16', 'R-16'].includes(a)) return { type: 'r16', group: '' }
    if (['QF', 'QUARTER'].includes(a))           return { type: 'qf',  group: '' }
    if (['SF', 'SEMI'].includes(a))              return { type: 'sf',  group: '' }
    if (['THIRD', '3RD'].includes(a))            return { type: 'third', group: '' }
    if (['FINAL', 'F'].includes(a))              return { type: 'final', group: '' }
  }

  // Default — treat as group stage; group letter resolved later via standings map
  return { type: 'group', group: '' }
}

function computeTimeElapsed(status: EspnStatus): string {
  if (status.type.name === 'STATUS_HALFTIME') return 'HT'
  const period = status.period ?? 0
  const clock = status.clock ?? 0
  // clock = elapsed seconds in current period
  const min = period <= 1 ? Math.floor(clock / 60) : 45 + Math.floor(clock / 60)
  return String(Math.max(1, min))
}

function extractScorers(comp: EspnCompetition, espnTeamId: string): string {
  if (!comp.details) return ''
  return comp.details
    .filter(d => d.type?.text === 'Goal' && d.team?.id === espnTeamId)
    .map(d => d.athletesInvolved?.[0]?.displayName ?? '')
    .filter(Boolean)
    .join(',')
}

function mapEvent(event: EspnEvent): EnrichedGame {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')
  const away = comp.competitors.find(c => c.homeAway === 'away')
  if (!home || !away) throw new Error(`Event ${event.id} missing competitors`)

  const { type, group } = parseRound(comp)
  const st = comp.status
  const isLive = st.type.state === 'in'
  const finished = (st.type.completed || st.type.state === 'post') ? 'TRUE' : 'FALSE'

  const makeTeam = (c: EspnCompetitor): ApiTeam => ({
    id: c.team.abbreviation,
    name_en: c.team.displayName,
    name_fa: '',
    fifa_code: c.team.abbreviation,
    groups: group,
    flag: c.team.logo ?? `https://a.espncdn.com/i/teamlogos/soccer/500/${c.team.id}.png`,
  })

  const stadium: ApiStadium | undefined = comp.venue ? {
    id: comp.venue.id ?? event.id,
    name_en: comp.venue.fullName ?? '',
    name_fa: '',
    fifa_name: comp.venue.fullName ?? '',
    city_en: comp.venue.address?.city ?? '',
    country_en: comp.venue.address?.country ?? '',
    capacity: 0,
  } : undefined

  return {
    id: event.id,
    home_team_id: home.team.abbreviation,
    away_team_id: away.team.abbreviation,
    home_team_name_en: home.team.displayName,
    away_team_name_en: away.team.displayName,
    home_team_label: home.team.shortDisplayName ?? home.team.abbreviation,
    away_team_label: away.team.shortDisplayName ?? away.team.abbreviation,
    home_score: home.score ?? '0',
    away_score: away.score ?? '0',
    home_scorers: extractScorers(comp, home.id),
    away_scorers: extractScorers(comp, away.id),
    group,
    matchday: '',
    local_date: event.date,   // UTC ISO 8601 — display timezone handled by formatters
    persian_date: '',
    stadium_id: comp.venue?.id ?? '',
    finished,
    time_elapsed: isLive ? computeTimeElapsed(st) : 'notstarted',
    type,
    homeTeam: makeTeam(home),
    awayTeam: makeTeam(away),
    stadium,
  }
}

// ── ESPN Standings → team→group map ─────────────────────────────────────────

interface EspnStandingsEntry {
  team?: EspnTeam
  stats?: Array<{ name: string; value: number; displayValue: string }>
}

interface EspnStandingsGroup {
  name?: string
  abbreviation?: string
  shortName?: string
  entries?: EspnStandingsEntry[]
  standings?: { entries?: EspnStandingsEntry[] }
}

interface EspnStandingsResponse {
  // shape A: { standings: { groups: [...] } }
  standings?: { groups?: EspnStandingsGroup[] } | EspnStandingsGroup[]
  // shape B: { content: { standingsGroups: [...] } }
  content?: { standingsGroups?: EspnStandingsGroup[] }
  // shape C: flat groups array
  groups?: EspnStandingsGroup[]
}

function extractGroupLetter(text: string): string {
  const m = text.match(/\bGroup\s+([A-L])\b/i) ?? text.match(/\b([A-L])\s+Group\b/i) ?? text.match(/\b([A-L])\b/)
  return m ? m[1].toUpperCase() : ''
}

async function fetchTeamGroupMap(numericToAbbr: Map<string, string>): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }
  const opts = { next: { revalidate: 3600 }, headers }
  const coreBase = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world'

  // ── ESPN core API: groups list → group details + standings/0 in parallel ──
  // Structure: groups/N → { name: "Group A" }
  //            groups/N/standings/0 → { standings: [{ team: { $ref: "...teams/203" } }] }
  // Team numeric IDs resolved via scoreboard competitor data (no extra calls)
  try {
    const listRes = await fetch(`${coreBase}/seasons/2026/types/1/groups?limit=20`, opts)
    if (listRes.ok) {
      const listData = await listRes.json() as { items?: Array<{ $ref: string }> }
      const groupIds = (listData.items ?? []).map(({ $ref }) => {
        const m = $ref.match(/\/groups\/(\d+)/)
        return m ? m[1] : null
      }).filter((id): id is string => id !== null)

      if (groupIds.length > 0) {
        // Parallel: fetch group detail + standings/0 for all groups
        const [groupDetails, standingsData] = await Promise.all([
          Promise.all(groupIds.map(id =>
            fetch(`${coreBase}/seasons/2026/types/1/groups/${id}`, opts)
              .then(r => r.ok ? r.json() : null).catch(() => null)
          )),
          Promise.all(groupIds.map(id =>
            fetch(`${coreBase}/seasons/2026/types/1/groups/${id}/standings/0`, opts)
              .then(r => r.ok ? r.json() : null).catch(() => null)
          )),
        ])

        type GrpDetail = { name?: string; abbreviation?: string }
        type StandingsEntry = { team?: { $ref?: string } }
        type StandingsData = { standings?: StandingsEntry[] }

        for (let i = 0; i < groupIds.length; i++) {
          const grp = groupDetails[i] as GrpDetail | null
          const s = standingsData[i] as StandingsData | null
          if (!grp || !s) continue

          const letter = extractGroupLetter(grp.abbreviation ?? grp.name ?? '')
          if (!letter) continue

          for (const entry of s.standings ?? []) {
            const numericId = entry.team?.$ref?.match(/\/teams\/(\d+)/)?.[1]
            if (!numericId) continue
            const abbr = numericToAbbr.get(numericId)
            if (abbr) map.set(abbr, letter)
            map.set(numericId, letter)
          }
        }

        if (map.size > 0) return map
      }
    }
  } catch { /* try next */ }

  // ── Fallback: old standings/teams endpoints (may work after tournament starts) ──
  for (const url of [
    'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings',
    'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026',
  ]) {
    try {
      const res = await fetch(url, opts)
      if (!res.ok) continue
      const data: EspnStandingsResponse = await res.json()

      let groups: EspnStandingsGroup[] = []
      const s = data.standings
      if (Array.isArray(s)) groups = s
      else if (s && 'groups' in s && Array.isArray(s.groups)) groups = s.groups
      else if (Array.isArray(data.groups)) groups = data.groups
      else if (data.content?.standingsGroups) groups = data.content.standingsGroups

      for (const grp of groups) {
        const raw = grp.name ?? grp.abbreviation ?? grp.shortName ?? ''
        const letter = extractGroupLetter(raw)
        if (!letter) continue
        const entries: EspnStandingsEntry[] = grp.entries ?? grp.standings?.entries ?? []
        for (const entry of entries) {
          if (entry.team?.abbreviation) map.set(entry.team.abbreviation, letter)
          if (entry.team?.id) map.set(entry.team.id, letter)
        }
      }
      if (map.size > 0) return map
    } catch { /* try next */ }
  }

  return map
}

// ── Scoreboard fetch ─────────────────────────────────────────────────────────

async function fetchScoreboard(yearMonth: string): Promise<EspnEvent[]> {
  const res = await fetch(`${SCOREBOARD}?dates=${yearMonth}`, {
    next: { revalidate: 30 },
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`ESPN scoreboard ${yearMonth}: ${res.status}`)
  const data: { events?: EspnEvent[] } = await res.json()
  return data.events ?? []
}

// ── Public API (same shape as apiClient.ts exports) ─────────────────────────

export async function fetchEnrichedGames(): Promise<EnrichedGame[]> {
  // WC 2026 spans June 11 – July 19
  const [juneEvents, julyEvents] = await Promise.all([
    fetchScoreboard('202606'),
    fetchScoreboard('202607'),
  ])

  // Build numeric ESPN team ID → abbreviation from scoreboard (avoids extra API calls in group map)
  const numericToAbbr = new Map<string, string>()
  for (const ev of [...juneEvents, ...julyEvents]) {
    for (const c of ev.competitions[0]?.competitors ?? []) {
      if (c.team.id && c.team.abbreviation) numericToAbbr.set(c.team.id, c.team.abbreviation)
    }
  }

  const groupMap = await fetchTeamGroupMap(numericToAbbr)

  const games = [...juneEvents, ...julyEvents]
    .map(ev => { try { return mapEvent(ev) } catch { return null } })
    .filter((g): g is EnrichedGame => g !== null)

  // Post-pass: fill in group letter from standings map for games where
  // parseRound() couldn't extract it from the scoreboard response
  if (groupMap.size > 0) {
    for (const g of games) {
      if (g.type === 'group' && !g.group) {
        const letter = groupMap.get(g.home_team_id) ?? groupMap.get(g.away_team_id)
        if (letter) {
          g.group = letter
          if (g.homeTeam) g.homeTeam.groups = letter
          if (g.awayTeam) g.awayTeam.groups = letter
        }
      }
    }
  }

  return games
}

export async function fetchEnrichedGroups(): Promise<EnrichedGroup[]> {
  // Derive standings from game results — no extra ESPN endpoint needed
  const games = await fetchEnrichedGames()
  const groupGames = games.filter(g => g.type === 'group')

  type Entry = { team: ApiTeam; pts: number; gf: number; ga: number }
  const groupMap = new Map<string, Map<string, Entry>>()

  for (const game of groupGames) {
    const grp = game.group
    if (!groupMap.has(grp)) groupMap.set(grp, new Map())
    const teams = groupMap.get(grp)!

    const addTeam = (team: ApiTeam | undefined) => {
      if (team && !teams.has(team.id))
        teams.set(team.id, { team: { ...team, groups: grp }, pts: 0, gf: 0, ga: 0 })
    }
    addTeam(game.homeTeam)
    addTeam(game.awayTeam)

    if (game.finished === 'TRUE') {
      const hs = parseInt(game.home_score) || 0
      const as_ = parseInt(game.away_score) || 0
      const homeEntry = game.homeTeam ? teams.get(game.homeTeam.id) : undefined
      const awayEntry = game.awayTeam ? teams.get(game.awayTeam.id) : undefined
      if (homeEntry) {
        homeEntry.gf += hs; homeEntry.ga += as_
        homeEntry.pts += hs > as_ ? 3 : hs === as_ ? 1 : 0
      }
      if (awayEntry) {
        awayEntry.gf += as_; awayEntry.ga += hs
        awayEntry.pts += as_ > hs ? 3 : as_ === hs ? 1 : 0
      }
    }
  }

  return [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grp, teams]) => ({
      group: grp,
      standings: [...teams.values()]
        .sort((a, b) => {
          const pd = b.pts - a.pts; if (pd) return pd
          const gdd = (b.gf - b.ga) - (a.gf - a.ga); if (gdd) return gdd
          return b.gf - a.gf
        })
        .map(s => ({
          team_id: s.team.id,
          pts: String(s.pts),
          gf: String(s.gf),
          ga: String(s.ga),
          gd: s.gf - s.ga,
          team: s.team,
        })),
    }))
}

export async function fetchAllTeams(): Promise<ApiTeam[]> {
  const games = await fetchEnrichedGames()
  const teamMap = new Map<string, ApiTeam>()
  for (const g of games) {
    if (g.homeTeam) teamMap.set(g.homeTeam.id, g.homeTeam)
    if (g.awayTeam) teamMap.set(g.awayTeam.id, g.awayTeam)
  }
  return [...teamMap.values()].sort((a, b) => a.name_en.localeCompare(b.name_en))
}
