import 'server-only'
import type { EnrichedGame, EnrichedGroup, ApiTeam, ApiStadium } from './types'
import { FIFA_RANK } from './fifaRanking'
import { isEspnPlaceholder, BRACKET_POSITIONS } from './bracketStructure'

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
  scoringPlay?: boolean
  penaltyKick?: boolean
  ownGoal?: boolean
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
  // 1. competition.notes[].headline — most reliable signal for knockout rounds
  for (const note of comp.notes ?? []) {
    const h = note.headline ?? ''
    const kh = h.toLowerCase()
    if (kh.includes('round of 32')) return { type: 'r32', group: '' }
    if (kh.includes('round of 16')) return { type: 'r16', group: '' }
    if (kh.includes('quarter'))     return { type: 'qf',  group: '' }
    if (kh.includes('semi'))        return { type: 'sf',  group: '' }
    if (kh.includes('third') || kh.includes('3rd place')) return { type: 'third', group: '' }
    if (kh.includes('final'))       return { type: 'final', group: '' }
    const nm = h.match(/Group\s+([A-L])\b/i)
    if (nm) return { type: 'group', group: nm[1].toUpperCase() }
  }

  // 2. competition.type.abbreviation — check BEFORE comp.groups because ESPN sometimes
  //    attaches a group (team's origin group) to R32 knockout games
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

  // 3. competition.groups object (e.g. { name: "Group A", shortName: "A" })
  const groupObj = comp.groups
  if (groupObj) {
    const src = [groupObj.name, groupObj.shortName, groupObj.abbreviation].filter(Boolean).join(' ')
    const gm = src.match(/\b([A-L])\b/i) ?? src.match(/Group\s+([A-L])/i)
    if (gm) return { type: 'group', group: gm[1].toUpperCase() }
  }

  // Default — treat as group stage; group letter resolved later via standings map
  return { type: 'group', group: '' }
}

function computeTimeElapsed(status: EspnStatus): string {
  if (status.type.name === 'STATUS_HALFTIME') return 'HT'
  const period = status.period ?? 0

  // Take the max of both sources:
  // - status.clock (seconds) may keep counting past 2700/5400 during stoppage
  // - displayClock (e.g. "46:20") may freeze at "45:00" or may count past it
  // Whichever is larger gives the most accurate stoppage time reading
  const minFromClock = Math.floor((status.clock ?? 0) / 60)
  const display = status.displayClock
  const minFromDisplay = display?.includes(':') ? (parseInt(display.split(':')[0]) || 0) : 0
  const min = Math.max(1, minFromClock, minFromDisplay)

  if (period >= 2 && min >= 90) {
    const extra = min - 90
    return extra > 0 ? `90+${extra}` : '90+'
  }
  if (period <= 1 && min >= 45) {
    const extra = min - 45
    return extra > 0 ? `45+${extra}` : '45+'
  }
  return String(min)
}

