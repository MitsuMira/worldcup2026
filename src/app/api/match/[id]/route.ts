import { NextResponse } from 'next/server'
import type { MatchDetail, MatchEvent, TeamMatchStats, TeamLineup, RosterPlayer, H2HGame, CommentaryEntry, MatchLeader, MatchLeaders } from '@/lib/types'
import { formatMinute, teamAbbr, parseEvents, parseKeyEvents, parseEventsFromCommentary, type EspnClock, type EspnDetailEntry, type EspnKeyEvent, type EspnCommentaryEntry } from '@/lib/matchEvents'

const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary'

export const dynamic = 'force-dynamic'

// ── ESPN raw shapes (summary endpoint) ───────────────────────────────────────

interface EspnBoxTeam {
  team?: { id: string; abbreviation?: string }
  statistics?: Array<{ name: string; displayValue: string }>
}

interface EspnRosterEntry {
  athlete?: { id: string; displayName: string; jersey?: string; headshot?: { href: string }; position?: { displayName: string; abbreviation: string } }
  jersey?: string   // sometimes at entry level rather than athlete level
  starter?: boolean
  captain?: boolean
  position?: { displayName: string; abbreviation: string }
  subbedIn?: boolean
  formationPlace?: number
}

interface EspnRoster {
  team?: { id: string; abbreviation?: string; displayName?: string }
  formation?: string
  roster?: EspnRosterEntry[]
}

interface EspnOfficial {
  fullName?: string
  order?: number
  position?: { name?: string }
}

interface EspnCompetitor {
  id: string
  homeAway: 'home' | 'away'
  team: { id: string; abbreviation?: string; displayName?: string; form?: string }
  score?: string
}

