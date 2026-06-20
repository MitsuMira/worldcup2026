import type { EnrichedGame, Prediction } from './types'
import type { KvMember } from './kv'
import { getPredictionResult } from './utils'

export function gameCountsForScoring(game: EnrichedGame, allMembers: KvMember[], minParticipation: number): boolean {
  if (minParticipation === 0 || allMembers.length === 0) return true
  const predictors = allMembers.filter(m => m.predictions[game.id]).length
  return (predictors / allMembers.length) * 100 >= minParticipation
}

export function calcPoints(member: KvMember, games: EnrichedGame[], allMembers: KvMember[], minParticipation: number) {
  let pts = 0, exact = 0, winner = 0
  for (const game of games) {
    if (!gameCountsForScoring(game, allMembers, minParticipation)) continue
    const pred = member.predictions[game.id] as Prediction | undefined
    if (!pred) continue
    const result = getPredictionResult(
      { ...pred, homeScore: Number(pred.homeScore), awayScore: Number(pred.awayScore) } as Prediction,
      game,
    )
    if (result === 'correct') { pts += 3; exact++ }
    else if (result === 'correct-winner') { pts += 1; winner++ }
  }
  return { pts, exact, winner }
}
