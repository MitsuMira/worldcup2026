import { NextResponse } from 'next/server'
import type { MatchDetail, MatchEvent, TeamMatchStats, TeamLineup, RosterPlayer, H2HGame, CommentaryEntry, MatchLeader, MatchLeaders } from '@/lib/types'

const SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary'

// ── Commentary-based event parsing (fallback when details[] is empty) ─────────

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

interface EspnKeyEvent {
  type?: { id: string; text: string; type: string }
  clock?: EspnClock
  team?: { id: string; displayName?: string; abbreviation?: string }
  participants?: Array<{ athlete?: { id: string; displayName: string } }>
  scoringPlay?: boolean
  penaltyKick?: boolean
  ownGoal?: boolean
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
  commentary?: Array<{
    sequence?: number
    time?: { displayValue?: string }
    text?: string
    play?: { id?: string; type?: { type?: string } }
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

    // Shootout kicks have clock=0; detect them to show 'PEN' instead of "0'"
    const isShootout = d.penaltyKick === true && value <= 1
    const minVal = isShootout ? 121 : value
    const minDisplay = isShootout ? 'PEN' : display

    if (text === 'goal' || d.scoringPlay) {
      const type: MatchEvent['type'] =
        d.ownGoal ? 'owngoal' : d.penaltyKick ? 'penalty' : 'goal'
      events.push({ type, minuteDisplay: minDisplay, minute: minVal, teamId: abbr, primaryPlayer: primary, secondaryPlayer: secondary })
    } else if (text.includes('missed penalty') || text.includes('penalty - miss') || (d.penaltyKick && !d.scoringPlay)) {
      events.push({ type: 'missed_penalty', minuteDisplay: minDisplay, minute: minVal, teamId: abbr, primaryPlayer: primary })
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

function parseEventsFromCommentary(
  commentary: NonNullable<EspnSummary['commentary']>,
  homeId: string,
  awayId: string,
  homeName: string,
  awayName: string,
): MatchEvent[] {
  const events: MatchEvent[] = []
  const homeNameLower = homeName.toLowerCase()
  const awayNameLower = awayName.toLowerCase()

  const resolveTeam = (teamNameInText: string): string => {
    const t = teamNameInText.trim().toLowerCase()
    if (homeNameLower.startsWith(t) || t.startsWith(homeNameLower.split(' ')[0])) return homeId
    if (awayNameLower.startsWith(t) || t.startsWith(awayNameLower.split(' ')[0])) return awayId
    return homeId
  }

  for (const c of commentary) {
    const text = c.text ?? ''
    const timeStr = c.time?.displayValue ?? ''
    const min = parseInt(timeStr) || 0

    // "Goal! Mexico 1, South Africa 0. Julián Quiñones (9')"
    // lazy (.+?) stops at first \s+\d+, even for multi-word team names
    const goalMatch = text.match(/^Goal!\s+(.+?)\s+\d+,\s+.+?\s+\d+\.\s+(.+?)\s+\((\d+)\+?'?\)/i)
    if (goalMatch) {
      const teamId = resolveTeam(goalMatch[1])
      const player = goalMatch[2].trim()
      const minute = parseInt(goalMatch[3]) || min
      const isOwn = /own\s*goal/i.test(text)
      events.push({ type: isOwn ? 'owngoal' : 'goal', minuteDisplay: `${minute}'`, minute, teamId, primaryPlayer: player })
      continue
    }

    // "Yellow Card. Player Name (23')"  or  "Booking. Player Name (23')"
    const yellowMatch = text.match(/^(?:Yellow\s+Card|Booking)[^.]*\.\s*(.+?)\s+\((\d+)\+?'?\)/i)
    if (yellowMatch) {
      const minute = parseInt(yellowMatch[2]) || min
      // Try to find which team from next text segment — default homeId as fallback
      events.push({ type: 'yellow', minuteDisplay: `${minute}'`, minute, teamId: homeId, primaryPlayer: yellowMatch[1].trim() })
      continue
    }

    // "Red Card. Player Name (67')"
    const redMatch = text.match(/^Red\s+Card[^.]*\.\s*(.+?)\s+\((\d+)\+?'?\)/i)
    if (redMatch) {
      const minute = parseInt(redMatch[2]) || min
      events.push({ type: 'red', minuteDisplay: `${minute}'`, minute, teamId: homeId, primaryPlayer: redMatch[1].trim() })
      continue
    }

    // "Second Yellow Card. Player Name (78')"
    const secondYellowMatch = text.match(/^Second\s+Yellow[^.]*\.\s*(.+?)\s+\((\d+)\+?'?\)/i)
    if (secondYellowMatch) {
      const minute = parseInt(secondYellowMatch[2]) || min
      events.push({ type: 'yellowred', minuteDisplay: `${minute}'`, minute, teamId: homeId, primaryPlayer: secondYellowMatch[1].trim() })
      continue
    }

    // "Substitution. Team. PlayerOn replaces PlayerOff (min')"
    const subMatch = text.match(/^Substitution[^.]*\.\s*(?:(.+?)\.\s*)?(.+?)\s+replaces\s+(.+?)\s+\((\d+)\+?'?\)/i)
    if (subMatch) {
      const teamId = subMatch[1] ? resolveTeam(subMatch[1]) : homeId
      const minute = parseInt(subMatch[4]) || min
      events.push({ type: 'sub', minuteDisplay: `${minute}'`, minute, teamId, primaryPlayer: subMatch[3].trim(), secondaryPlayer: subMatch[2].trim() })
    }
  }
  return events.sort((a, b) => a.minute - b.minute)
}

function parseKeyEvents(
  keyEvents: EspnKeyEvent[],
  homeEspnId: string,
  awayEspnId: string,
  homeId: string,
  awayId: string,
): MatchEvent[] {
  const events: MatchEvent[] = []
  for (const ev of keyEvents) {
    const { display, value } = formatMinute(ev.clock)
    const espnTeamId = ev.team?.id ?? ''
    const teamId = espnTeamId === homeEspnId ? homeId : espnTeamId === awayEspnId ? awayId : homeId
    const participants = ev.participants ?? []
    const primary = participants[0]?.athlete?.displayName ?? ''
    const secondary = participants[1]?.athlete?.displayName

    const typeStr = ev.type?.type?.toLowerCase() ?? ''
    const isShootout = ev.penaltyKick === true && value <= 1
    const minVal = isShootout ? 121 : value
    const minDisplay = isShootout ? 'PEN' : display

    if (typeStr === 'goal' || ev.scoringPlay) {
      const type: MatchEvent['type'] = ev.ownGoal ? 'owngoal' : ev.penaltyKick ? 'penalty' : 'goal'
      events.push({ type, minuteDisplay: minDisplay, minute: minVal, teamId, primaryPlayer: primary, secondaryPlayer: secondary })
    } else if (typeStr === 'yellow-red-card' || typeStr === 'second-yellow-card') {
      events.push({ type: 'yellowred', minuteDisplay: display, minute: value, teamId, primaryPlayer: primary })
    } else if (typeStr === 'yellow-card') {
      events.push({ type: 'yellow', minuteDisplay: display, minute: value, teamId, primaryPlayer: primary })
    } else if (typeStr === 'red-card') {
      events.push({ type: 'red', minuteDisplay: display, minute: value, teamId, primaryPlayer: primary })
    } else if (typeStr === 'substitution') {
      events.push({ type: 'sub', minuteDisplay: display, minute: value, teamId, primaryPlayer: primary, secondaryPlayer: secondary })
    } else if (typeStr === 'missed-penalty' || typeStr === 'penalty-miss' || typeStr === 'penalty-kick' || (ev.penaltyKick && !ev.scoringPlay)) {
      events.push({ type: 'missed_penalty', minuteDisplay: minDisplay, minute: minVal, teamId, primaryPlayer: primary })
    }
  }
  return events.sort((a, b) => a.minute - b.minute)
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

  const resolveTeam = (name: string): string => {
    const n = name.trim().toLowerCase()
    if (homeWords.some(w => n.includes(w))) return homeId
    if (awayWords.some(w => n.includes(w))) return awayId
    return homeId
  }

  for (const c of commentary) {
    const text = c.text ?? ''
    const minVal = parseInt(c.time?.displayValue ?? '0') || 0

    // Shootout goal: "Goal! TeamA 1(3), TeamB 1(4). Player (Team) converts..."
    // Early kicks: only one team has a pen score yet — "Goal! Germany 1, Paraguay 1(1). Player..."
    //   → "(1)" is followed by "." ✓  matches \)\.
    // But home-team first kick: "Goal! Netherlands 1(1), Morocco 0. Player (Netherlands)..."
    //   → "(1)" is followed by "," NOT "." — old regex failed here.
    // Fix: also match digit+period before the player name: (?:\d+|\))\.\s+Player (Team)
    if (/^Goal!/i.test(text) && /\(\d+\)/.test(text)) {
      const m = text.match(/(?:\d+|\))\.\s+(.+?)\s+\(([^)]+)\)/)
      if (m) {
        events.push({ type: 'penalty', minuteDisplay: 'PEN', minute: 121, teamId: resolveTeam(m[2]), primaryPlayer: m[1].trim() })
      }
      continue
    }

    // Shootout miss/save: "Penalty missed. Player (Team)..." or "Penalty saved. Player (Team)..."
    // Guard: minute ≥ 120 (post-ET) OR minute === 0 (ESPN sometimes labels PK kicks with
    // a non-numeric time like "PK" or "Pen" which parseInt converts to 0)
    if (/^Penalty\s+(missed|saved)\./i.test(text) && (minVal >= 120 || minVal === 0)) {
      const m = text.match(/^Penalty\s+(?:missed|saved)\.\s+(.+?)\s+\(([^)]+)\)/i)
      if (m) {
        events.push({ type: 'missed_penalty', minuteDisplay: 'PEN', minute: 121, teamId: resolveTeam(m[2]), primaryPlayer: m[1].trim() })
      }
    }
  }

  // ESPN returns commentary newest-first; reverse to chronological order
  return events.reverse()
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const res = await fetch(`${SUMMARY}?event=${id}`, {
      cache: 'no-store',
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