interface EspnSummary {
  header?: {
    competitions?: Array<{
      competitors?: EspnCompetitor[]
      status?: { type?: { state?: string; completed?: boolean } }
      details?: EspnDetailEntry[]
      attendance?: number
      broadcasts?: Array<{
        media?: { shortName?: string }
        region?: string
      }>
      geoBroadcasts?: Array<{
        market?: { type?: string }
        media?: { shortName?: string }
      }>
    }>
  }
  keyEvents?: EspnKeyEvent[]
  boxscore?: { teams?: EspnBoxTeam[] }
  rosters?: EspnRoster[]
  officials?: EspnOfficial[]
  commentary?: EspnCommentaryEntry[]
  headToHeadGames?: Array<{
    team?: { id: string; abbreviation?: string; displayName?: string }
    events?: Array<{
      id?: string
      gameDate?: string
      score?: string
      homeTeamId?: string
      awayTeamId?: string
      homeTeamScore?: string
      awayTeamScore?: string
      gameResult?: string
      opponent?: { id?: string; abbreviation?: string; displayName?: string }
    }>
  }>
  leaders?: Array<{
    team?: { id: string; abbreviation?: string; displayName?: string }
    leaders?: Array<{
      name?: string
      displayName?: string
      leaders?: Array<{
        displayValue?: string
        athlete?: { id: string; displayName: string; shortName?: string }
        statistics?: Array<{ name: string; displayValue: string; abbreviation: string }>
        mainStat?: { value: string; label: string }
        summary?: string
      }>
    }>
  }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// formatMinute, teamAbbr, parseEvents, parseKeyEvents, parseEventsFromCommentary
// live in @/lib/matchEvents (shared with espnClient's regulation-score reconstruction).

function parseStats(teams: EspnBoxTeam[], teamId: string): TeamMatchStats | undefined {
  const bt = teams.find(t => teamAbbr(t.team) === teamId || t.team?.id === teamId)
  if (!bt?.statistics) return undefined
  const stat = (name: string) =>
    bt.statistics!.find(s => s.name === name || s.name === name.toLowerCase())?.displayValue
  return {
    possession: stat('possessionPct') ?? stat('possession'),
    shots: stat('totalShots') ?? stat('shots'),
    shotsOnTarget: stat('shotsOnTarget'),
    corners: stat('cornerKicks') ?? stat('corners'),
    fouls: stat('fouls'),
    offsides: stat('offsides'),
    yellowCards: stat('yellowCards'),
    redCards: stat('redCards'),
    saves: stat('saves') ?? stat('goalKeeperSaves'),
  }
}

function parseLineup(roster: EspnRoster): TeamLineup {
  const toPlayer = (r: EspnRosterEntry): RosterPlayer => {
    return {
      name: r.athlete?.displayName ?? '',
      jersey: r.athlete?.jersey ?? r.jersey,   // ESPN sometimes puts jersey at entry level
      position: r.athlete?.position?.abbreviation ?? r.athlete?.position?.displayName ?? r.position?.abbreviation ?? r.position?.displayName,
      headshot: r.athlete?.headshot?.href,      // only use explicit href — fallback URLs return 404 for most players
      formationPlace: r.formationPlace,
      captain: r.captain ?? undefined,
    }
  }
  const all = roster.roster ?? []
  return {
    teamId: teamAbbr(roster.team),
    teamName: roster.team?.displayName ?? '',
    formation: roster.formation,
    starters: all.filter(r => r.starter).map(toPlayer),
    subs: all.filter(r => !r.starter).map(toPlayer),
  }
}

function parseH2H(raw: EspnSummary['headToHeadGames']): H2HGame[] {
  if (!raw) return []
  const results: H2HGame[] = []
  for (const entry of raw) {
    if (!entry.events || !entry.team) continue
    for (const ev of entry.events) {
      if (results.length >= 5) break
      const isHome = ev.homeTeamId === entry.team.id
      const teamAbbrev = entry.team.abbreviation ?? entry.team.displayName ?? ''
      const opponentAbbrev = ev.opponent?.abbreviation ?? ev.opponent?.displayName ?? ''
      results.push({
        date: ev.gameDate ? ev.gameDate.slice(0, 10) : '',
        homeTeam: isHome ? teamAbbrev : opponentAbbrev,
        awayTeam: isHome ? opponentAbbrev : teamAbbrev,
        homeScore: ev.homeTeamScore ?? '',
        awayScore: ev.awayTeamScore ?? '',
      })
    }
    if (results.length >= 5) break
  }
  return results
}

const STAT_CODES: Record<string, string> = {
  SOG: 'shots on goal',
  xG: 'xG',
  PASS: 'passes',
  TKLW: 'tackles won',
  DUELW: 'duels won',
  SOGA: 'shots faced',
  xGC: 'xGC',
  INTER: 'interceptions',
  CLEAR: 'clearances',
  BLOCK: 'blocks',
  FOULW: 'fouls won',
  FAUL: 'fouls',
  BCC: 'key chances created',
}

const CATEGORY_PT: Record<string, string> = {
  'Total Shots': 'Chutes Totais',
  'Accurate Passes': 'Passes Precisos',
  'Defensive Interventions': 'Intervenções Defensivas',
  'Saves': 'Defesas',
  'Goals': 'Gols',
  'Assists': 'Assistências',
}

function expandLeaderSummary(summary?: string): string | undefined {
  if (!summary) return undefined
  return summary.replace(/\b([A-Z]{2,6})\b/g, (code) => STAT_CODES[code] ?? code)
}

function parseLeaders(raw: EspnSummary['leaders'], homeEspnId: string, awayEspnId: string, homeId: string, awayId: string): MatchLeaders {
  const result: MatchLeaders = {}
  if (!raw) return result
  for (const entry of raw) {
    const espnTeamId = entry.team?.id ?? ''
    const teamKey = espnTeamId === homeEspnId ? 'home' : 'away'
    const leaders: MatchLeader[] = []
    for (const cat of entry.leaders ?? []) {
      const top = cat.leaders?.[0]
      if (!top?.athlete) continue
      const rawCat = cat.displayName ?? cat.name ?? ''
      leaders.push({
        category: CATEGORY_PT[rawCat] ?? rawCat,
        playerName: top.athlete.displayName,
        value: top.displayValue ?? '',
        summary: expandLeaderSummary(top.summary),
      })
    }
    result[teamKey] = leaders
  }
  return result
}

// Parse penalty shootout kicks from commentary (ESPN never puts them in keyEvents/details)
function parsePenShootoutFromCommentary(
  commentary: NonNullable<EspnSummary['commentary']>,
  homeId: string,
  awayId: string,
  homeName: string,
  awayName: string,
): MatchEvent[] {
  const events: MatchEvent[] = []
  const homeWords = homeName.toLowerCase().split(' ').filter(w => w.length > 3)
  const awayWords = awayName.toLowerCase().split(' ').filter(w => w.length > 3)
  const homeAbbrLower = homeId.toLowerCase()
  const awayAbbrLower = awayId.toLowerCase()

  const resolveTeam = (name: string): string => {
    const n = name.trim().toLowerCase()
    if (n === homeAbbrLower) return homeId
    if (n === awayAbbrLower) return awayId
    if (homeWords.some(w => n.includes(w))) return homeId
    if (awayWords.some(w => n.includes(w))) return awayId
    return homeId
  }

  // Process oldest-first so we can use an inShootout flag:
  // once a shootout event is detected, all subsequent penalty misses/saves
  // are also shootout events regardless of their time label.
  const chronological = [...commentary].reverse()
  let inShootout = false

  for (const c of chronological) {
    const text = c.text ?? ''
    const minVal = parseInt(c.time?.displayValue ?? '0') || 0

    // Shootout goal: "Goal! TeamA 1(3), TeamB 1(4). Player (Team) converts..."
    // \(\d+\) pen-score marker reliably distinguishes from regulation goals.
    // Home-team-first format: "Goal! Netherlands 1(1), Morocco 0. Player (Netherlands)..."
    //   the pen-score digit appears before the period → (?:\d+|\))\. catches both.
    if (/^Goal!/i.test(text) && /\(\d+\)/.test(text)) {
      inShootout = true
      const m = text.match(/(?:\d+|\))\.\s+(.+?)\s+\(([^)]+)\)/)
      if (m) {
        events.push({ type: 'penalty', minuteDisplay: 'PEN', minute: 121, teamId: resolveTeam(m[2]), primaryPlayer: m[1].trim() })
      }
      continue
    }

