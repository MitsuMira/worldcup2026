import type { EnrichedGroup, EnrichedGame } from './types'
import { getMatchStatus } from './utils'

type Standing = EnrichedGroup['standings'][number] & { _liveMovement?: number }

function sortStandings(standings: Standing[]): Standing[] {
  return [...standings].sort((a, b) => {
    const pd = Number(b.pts) - Number(a.pts); if (pd) return pd
    const gdd = (b.gd ?? 0) - (a.gd ?? 0); if (gdd) return gdd
    const gfd = Number(b.gf) - Number(a.gf); if (gfd) return gfd
    return 0
  })
}

/**
 * Returns a copy of `groups` with live group-stage games applied as if finished.
 * Standings entries get a `_liveMovement` field: positive = moved up, negative = moved down.
 * Also returns the set of group letters that have live simulation applied.
 */
export function simulateLiveStandings(
  groups: EnrichedGroup[],
  games: EnrichedGame[],
): { groups: EnrichedGroup[]; liveGroupLetters: Set<string> } {
  const liveGroupGames = games.filter(
    g => g.type === 'group' && g.group && getMatchStatus(g) === 'live',
  )

  if (liveGroupGames.length === 0) {
    return { groups, liveGroupLetters: new Set() }
  }

  const liveGroupLetters = new Set(liveGroupGames.map(g => g.group))

  const newGroups = groups.map(group => {
    const letter = group.group || group.standings.find(s => s.team?.groups)?.team?.groups || ''
    if (!liveGroupLetters.has(letter)) return group

    const liveInGroup = liveGroupGames.filter(g => g.group === letter)

    // Record original positions before simulation
    const originalPos = new Map<string, number>()
    group.standings.forEach((s, i) => originalPos.set(s.team_id, i))

    // Deep-clone standings
    const standings: Standing[] = group.standings.map(s => ({ ...s }))

    for (const game of liveInGroup) {
      const hs = Number(game.home_score) || 0
      const as_ = Number(game.away_score) || 0

      const home = standings.find(s => s.team_id === game.home_team_id)
      const away = standings.find(s => s.team_id === game.away_team_id)
      if (!home || !away) continue

      const homeWin = hs > as_
      const awayWin = as_ > hs
      const draw = hs === as_

      home.pts = String(Number(home.pts) + (homeWin ? 3 : draw ? 1 : 0))
      home.gf = String(Number(home.gf) + hs)
      home.ga = String(Number(home.ga) + as_)
      home.gd = (home.gd ?? 0) + (hs - as_)
      home.played = (home.played ?? 0) + 1
      if (homeWin) home.w = (home.w ?? 0) + 1
      else if (draw) home.d = (home.d ?? 0) + 1
      else home.l = (home.l ?? 0) + 1

      away.pts = String(Number(away.pts) + (awayWin ? 3 : draw ? 1 : 0))
      away.gf = String(Number(away.gf) + as_)
      away.ga = String(Number(away.ga) + hs)
      away.gd = (away.gd ?? 0) + (as_ - hs)
      away.played = (away.played ?? 0) + 1
      if (awayWin) away.w = (away.w ?? 0) + 1
      else if (draw) away.d = (away.d ?? 0) + 1
      else away.l = (away.l ?? 0) + 1
    }

    const sorted = sortStandings(standings)

    // Annotate movement: positive = moved up (lower index now), negative = moved down
    sorted.forEach((s, newIdx) => {
      const oldIdx = originalPos.get(s.team_id)
      s._liveMovement = oldIdx !== undefined ? oldIdx - newIdx : 0
    })

    return { ...group, standings: sorted }
  })

  return { groups: newGroups, liveGroupLetters }
}
