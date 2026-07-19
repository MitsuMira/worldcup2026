import 'server-only'
import type { MatchEvent } from './types'

// ── ESPN raw shapes (summary endpoint "details"/"keyEvents"/"commentary" arrays) ──
// Shared between /api/match/[id] (full match detail) and espnClient (regulation-time
// score reconstruction for knockout matches that went to extra time/penalties).

export interface EspnClock { value?: number; displayValue?: string }

export interface EspnDetailEntry {
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

export interface EspnKeyEvent {
  type?: { id: string; text: string; type: string }
  clock?: EspnClock
  team?: { id: string; displayName?: string; abbreviation?: string }
  participants?: Array<{ athlete?: { id: string; displayName: string } }>
  scoringPlay?: boolean
  penaltyKick?: boolean
  ownGoal?: boolean
}

export interface EspnCommentaryEntry {
  sequence?: number
  time?: { displayValue?: string }
  text?: string
  play?: { id?: string; type?: { type?: string } }
}

export function formatMinute(clock?: EspnClock): { display: string; value: number } {
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

export function teamAbbr(t?: { id: string; abbreviation?: string }): string {
  return t?.abbreviation ?? t?.id ?? ''
}

export function parseEvents(details: EspnDetailEntry[], homeId: string): MatchEvent[] {
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

export function parseKeyEvents(
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

export function parseEventsFromCommentary(
  commentary: EspnCommentaryEntry[],
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

export interface RegulationScore { home: number; away: number }

// Reconstructs the score at the end of regulation (90') for a knockout match that went to
// extra time, by summing goal events with minute <= 90. Deliberately fails closed (returns
// null) rather than risk an unverifiable result:
//   - any own goal in the match: own-goal attribution (which team's tally it credits) isn't
//     verified against live ESPN data, so we don't trust the split at all when one is present.
//   - the reconstructed regulation + extra-time tally must add up to the actual final score
//     (finalHome/finalAway, from the authoritative competitor.score field) — if it doesn't,
//     the event data is incomplete/inconsistent and the split isn't trustworthy.
export function computeRegulationScore(
  events: MatchEvent[],
  homeId: string,
  awayId: string,
  finalHome: number,
  finalAway: number,
): RegulationScore | null {
  if (events.length === 0) return null // no data at all — a scoreless 0-0 final would trivially
                                        // "match" an empty tally, so don't trust an empty fetch
  if (events.some(e => e.type === 'owngoal')) return null

  let regHome = 0, regAway = 0, etHome = 0, etAway = 0
  for (const e of events) {
    if (e.type !== 'goal' && e.type !== 'penalty') continue
    if (e.minuteDisplay === 'PEN') continue // shootout kicks, not in-play goals
    const isHome = e.teamId === homeId
    const isAway = e.teamId === awayId
    if (!isHome && !isAway) return null // unresolved team attribution — don't trust the split
    if (e.minute <= 90) { if (isHome) regHome++; else regAway++ }
    else { if (isHome) etHome++; else etAway++ }
  }

  if (regHome + etHome !== finalHome || regAway + etAway !== finalAway) return null
  return { home: regHome, away: regAway }
}