    // Shootout miss/save — once inShootout is set, all misses are shootout misses.
    // Before the first shootout event, require minute ≥ 120 or a non-numeric time
    // label ("PK" etc.) which parseInt converts to NaN and || 0 gives 0.
    // Handles both "Penalty missed." and "Penalty kick missed." variants.
    if (/^Penalty(?:\s+kick)?\s+(missed|saved)\./i.test(text) && (inShootout || minVal >= 120 || minVal === 0)) {
      inShootout = true
      const m = text.match(/^Penalty(?:\s+kick)?\s+(?:missed|saved)\.\s+(.+?)\s+\(([^)]+)\)/i)
      if (m) {
        events.push({ type: 'missed_penalty', minuteDisplay: 'PEN', minute: 121, teamId: resolveTeam(m[2]), primaryPlayer: m[1].trim() })
      }
    }
  }

  // Events are already in chronological order (processed oldest-first above)
  return events
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const res = await fetch(`${SUMMARY}?event=${id}`, {
      next: { revalidate: 15 },
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return NextResponse.json({ error: `ESPN ${res.status}` }, { status: res.status })

    const data: EspnSummary = await res.json()
    const comp = data.header?.competitions?.[0]
    const competitors = comp?.competitors ?? []
    const homeComp = competitors.find(c => c.homeAway === 'home')
    const awayComp = competitors.find(c => c.homeAway === 'away')
    const homeId = teamAbbr(homeComp?.team)
    const awayId = teamAbbr(awayComp?.team)

    const details = comp?.details ?? []
    const keyEvents = data.keyEvents ?? []
    const homeName = homeComp?.team.displayName ?? homeId
    const awayName = awayComp?.team.displayName ?? awayId
    const homeEspnId = homeComp?.id ?? ''
    const awayEspnId = awayComp?.id ?? ''
    const baseEvents = keyEvents.length > 0
      ? parseKeyEvents(keyEvents, homeEspnId, awayEspnId, homeId, awayId)
      : details.length > 0
        ? parseEvents(details, homeId)
        : parseEventsFromCommentary(data.commentary ?? [], homeId, awayId, homeName, awayName)

    // ESPN never includes penalty shootout kicks in keyEvents/details — always parse from commentary
    const penShootout = parsePenShootoutFromCommentary(data.commentary ?? [], homeId, awayId, homeName, awayName)
    const hasPenAlready = baseEvents.some(e => e.minuteDisplay === 'PEN')
    const events = !hasPenAlready && penShootout.length > 0
      ? [...baseEvents, ...penShootout]
      : baseEvents

    const boxTeams = data.boxscore?.teams ?? []

    // Adjust cache based on match state
    const state = comp?.status?.type?.state
    const revalidate = state === 'in' ? 30 : state === 'post' ? 86400 : 3600
    // (Next.js per-fetch revalidate is set at fetch time; we return a header as hint)

    const homeForm = competitors.find(c => c.homeAway === 'home')?.team.form
    const awayForm = competitors.find(c => c.homeAway === 'away')?.team.form
    const broadcasts = (comp?.broadcasts ?? comp?.geoBroadcasts ?? [])
      .map(b => b.media?.shortName)
      .filter((n): n is string => !!n)
      .filter((n, i, arr) => arr.indexOf(n) === i)  // deduplicate

    // Compute penalty shootout goal counts from parsed kick events
    // (ESPN's scoreboard linescores[4] is often absent, so this is the reliable source)
    const penHomeGoals = events.filter(e => e.minuteDisplay === 'PEN' && e.type === 'penalty' && e.teamId === homeId).length
    const penAwayGoals = events.filter(e => e.minuteDisplay === 'PEN' && e.type === 'penalty' && e.teamId === awayId).length

    const result: MatchDetail = {
      id,
      homeTeamId: homeId,
      awayTeamId: awayId,
      events,
      penHomeGoals: penHomeGoals > 0 ? penHomeGoals : undefined,
      penAwayGoals: penAwayGoals > 0 ? penAwayGoals : undefined,
      homeStats: parseStats(boxTeams, homeComp?.id ?? homeId),
      awayStats: parseStats(boxTeams, awayComp?.id ?? awayId),
      homeLineup: data.rosters?.find(r => teamAbbr(r.team) === homeId || r.team?.id === homeComp?.id)
        ? parseLineup(data.rosters!.find(r => teamAbbr(r.team) === homeId || r.team?.id === homeComp?.id)!)
        : undefined,
      awayLineup: data.rosters?.find(r => teamAbbr(r.team) === awayId || r.team?.id === awayComp?.id)
        ? parseLineup(data.rosters!.find(r => teamAbbr(r.team) === awayId || r.team?.id === awayComp?.id)!)
        : undefined,
      referee: data.officials?.find(o => o.position?.name?.toLowerCase().includes('referee') && o.order === 1)?.fullName,
      attendance: comp?.attendance,
      homeForm,
      awayForm,
      h2h: parseH2H(data.headToHeadGames),
      broadcasts: broadcasts.length > 0 ? broadcasts : undefined,
      leaders: parseLeaders(data.leaders, homeEspnId, awayEspnId, homeId, awayId),
      commentary: data.commentary
        ? (() => {
            const seenIds = new Set<string>()
            const iconForType = (type?: string): string => {
              switch (type) {
                case 'goal': return '⚽'
                case 'penalty-goal': return '⚽'
                case 'penalty-kick': return '⚽'
                case 'penalty-miss': return '❌'
                case 'penalty-missed': return '❌'
                case 'yellow-card': return '🟨'
                case 'red-card': return '🟥'
                case 'shot-on-target': return '🎯'
                case 'shot-off-target': return '↗️'
                case 'shot-blocked': return '🛡️'
                case 'shot-hit-woodwork': return '🪵'
                case 'corner-awarded': return '🚩'
                case 'foul': return '⚠️'
                case 'offside': return '🚫'
                case 'handball': return '✋'
                case 'start-delay': return '⏸️'
                case 'end-delay': return '▶️'
                case 'halftime': return '⏱️'
                case 'kickoff': return '⏱️'
                default: return ''
              }
            }
            return data.commentary!
              .filter(c => {
                if (!c.text) return false
                const playId = c.play?.id
                if (playId) {
                  if (seenIds.has(playId)) return false
                  seenIds.add(playId)
                }
                return true
              })
              .map((c, i): CommentaryEntry => ({
                sequence: c.sequence ?? i,
                minute: c.time?.displayValue,
                text: c.text!,
                icon: iconForType(c.play?.type?.type),
              }))
              .reverse()   // newest first
          })()
        : undefined,
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': `s-maxage=${revalidate}, stale-while-revalidate=${revalidate}` },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