function extractScorers(comp: EspnCompetition, espnTeamId: string): string {
  if (!comp.details) return ''
  const seen = new Set<string>()
  return comp.details
    .filter(d => {
      if (d.team?.id !== espnTeamId) return false
      if (d.ownGoal) return false
      // Prefer ESPN's explicit boolean flags when present
      if (d.scoringPlay !== undefined) return d.scoringPlay === true
      // Fallback: match by type text
      const text = d.type?.text?.toLowerCase() ?? ''
      return text.includes('goal') && !text.includes('missed') && !text.includes('own')
    })
    .filter(d => {
      // Deduplicate: some penalty goals appear as both a "Penalty" and a "Goal" event at the same clock + player
      const key = `${d.team?.id}-${d.clock?.value ?? 0}-${d.athletesInvolved?.[0]?.id ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(d => d.athletesInvolved?.[0]?.displayName ?? '')
    .filter(Boolean)
    .join(',')
}

function extractCards(comp: EspnCompetition, espnTeamId: string, cardType: 'yellow' | 'red'): number {
  if (!comp.details) return 0
  return comp.details.filter(d => {
    const text = d.type?.text?.toLowerCase() ?? ''
    const matchesTeam = d.team?.id === espnTeamId
    if (cardType === 'yellow') return matchesTeam && (text === 'yellow card' || text === 'yellow-red card')
    return matchesTeam && (text === 'red card' || text === 'yellow-red card')
  }).length
}

function mapEvent(event: EspnEvent): EnrichedGame {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')
  const away = comp.competitors.find(c => c.homeAway === 'away')
  if (!home || !away) throw new Error(`Event ${event.id} missing competitors`)

  let { type, group } = parseRound(comp)

  // If parseRound() hit the default, detect knockout stage from team display names.
  // ESPN placeholder names describe where teams COME FROM, so the logic is inverted:
  //   "Semifinal X Winner/Loser" teams → current game is Final or 3rd Place
  //   "Quarterfinal X Winner" teams    → current game is SF
  //   "Round of 16 / R16" teams        → current game is QF
  //   "Round of 32 / R32" teams        → current game is R16
  //   "Group X Winner/2nd Place" teams → current game is R32
  // Also check team display names when type came from comp.groups:
  // ESPN sometimes attaches a group to R32 games (e.g., "Group E" for Germany's R32 slot)
  // even though the game is actually a knockout match.
  if (type === 'group') {
    const combined = `${home.team.displayName} ${away.team.displayName}`.toLowerCase()
    if (/\bsemifinal\b|\bsemi-final\b/.test(combined)) {
      type = /loser/.test(combined) ? 'third' : 'final'; group = ''
    } else if (/\bquarterfinal\b|\bquarter-final\b|\bquarter final\b/.test(combined)) {
      type = 'sf'; group = ''
    } else if (/round.of.16|\br16\b/.test(combined)) {
      type = 'qf'; group = ''
    } else if (/round.of.32|\br32\b/.test(combined)) {
      type = 'r16'; group = ''
    } else if (/\b(winner|loser|2nd place|3rd place|runner|melhor|mejor|best.3|place)\b/.test(combined) && !group) {
      type = 'r32'; group = ''
    } else {
      // Final fallback: look up the game's date+city in the fixed bracket schedule.
      // Catches R32/R16/QF/SF games where both teams have real names (not placeholders)
      // but ESPN still attaches comp.groups from a participant's origin group —
      // e.g. South Africa's Group A tag leaks onto the Canada vs South Africa R32 game.
      const cityRaw = comp.venue?.address?.city ?? ''
      const citySplit = cityRaw.split(',')[0].trim()
      const utcDateStr = event.date.slice(0, 10)
      const [y, mo, d] = utcDateStr.split('-').map(Number)
      const prevDateStr = new Date(Date.UTC(y, mo - 1, d - 1)).toISOString().slice(0, 10)
      for (const dateStr of [utcDateStr, prevDateStr]) {
        const bp = BRACKET_POSITIONS.get(`${dateStr}_${cityRaw}`) ??
                   BRACKET_POSITIONS.get(`${dateStr}_${citySplit}`)
        if (bp) { type = bp.round; group = ''; break }
      }
    }
  }
  const st = comp.status
  const isLive = st.type.state === 'in'
  const finished = (st.type.completed || st.type.state === 'post') ? 'TRUE' : 'FALSE'

  let decidedBy: 'regulation' | 'et' | 'penalties' | undefined
  if (finished === 'TRUE') {
    if (st.type.name === 'STATUS_FINAL_AET') decidedBy = 'et'
    else if (st.type.name === 'STATUS_FINAL_PEN') decidedBy = 'penalties'
    else decidedBy = 'regulation'
  }

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
    home_yellow_cards: extractCards(comp, home.id, 'yellow'),
    away_yellow_cards: extractCards(comp, away.id, 'yellow'),
    home_red_cards: extractCards(comp, home.id, 'red'),
    away_red_cards: extractCards(comp, away.id, 'red'),
    group,
    matchday: '',
    name: event.name,
    local_date: event.date,   // UTC ISO 8601 — display timezone handled by formatters
    persian_date: '',
    stadium_id: comp.venue?.id ?? '',
    finished,
    time_elapsed: isLive ? computeTimeElapsed(st) : 'notstarted',
    type,
    decidedBy,
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
    cache: 'no-store',
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

// ── FIFA tiebreaker (WC 2026 rules) ─────────────────────────────────────────
// Step 1: H2H pts → H2H GD → H2H GF (among tied teams only)
// Step 2: overall GD → overall GF → conduct score (fewer cards = better)
// Step 3: FIFA ranking (no data — skipped)

type Entry = { team: ApiTeam; pts: number; gf: number; ga: number; w: number; d: number; l: number; played: number; yellows: number; reds: number }

function conductPenalty(e: Entry): number {
  // Yellow-reds are counted in both yellow and red by extractCards.
  // FIFA: yellow=-1, direct red=-3, yellow-red=-3 (not -4).
  // We approximate: yellows*1 + reds*3, accepting slight over-penalty for yellow-reds.
  return e.yellows + e.reds * 3
}

function h2hStats(entries: Entry[], games: EnrichedGame[]): Map<string, { pts: number; gd: number; gf: number }> {
  const ids = new Set(entries.map(e => e.team.id))
  const stats = new Map(entries.map(e => [e.team.id, { pts: 0, gd: 0, gf: 0 }]))
  for (const g of games) {
    if (g.finished !== 'TRUE') continue
    const hId = g.homeTeam?.id, aId = g.awayTeam?.id
    if (!hId || !aId || !ids.has(hId) || !ids.has(aId)) continue
    const hs = parseInt(g.home_score) || 0, as_ = parseInt(g.away_score) || 0
    const h = stats.get(hId)!, a = stats.get(aId)!
    h.gf += hs; h.gd += hs - as_
    a.gf += as_; a.gd += as_ - hs
    if (hs > as_) h.pts += 3
    else if (hs === as_) { h.pts += 1; a.pts += 1 }
    else a.pts += 3
  }
  return stats
}

function overallCmp(a: Entry, b: Entry): number {
  const gdd = (b.gf - b.ga) - (a.gf - a.ga); if (gdd) return gdd
  const gfd = b.gf - a.gf; if (gfd) return gfd
  const cd = conductPenalty(a) - conductPenalty(b); if (cd) return cd // fewer cards = better
  // Step 3: FIFA ranking (lower number = better)
  const ra = FIFA_RANK[a.team.id] ?? 999
  const rb = FIFA_RANK[b.team.id] ?? 999
  return ra - rb
}

function rankTied(entries: Entry[], games: EnrichedGame[]): Entry[] {
  if (entries.length <= 1) return entries
  const h2h = h2hStats(entries, games)
  const sorted = [...entries].sort((a, b) => {
    const ha = h2h.get(a.team.id)!, hb = h2h.get(b.team.id)!
    const pd = hb.pts - ha.pts; if (pd) return pd
    const gdd = hb.gd - ha.gd; if (gdd) return gdd
    const gfd = hb.gf - ha.gf; if (gfd) return gfd
    return overallCmp(a, b)
  })
  // For 3+ tied: sub-groups still equal on H2H fall back to overall
  if (entries.length > 2) {
    const result: Entry[] = []
    let i = 0
    while (i < sorted.length) {
      let j = i + 1
      const hi = h2h.get(sorted[i].team.id)!
      while (j < sorted.length) {
        const hj = h2h.get(sorted[j].team.id)!
        if (hj.pts !== hi.pts || hj.gd !== hi.gd || hj.gf !== hi.gf) break
        j++
      }
      const sub = sorted.slice(i, j)
      result.push(...(sub.length > 1 ? sub.sort(overallCmp) : sub))
      i = j
    }
    return result
  }
  return sorted
}

function sortFifa(entries: Entry[], games: EnrichedGame[]): Entry[] {
  const byPts = [...entries].sort((a, b) => b.pts - a.pts)
  const result: Entry[] = []
  let i = 0
  while (i < byPts.length) {
    let j = i + 1
    while (j < byPts.length && byPts[j].pts === byPts[i].pts) j++
    const tied = byPts.slice(i, j)
    result.push(...(tied.length > 1 ? rankTied(tied, games) : tied))
    i = j
  }
  return result
}

export async function fetchEnrichedGroups(): Promise<EnrichedGroup[]> {
  // Derive standings from game results — no extra ESPN endpoint needed
  const games = await fetchEnrichedGames()
  const groupGames = games.filter(g => g.type === 'group' && g.group !== '')

  const groupMap = new Map<string, Map<string, Entry>>()
  // Tracks which group each team was first assigned to. Prevents teams from leaking
  // into the wrong group when ESPN mis-tags an R32 knockout game with comp.groups
  // set to the origin group of one of the participants (e.g. Canada appears in Group A
  // because they face South Africa, who is from Group A, in the Round of 32).
  const teamGroupAssignment = new Map<string, string>()

  for (const game of groupGames) {
    const grp = game.group
    if (!groupMap.has(grp)) groupMap.set(grp, new Map())
    const teams = groupMap.get(grp)!

    const addTeam = (team: ApiTeam | undefined) => {
      if (team && !teams.has(team.id) && !isEspnPlaceholder(team.name_en)) {
        const knownGroup = teamGroupAssignment.get(team.id)
        if (knownGroup && knownGroup !== grp) return  // already belongs to a different group
        teamGroupAssignment.set(team.id, grp)
        teams.set(team.id, { team: { ...team, groups: grp }, pts: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0, played: 0, yellows: 0, reds: 0 })
      }
    }
    addTeam(game.homeTeam)
    addTeam(game.awayTeam)

    if (game.finished === 'TRUE') {
      const hs = parseInt(game.home_score) || 0
      const as_ = parseInt(game.away_score) || 0
      const homeEntry = game.homeTeam ? teams.get(game.homeTeam.id) : undefined
      const awayEntry = game.awayTeam ? teams.get(game.awayTeam.id) : undefined
      if (homeEntry) {
        homeEntry.gf += hs; homeEntry.ga += as_; homeEntry.played++
        homeEntry.yellows += game.home_yellow_cards ?? 0
        homeEntry.reds += game.home_red_cards ?? 0
        if (hs > as_) { homeEntry.pts += 3; homeEntry.w++ }
        else if (hs === as_) { homeEntry.pts += 1; homeEntry.d++ }
        else homeEntry.l++
      }
      if (awayEntry) {
        awayEntry.gf += as_; awayEntry.ga += hs; awayEntry.played++
        awayEntry.yellows += game.away_yellow_cards ?? 0
        awayEntry.reds += game.away_red_cards ?? 0
        if (as_ > hs) { awayEntry.pts += 3; awayEntry.w++ }
        else if (as_ === hs) { awayEntry.pts += 1; awayEntry.d++ }
        else awayEntry.l++
      }
    }
  }

  return [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grp, teams]) => ({
      group: grp,
      standings: sortFifa([...teams.values()], groupGames)
        .map(s => ({
          team_id: s.team.id,
          pts: String(s.pts),
          gf: String(s.gf),
          ga: String(s.ga),
          gd: s.gf - s.ga,
          played: s.played,
          w: s.w,
          d: s.d,
          l: s.l,
          yellows: s.yellows,
          reds: s.reds,
          team: s.team,
        })),
    }))
}

export async function fetchAllTeams(): Promise<ApiTeam[]> {
  const games = await fetchEnrichedGames()
  const teamMap = new Map<string, ApiTeam>()
  const addTeam = (team: ApiTeam | undefined) => {
    if (!team) return
    const existing = teamMap.get(team.id)
    // Prefer the entry that carries the group letter; playoff entries have groups = ''
    if (!existing || (!existing.groups && team.groups)) {
      teamMap.set(team.id, team)
    }
  }
  for (const g of games) {
    addTeam(g.homeTeam)
    addTeam(g.awayTeam)
  }
  return [...teamMap.values()].sort((a, b) => a.name_en.localeCompare(b.name_en))
}
