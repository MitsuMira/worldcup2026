import { NextResponse } from 'next/server'
import type { MatchDetail, MatchEvent, TeamMatchStats, TeamLineup, RosterPlayer, H2HGame } from '@/lib/types'

const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary'

// ── Commentary-based event parsing (fallback when details[] is empty) ─────────
const COMMENTARY_GOAL_RE = /^Goal!\s+(.+?)\s+(\d+),\s+(.+?)\s+(\d+)\.\s+(.+?)\s+\((\d+)'?\)/i
const COMMENTARY_OWN_GOAL_RE = /own\s*goal/i
const COMMENTARY_YELLOW_RE = /^Yellow card[^.]*\.\s*(.+?)\s+\((\d+)'?\)/i
const COMMENTARY_RED_RE = /^Red card[^.]*\.\s*(.+?)\s+\((\d+)'?\)/i
const COMMENTARY_SUB_RE = /^Substitution[^.]*\.\s*(.+?)\s+(?:replaces|is replaced by)\s+(.+?)\s+\((\d+)'?\)/i

export const dynamic = 'force-dynamic'

// ── ESPN raw shapes (summary endpoint) ───────────────────────────────────────

interface EspnClock { value?: number; displayValue?: string }

interface EspnDetailEntry {
  type?: { id: string; text: string }
  clock?: EspnClock
  team?: { id: string; abbreviation?: string }
  athletesInvolved?: Array<{ id: string; displayName: string }>
  scoringPlay?: boolean
  penaltyKick?: boolean
  ownGoal?: boolean
  yellowCard?: boolean
  redCard?: boolean
  substitution?: boolean
}

interface EspnBoxTeam {
  team?: { id: string; abbreviation?: string }
  statistics?: Array<{ name: string; displayValue: string }>
}

interface EspnRosterEntry {
  athlete?: { id: string; displayName: string; jersey?: string; headshot?: { href: string }; position?: { displayName: string; abbreviation: string } }
  starter?: boolean
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
  boxscore?: { teams?: EspnBoxTeam[] }
  rosters?: EspnRoster[]
  officials?: EspnOfficial[]
  commentary?: Array<{
    sequence?: number
    time?: { displayValue?: string }
    text?: string
  }>
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMinute(clock?: EspnClock): { display: string; value: number } {
  if (!clock) return { display: '', value: 0 }
  const dv = String(clock.displayValue ?? clock.value ?? '')
  if (dv.includes("'")) return { display: dv, value: parseInt(dv) || 0 }
  if (dv.includes(':')) {
    const min = parseInt(dv)
    return { display: `${min}'`, value: min }
  }
  const min = parseInt(dv) || clock.value || 0
  return { display: `${min}'`, value: min }
}

function teamAbbr(t?: { id: string; abbreviation?: string }): string {
  return t?.abbreviation ?? t?.id ?? ''
}

function parseEvents(details: EspnDetailEntry[], homeId: string): MatchEvent[] {
  const events: MatchEvent[] = []
  for (const d of details) {
    const text = d.type?.text?.toLowerCase() ?? ''
    const { display, value } = formatMinute(d.clock)
    const abbr = teamAbbr(d.team) || homeId
    const athletes = d.athletesInvolved ?? []
    const primary = athletes[0]?.displayName ?? ''
    const secondary = athletes[1]?.displayName

    if (text === 'goal' || d.scoringPlay) {
      const type: MatchEvent['type'] =
        d.ownGoal ? 'owngoal' : d.penaltyKick ? 'penalty' : 'goal'
      events.push({ type, minuteDisplay: display, minute: value, teamId: abbr, primaryPlayer: primary, secondaryPlayer: secondary })
    } else if (text.includes('missed penalty') || text.includes('penalty - miss')) {
      events.push({ type: 'missed_penalty', minuteDisplay: display, minute: value, teamId: abbr, primaryPlayer: primary })
    } else if (text.includes('yellow-red') || text.includes('second yellow')) {
      events.push({ type: 'yellowred', minuteDisplay: display, minute: value, teamId: abbr, primaryPlayer: primary })
    } else if (text.includes('yellow') || d.yellowCard) {
      events.push({ type: 'yellow', minuteDisplay: display, minute: value, teamId: abbr, primaryPlayer: primary })
    } else if (text.includes('red') || d.redCard) {
      events.push({ type: 'red', minuteDisplay: display, minute: value, teamId: abbr, primaryPlayer: primary })
    } else if (text.includes('substitution') || d.substitution) {
      events.push({ type: 'sub', minuteDisplay: display, minute: value, teamId: abbr, primaryPlayer: primary, secondaryPlayer: secondary })
    }
  }
  return events.sort((a, b) => a.minute - b.minute)
}

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
  const toPlayer = (r: EspnRosterEntry): RosterPlayer => ({
    name: r.athlete?.displayName ?? '',
    jersey: r.athlete?.jersey,
    position: r.athlete?.position?.abbreviation ?? r.athlete?.position?.displayName ?? r.position?.abbreviation ?? r.position?.displayName,
    headshot: r.athlete?.headshot?.href,
    formationPlace: r.formationPlace,
  })
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

function parseEventsFromCommentary(
  commentary: NonNullable<EspnSummary['commentary']>,
  homeId: string,
  awayId: string,
): MatchEvent[] {
  const events: MatchEvent[] = []
  for (const c of commentary) {
    const text = c.text ?? ''
    const timeStr = c.time?.displayValue ?? ''
    const min = parseInt(timeStr) || 0
    const display = timeStr.includes("'") ? timeStr : `${min}'`

    const goalMatch = text.match(/^Goal!\s+(\S+)\s+(\d+),\s+(\S+)\s+(\d+)\.\s+(.+?)\s+\((\d+)'?\)/i)
    if (goalMatch) {
      const scoringTeamName = goalMatch[1]
      const playerName = goalMatch[5]
      const minute = parseInt(goalMatch[6]) || min
      const isOwn = COMMENTARY_OWN_GOAL_RE.test(text)
      // Match scoring team name against known abbreviations
      const teamId = scoringTeamName.toUpperCase() === homeId.toUpperCase() ? homeId : awayId
      events.push({ type: isOwn ? 'owngoal' : 'goal', minuteDisplay: `${minute}'`, minute, teamId, primaryPlayer: playerName })
      continue
    }

    const yellowMatch = text.match(/^Yellow card[^.]*\.\s*(.+?)\s+\((\d+)'?\)/i)
    if (yellowMatch) {
      const minute = parseInt(yellowMatch[2]) || min
      events.push({ type: 'yellow', minuteDisplay: `${minute}'`, minute, teamId: homeId, primaryPlayer: yellowMatch[1].trim() })
      continue
    }

    const redMatch = text.match(/^Red card[^.]*\.\s*(.+?)\s+\((\d+)'?\)/i)
    if (redMatch) {
      const minute = parseInt(redMatch[2]) || min
      events.push({ type: 'red', minuteDisplay: `${minute}'`, minute, teamId: homeId, primaryPlayer: redMatch[1].trim() })
      continue
    }
  }
  return events.sort((a, b) => a.minute - b.minute)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const res = await fetch(`${SUMMARY}?event=${id}`, {
      next: { revalidate: 30 },
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
    const events = details.length > 0
      ? parseEvents(details, homeId)
      : parseEventsFromCommentary(data.commentary ?? [], homeId, awayId)
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

    const result: MatchDetail = {
      id,
      homeTeamId: homeId,
      awayTeamId: awayId,
      events,
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
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': `s-maxage=${revalidate}, stale-while-revalidate` },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
