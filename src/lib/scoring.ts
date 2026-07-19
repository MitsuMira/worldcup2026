import type { EnrichedGame, Prediction } from './types'
import type { KvMember } from './kv'
import { getPredictionResult, getKnockoutPredictionPoints, isKnockoutGame } from './utils'

export function gameCountsForScoring(game: EnrichedGame, allMembers: KvMember[], minParticipation: number): boolean {
  if (minParticipation === 0 || allMembers.length === 0) return true
  const predictors = allMembers.filter(m => m.predictions[game.id]).length
  return (predictors / allMembers.length) * 100 >= minParticipation
}

export interface GamePoints { pts: number; exact: boolean; partial: boolean }

// Points a single member earned for a single game — the per-match breakdown shown
// in the group's "Matches" tab and each member's expanded prediction list.
export function getGamePoints(pred: Prediction, game: EnrichedGame): GamePoints {
  if (isKnockoutGame(game)) {
    const { pts, exact } = getKnockoutPredictionPoints(pred, game)
    return { pts, exact, partial: !exact && pts > 0 }
  }
  const result = getPredictionResult(
    { ...pred, homeScore: Number(pred.homeScore), awayScore: Number(pred.awayScore) } as Prediction,
    game,
  )
  if (result === 'correct') return { pts: 3, exact: true, partial: false }
  if (result === 'correct-winner') return { pts: 1, exact: false, partial: true }
  return { pts: 0, exact: false, partial: false }
}

export function calcPoints(member: KvMember, games: EnrichedGame[], allMembers: KvMember[], minParticipation: number) {
  let pts = 0, exact = 0, winner = 0
  for (const game of games) {
    if (!gameCountsForScoring(game, allMembers, minParticipation)) continue
    const pred = member.predictions[game.id] as Prediction | undefined
    if (!pred) continue
    const g = getGamePoints(pred, game)
    pts += g.pts
    if (g.exact) exact++
    else if (g.partial) winner++
  }
  return { pts, exact, winner }
}
