'use client'

import useSWR from 'swr'
import { useState, useEffect, useCallback } from 'react'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame, Prediction, PredictionResult } from '@/lib/types'
import { getMatchStatus, getPredictionResult, getTeamName, formatMatchDateTime, canPredict, minutesUntilLock, formatLockCountdown } from '@/lib/utils'
import { localStageLabel } from '@/lib/i18n'
import { useT } from '@/contexts/LanguageContext'
import { Loader2, CheckCircle2, XCircle, Minus, Trophy } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const STORAGE_KEY = 'wc2026_predictions'

function loadPredictions(): Record<string, Prediction> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function savePredictions(p: Record<string, Prediction>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

const resultPoints: Record<PredictionResult, number> = { correct: 3, 'correct-winner': 1, wrong: 0, pending: 0 }

export default function PredictionsPage() {
  const { t } = useT()
  const { data, isLoading, error } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 60_000 })
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [tab, setTab] = useState<'predict' | 'results'>('predict')

  useEffect(() => { setPredictions(loadPredictions()) }, [])

  const games = data?.games ?? []
  const scheduledGames = games.filter((g) => canPredict(g))
  const finishedGames = games.filter((g) => getMatchStatus(g) === 'finished')

  const submit = useCallback((game: EnrichedGame) => {
    const inp = inputs[game.id]
    if (!inp) return
    const h = parseInt(inp.home), a = parseInt(inp.away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    const pred: Prediction = {
      matchId: game.id,
      homeTeamName: getTeamName(game, 'home'),
      awayTeamName: getTeamName(game, 'away'),
      homeTeamFlag: game.homeTeam?.flag ?? '',
      awayTeamFlag: game.awayTeam?.flag ?? '',
      homeScore: h, awayScore: a,
      createdAt: new Date().toISOString(),
    }
    const updated = { ...predictions, [game.id]: pred }
    setPredictions(updated)
    savePredictions(updated)
    setInputs((prev) => { const next = { ...prev }; delete next[game.id]; return next })
  }, [inputs, predictions])

  const clearPrediction = (matchId: string) => {
    const updated = { ...predictions }
    delete updated[matchId]
    setPredictions(updated)
    savePredictions(updated)
  }

  const finishedPredictions = finishedGames
    .filter((g) => predictions[g.id])
    .map((g) => ({ game: g, pred: predictions[g.id], result: getPredictionResult(predictions[g.id], g) }))

  const totalPoints = finishedPredictions.reduce((s, { result }) => s + resultPoints[result], 0)
  const maxPoints = finishedPredictions.length * 3
  const pendingCount = Object.keys(predictions).filter((id) => {
    const g = games.find((g) => g.id === id)
    return g && canPredict(g)
  }).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">{t.predictions.title}</h1>
        <p className="text-slate-400 text-sm">{t.predictions.subtitle}</p>
      </div>

      {(finishedPredictions.length > 0 || pendingCount > 0) && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-amber-400">{totalPoints}</div>
            <div className="text-xs text-slate-500 mt-1">{t.predictions.points}</div>
            {maxPoints > 0 && <div className="text-xs text-slate-600">of {maxPoints} max</div>}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-green-400">
              {finishedPredictions.filter((p) => p.result === 'correct').length}
            </div>
            <div className="text-xs text-slate-500 mt-1">{t.predictions.exactScores}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-blue-400">{pendingCount}</div>
            <div className="text-xs text-slate-500 mt-1">{t.predictions.pending}</div>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6 w-fit">
        {(['predict', 'results'] as const).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === tb ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {tb === 'predict' ? `${t.predictions.predictTab} (${scheduledGames.length})` : `${t.predictions.resultsTab} (${finishedPredictions.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">{t.errors.predictions}</div>
      )}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-12">
          <Loader2 size={20} className="animate-spin" />{t.loading.generic}
        </div>
      )}

      {tab === 'predict' && !isLoading && (
        <div className="space-y-3">
          {scheduledGames.length === 0 && (
            <div className="text-slate-500 text-center py-12">{t.predictions.noUpcoming}</div>
          )}
          {scheduledGames.map((game) => {
            const existing = predictions[game.id]
            const inp = inputs[game.id] ?? { home: '', away: '' }
            const isLive = getMatchStatus(game) === 'live'
            const minsLeft = minutesUntilLock(game)
            const showLockWarning = minsLeft !== null
            return (
              <div key={game.id} className={`bg-slate-900 border rounded-xl p-4 transition-colors ${showLockWarning ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' : 'border-slate-800 hover:border-slate-700'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">{localStageLabel(game.type, game.group, t)}</span>
                  {showLockWarning ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                      {minsLeft > 0
                        ? `${t.predictions.locksIn} ${isLive ? `${minsLeft}m` : formatLockCountdown(minsLeft)}`
                        : t.predictions.locked}
                    </span>
                  ) : (
                    <span className="text-xs text-blue-400">{formatMatchDateTime(game.local_date)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamFlag team={game.homeTeam} name={getTeamName(game, 'home')} size="sm" />
                    <span className="text-sm font-medium text-white truncate">{getTeamName(game, 'home')}</span>
                  </div>
                  {existing ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-2xl font-black text-amber-400 w-8 text-center">{existing.homeScore}</span>
                      <span className="text-slate-600">–</span>
                      <span className="text-2xl font-black text-amber-400 w-8 text-center">{existing.awayScore}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input type="number" min="0" max="20" value={inp.home}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [game.id]: { ...inp, home: e.target.value } }))}
                        className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold py-1.5 focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                      <span className="text-slate-600 text-sm">–</span>
                      <input type="number" min="0" max="20" value={inp.away}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [game.id]: { ...inp, away: e.target.value } }))}
                        className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold py-1.5 focus:outline-none focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-medium text-white truncate">{getTeamName(game, 'away')}</span>
                    <TeamFlag team={game.awayTeam} name={getTeamName(game, 'away')} size="sm" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  {existing ? (
                    <button onClick={() => clearPrediction(game.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                      {t.predictions.clear}
                    </button>
                  ) : (
                    <button onClick={() => submit(game)} disabled={!inp.home || !inp.away}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold text-sm rounded-lg transition-colors"
                    >
                      {t.predictions.save}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'results' && !isLoading && (
        <div className="space-y-3">
          {finishedPredictions.length === 0 && (
            <div className="text-slate-500 text-center py-12">
              {Object.keys(predictions).length === 0 ? t.predictions.noResults : t.predictions.waitingResults}
            </div>
          )}
          {finishedPredictions.map(({ game, pred, result }) => (
            <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wide">{localStageLabel(game.type, game.group, t)}</span>
                <ResultBadge result={result} t={t} />
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
                      <div className="text-xs text-slate-500">{t.predictions.actual}</div>
                    </div>
                    <div className="text-slate-700">|</div>
                    <div className="text-center">
                      <div className="text-lg font-black text-amber-400">{pred.homeScore} – {pred.awayScore}</div>
                      <div className="text-xs text-slate-500">{t.predictions.yourPick}</div>
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
          {finishedPredictions.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mt-6 text-xs text-slate-500">
              <p className="font-semibold text-slate-400 mb-1 flex items-center gap-1">
                <Trophy size={12} /> {t.predictions.scoringTitle}
              </p>
              <p>{t.predictions.scoringText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import type { Translations } from '@/lib/i18n'

function ResultBadge({ result, t }: { result: PredictionResult; t: Translations }) {
  if (result === 'correct') return (
    <span className="flex items-center gap-1 text-xs font-bold text-green-400">
      <CheckCircle2 size={13} /> {t.predictions.resultCorrect}
    </span>
  )
  if (result === 'correct-winner') return (
    <span className="flex items-center gap-1 text-xs font-bold text-blue-400">
      <CheckCircle2 size={13} /> {t.predictions.resultWinner}
    </span>
  )
  if (result === 'wrong') return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-400">
      <XCircle size={13} /> {t.predictions.resultWrong}
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500">
      <Minus size={13} /> {t.predictions.resultPending}
    </span>
  )
}
