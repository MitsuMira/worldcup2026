'use client'

import useSWR from 'swr'
import { useState, useEffect, useCallback } from 'react'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame } from '@/lib/types'
import type { Prediction, PredictionResult } from '@/lib/types'
import { getMatchStatus, getStageLabel, getPredictionResult, getTeamName, formatMatchDateTime } from '@/lib/utils'
import { Loader2, CheckCircle2, XCircle, Minus, Trophy } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const STORAGE_KEY = 'wc2026_predictions'

function loadPredictions(): Record<string, Prediction> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function savePredictions(preds: Record<string, Prediction>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preds))
}

const resultLabels: Record<PredictionResult, string> = {
  correct: '✓ Exact score!',
  'correct-winner': '~ Correct winner',
  wrong: '✗ Wrong',
  pending: 'Pending',
}

const resultPoints: Record<PredictionResult, number> = {
  correct: 3,
  'correct-winner': 1,
  wrong: 0,
  pending: 0,
}

export default function PredictionsPage() {
  const { data, isLoading, error } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, {
    refreshInterval: 60_000,
  })
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [tab, setTab] = useState<'predict' | 'results'>('predict')

  // Load predictions from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setPredictions(loadPredictions())
  }, [])

  const games = data?.games ?? []
  const scheduledGames = games.filter((g) => getMatchStatus(g) === 'scheduled')
  const finishedGames = games.filter((g) => getMatchStatus(g) === 'finished')

  const submit = useCallback(
    (game: EnrichedGame) => {
      const inp = inputs[game.id]
      if (!inp) return
      const h = parseInt(inp.home)
      const a = parseInt(inp.away)
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return

      const pred: Prediction = {
        matchId: game.id,
        homeTeamName: getTeamName(game, 'home'),
        awayTeamName: getTeamName(game, 'away'),
        homeTeamFlag: game.homeTeam?.flag ?? '',
        awayTeamFlag: game.awayTeam?.flag ?? '',
        homeScore: h,
        awayScore: a,
        createdAt: new Date().toISOString(),
      }
      const updated = { ...predictions, [game.id]: pred }
      setPredictions(updated)
      savePredictions(updated)
      setInputs((prev) => {
        const next = { ...prev }
        delete next[game.id]
        return next
      })
    },
    [inputs, predictions],
  )

  const clearPrediction = (matchId: string) => {
    const updated = { ...predictions }
    delete updated[matchId]
    setPredictions(updated)
    savePredictions(updated)
  }

  // Score calculation
  const finishedPredictions = finishedGames
    .filter((g) => predictions[g.id])
    .map((g) => ({ game: g, pred: predictions[g.id], result: getPredictionResult(predictions[g.id], g) }))

  const totalPoints = finishedPredictions.reduce((sum, { result }) => sum + resultPoints[result], 0)
  const maxPoints = finishedPredictions.length * 3
  const pendingCount = Object.keys(predictions).filter((id) => {
    const g = games.find((g) => g.id === id)
    return g && getMatchStatus(g) === 'scheduled'
  }).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Predictions</h1>
        <p className="text-slate-400 text-sm">Predict match scores · Stored locally in your browser</p>
      </div>

      {/* Stats bar */}
      {(finishedPredictions.length > 0 || pendingCount > 0) && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-amber-400">{totalPoints}</div>
            <div className="text-xs text-slate-500 mt-1">Points</div>
            {maxPoints > 0 && (
              <div className="text-xs text-slate-600">of {maxPoints} max</div>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-green-400">
              {finishedPredictions.filter((p) => p.result === 'correct').length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Exact Scores</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-blue-400">{pendingCount}</div>
            <div className="text-xs text-slate-500 mt-1">Pending</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6 w-fit">
        {(['predict', 'results'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'predict' ? `Predict (${scheduledGames.length})` : `Results (${finishedPredictions.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">
          Failed to load games.
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-12">
          <Loader2 size={20} className="animate-spin" />
          Loading…
        </div>
      )}

      {/* Predict tab */}
      {tab === 'predict' && !isLoading && (
        <div className="space-y-3">
          {scheduledGames.length === 0 && (
            <div className="text-slate-500 text-center py-12">No upcoming matches to predict.</div>
          )}
          {scheduledGames.map((game) => {
            const existing = predictions[game.id]
            const inp = inputs[game.id] ?? { home: '', away: '' }

            return (
              <div
                key={game.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">{getStageLabel(game)}</span>
                  <span className="text-xs text-blue-400">{formatMatchDateTime(game.local_date)}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Home */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamFlag team={game.homeTeam} name={getTeamName(game, 'home')} size="sm" />
                    <span className="text-sm font-medium text-white truncate">
                      {getTeamName(game, 'home')}
                    </span>
                  </div>

                  {/* Score inputs */}
                  {existing ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-2xl font-black text-amber-400 w-8 text-center">{existing.homeScore}</span>
                      <span className="text-slate-600">–</span>
                      <span className="text-2xl font-black text-amber-400 w-8 text-center">{existing.awayScore}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={inp.home}
                        onChange={(e) =>
                          setInputs((prev) => ({ ...prev, [game.id]: { ...inp, home: e.target.value } }))
                        }
                        className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold py-1.5 focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                      <span className="text-slate-600 text-sm">–</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={inp.away}
                        onChange={(e) =>
                          setInputs((prev) => ({ ...prev, [game.id]: { ...inp, away: e.target.value } }))
                        }
                        className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold py-1.5 focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                  )}

                  {/* Away */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-medium text-white truncate">
                      {getTeamName(game, 'away')}
                    </span>
                    <TeamFlag team={game.awayTeam} name={getTeamName(game, 'away')} size="sm" />
                  </div>
                </div>

                {/* Action */}
                <div className="mt-3 flex justify-end gap-2">
                  {existing ? (
                    <button
                      onClick={() => clearPrediction(game.id)}
                      className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                      Clear prediction
                    </button>
                  ) : (
                    <button
                      onClick={() => submit(game)}
                      disabled={!inp.home || !inp.away}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold text-sm rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Results tab */}
      {tab === 'results' && !isLoading && (
        <div className="space-y-3">
          {finishedPredictions.length === 0 && (
            <div className="text-slate-500 text-center py-12">
              {Object.keys(predictions).length === 0
                ? 'No predictions made yet. Start predicting upcoming matches!'
                : 'Waiting for your predicted matches to finish.'}
            </div>
          )}
          {finishedPredictions.map(({ game, pred, result }) => (
            <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wide">{getStageLabel(game)}</span>
                <ResultBadge result={result} />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TeamFlag team={game.homeTeam} name={getTeamName(game, 'home')} size="sm" />
                  <span className="text-sm font-medium text-white truncate">{getTeamName(game, 'home')}</span>
                </div>
                <div className="text-center flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-lg font-black text-white">{game.home_score} – {game.away_score}</div>
                      <div className="text-xs text-slate-500">Actual</div>
                    </div>
                    <div className="text-slate-700">|</div>
                    <div className="text-center">
                      <div className="text-lg font-black text-amber-400">{pred.homeScore} – {pred.awayScore}</div>
                      <div className="text-xs text-slate-500">Your pick</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-medium text-white truncate">{getTeamName(game, 'away')}</span>
                  <TeamFlag team={game.awayTeam} name={getTeamName(game, 'away')} size="sm" />
                </div>
              </div>
            </div>
          ))}

          {/* Points explanation */}
          {finishedPredictions.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mt-6 text-xs text-slate-500">
              <p className="font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Trophy size={12} /> Scoring
              </p>
              <p>Exact score: 3 pts · Correct winner/draw: 1 pt · Wrong: 0 pts</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultBadge({ result }: { result: PredictionResult }) {
  if (result === 'correct') return (
    <span className="flex items-center gap-1 text-xs font-bold text-green-400">
      <CheckCircle2 size={13} /> Exact score! +3
    </span>
  )
  if (result === 'correct-winner') return (
    <span className="flex items-center gap-1 text-xs font-bold text-blue-400">
      <CheckCircle2 size={13} /> Correct winner +1
    </span>
  )
  if (result === 'wrong') return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-400">
      <XCircle size={13} /> Wrong
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500">
      <Minus size={13} /> {resultLabels[result]}
    </span>
  )
}
