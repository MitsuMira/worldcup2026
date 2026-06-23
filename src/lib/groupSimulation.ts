/**
 * Brute-force group elimination checker.
 * For each combination of outcomes for remaining games, ranks all teams using
 * the full FIFA tiebreaker chain and checks if the team can reach a given position.
 */
import type { EnrichedGroup, EnrichedGame } from './types'
import { FIFA_RANK } from './fifaRanking'

interface GameRecord {
  homeId: string
  awayId: string
  homeScore: number
  awayScore: number
}

interface Stats {
  pts: number; gf: number; ga: number; gd: number
  w: number; d: number; l: number; played: number
}

function emptyStats(): Stats {
  return { pts: 0, gf: 0, ga: 0, gd: 0, w: 0, d: 0, l: 0, played: 0 }
}

function applyGame(stats: Map<string, Stats>, g: GameRecord) {
  const home = stats.get(g.homeId)
  const away = stats.get(g.awayId)
  if (!home || !away) return
  home.gf += g.homeScore; home.ga += g.awayScore; home.gd += g.homeScore - g.awayScore; home.played++
  away.gf += g.awayScore; away.ga += g.homeScore; away.gd += g.awayScore - g.homeScore; away.played++
  if (g.homeScore > g.awayScore)       { home.pts += 3; home.w++; away.l++ }
  else if (g.homeScore === g.awayScore) { home.pts++; home.d++; away.pts++; away.d++ }
  else                                  { away.pts += 3; away.w++; home.l++ }
}

/** Rank teams using full FIFA group-stage tiebreaker chain. */
function rankTeams(teamIds: string[], allGames: GameRecord[]): string[] {
  // Compute overall stats
  const stats = new Map<string, Stats>()
  for (const id of teamIds) stats.set(id, emptyStats())
  for (const g of allGames) applyGame(stats, g)

  // Two-pass sort: first by pts, then within tied groups by H2H → GD → GF → FIFA rank
  // Group teams that share the same overall pts
  const byPts = new Map<number, string[]>()
  for (const id of teamIds) {
    const p = stats.get(id)!.pts
    if (!byPts.has(p)) byPts.set(p, [])
    byPts.get(p)!.push(id)
  }

  const result: string[] = []
  const ptsSorted = [...byPts.keys()].sort((a, b) => b - a)

  for (const pts of ptsSorted) {
    const tied = byPts.get(pts)!
    if (tied.length === 1) { result.push(tied[0]); continue }

    // H2H stats among only the tied teams
    const h2hStats = new Map<string, Stats>()
    for (const id of tied) h2hStats.set(id, emptyStats())
    const h2hGames = allGames.filter(g => tied.includes(g.homeId) && tied.includes(g.awayId))
    for (const g of h2hGames) applyGame(h2hStats, g)

    // Sort tied group
    const tiedSorted = [...tied].sort((a, b) => {
      const ha = h2hStats.get(a)!, hb = h2hStats.get(b)!
      const sa = stats.get(a)!,    sb = stats.get(b)!
      // 2a. H2H pts
      if (hb.pts !== ha.pts) return hb.pts - ha.pts
      // 2b. H2H GD
      if (hb.gd !== ha.gd) return hb.gd - ha.gd
      // 2c. H2H GF
      if (hb.gf !== ha.gf) return hb.gf - ha.gf
      // 3. Overall GD
      if (sb.gd !== sa.gd) return sb.gd - sa.gd
      // 4. Overall GF
      if (sb.gf !== sa.gf) return sb.gf - sa.gf
      // 5. FIFA ranking (lower = better)
      return (FIFA_RANK[a] ?? 999) - (FIFA_RANK[b] ?? 999)
    })
    result.push(...tiedSorted)
  }
  return result
}

// Possible scores for each hypothetical game outcome
const OUTCOMES: [number, number][] = [[1, 0], [0, 0], [0, 1]]

/**
 * Returns true if there exists ANY combination of remaining game outcomes
 * in which `teamId` finishes at position `targetPos` (0-based) or better.
 */
export function canTeamReachPosition(
  group: EnrichedGroup,
  teamId: string,
  targetPos: number,
  groupGames: EnrichedGame[],
): boolean {
  const teamIds = group.standings.map(s => s.team_id)
  if (!teamIds.includes(teamId)) return false

  const finishedGames: GameRecord[] = groupGames
    .filter(g => g.finished === 'TRUE')
    .map(g => ({
      homeId: g.home_team_id, awayId: g.away_team_id,
      homeScore: parseInt(g.home_score) || 0,
      awayScore: parseInt(g.away_score) || 0,
    }))

  // Include live (in-progress) games as remaining — their outcome is still uncertain
  const remaining = groupGames
    .filter(g => g.finished !== 'TRUE')
    .map(g => ({ homeId: g.home_team_id, awayId: g.away_team_id }))

  // Fast path: no remaining games, just check current position
  if (remaining.length === 0) {
    const ranked = rankTeams(teamIds, finishedGames)
    return ranked.indexOf(teamId) <= targetPos
  }

  // Brute force: try all combinations (3^N, N ≤ 4 → max 81 iterations)
  function tryFrom(idx: number, extra: GameRecord[]): boolean {
    if (idx === remaining.length) {
      const ranked = rankTeams(teamIds, [...finishedGames, ...extra])
      return ranked.indexOf(teamId) !== -1 && ranked.indexOf(teamId) <= targetPos
    }
    const g = remaining[idx]
    for (const [h, a] of OUTCOMES) {
      if (tryFrom(idx + 1, [...extra, { homeId: g.homeId, awayId: g.awayId, homeScore: h, awayScore: a }])) {
        return true
      }
    }
    return false
  }

  return tryFrom(0, [])
}

/**
 * Returns true if the team is GUARANTEED to finish in top `targetPos` (0-based)
 * in ALL possible remaining game combinations — i.e. mathematically confirmed qualified.
 */
export function isTeamConfirmedInTop(
  group: EnrichedGroup,
  teamId: string,
  targetPos: number,
  groupGames: EnrichedGame[],
): boolean {
  const teamIds = group.standings.map(s => s.team_id)
  if (!teamIds.includes(teamId)) return false

  const finishedGames: GameRecord[] = groupGames
    .filter(g => g.finished === 'TRUE')
    .map(g => ({
      homeId: g.home_team_id, awayId: g.away_team_id,
      homeScore: parseInt(g.home_score) || 0,
      awayScore: parseInt(g.away_score) || 0,
    }))

  // Include live (in-progress) games as remaining — their outcome is still uncertain
  const remaining = groupGames
    .filter(g => g.finished !== 'TRUE')
    .map(g => ({ homeId: g.home_team_id, awayId: g.away_team_id }))

  if (remaining.length === 0) {
    const ranked = rankTeams(teamIds, finishedGames)
    return ranked.indexOf(teamId) <= targetPos
  }

  // Returns true only if EVERY combination keeps the team at <= targetPos
  function allFrom(idx: number, extra: GameRecord[]): boolean {
    if (idx === remaining.length) {
      const ranked = rankTeams(teamIds, [...finishedGames, ...extra])
      return ranked.indexOf(teamId) !== -1 && ranked.indexOf(teamId) <= targetPos
    }
    const g = remaining[idx]
    for (const [h, a] of OUTCOMES) {
      if (!allFrom(idx + 1, [...extra, { homeId: g.homeId, awayId: g.awayId, homeScore: h, awayScore: a }])) {
        return false
      }
    }
    return true
  }

  return allFrom(0, [])
}
