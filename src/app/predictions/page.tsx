'use client'

import useSWR from 'swr'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame, Prediction, PredictionResult, MatchDetail } from '@/lib/types'
import { getMatchStatus, getPredictionResult, getTeamName, formatMatchDateTime, canPredict, minutesUntilLock, formatLockCountdown, isKnockoutGame, getKnockoutPredictionPoints } from '@/lib/utils'
import { localStageLabel } from '@/lib/i18n'
import { useT } from '@/contexts/LanguageContext'
import { Loader2, CheckCircle2, XCircle, Minus, Trophy, UsersRound } from 'lucide-react'

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
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string; etHome: string; etAway: string; penHome: string; penAway: string }>>({})
  const [tab, setTab] = useState<'predict' | 'results'>('predict')
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set())

  useEffect(() => { setPredictions(loadPredictions()) }, [])

  const games = data?.games ?? []
  const scheduledGames = games.filter((g) => canPredict(g))
  const finishedGames = games.filter((g) => getMatchStatus(g) === 'finished')

  const startEdit = useCallback((game: EnrichedGame) => {
    const existing = predictions[game.id]
    setInputs(prev => ({
      ...prev,
      [game.id]: {
        home: existing ? String(existing.homeScore) : '',
        away: existing ? String(existing.awayScore) : '',
        etHome: existing?.etHomeScore !== undefined ? String(existing.etHomeScore) : '',
        etAway: existing?.etAwayScore !== undefined ? String(existing.etAwayScore) : '',
        penHome: existing?.penHomeScore !== undefined ? String(existing.penHomeScore) : '',
        penAway: existing?.penAwayScore !== undefined ? String(existing.penAwayScore) : '',
      }
    }))
    setEditingIds(prev => new Set([...prev, game.id]))
  }, [predictions])

  const cancelEdit = useCallback((gameId: string) => {
    setEditingIds(prev => { const next = new Set(prev); next.delete(gameId); return next })
    setInputs(prev => { const next = { ...prev }; delete next[gameId]; return next })
  }, [])

  const submit = useCallback((game: EnrichedGame) => {
    const inp = inputs[game.id]
    if (!inp) return
    const h = parseInt(inp.home), a = parseInt(inp.away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    const knockout = isKnockoutGame(game)
    const isDrawReg = knockout && inp.home !== '' && inp.away !== '' && inp.home === inp.away
    const etH = inp.etHome !== '' ? parseInt(inp.etHome) : undefined
    const etA = inp.etAway !== '' ? parseInt(inp.etAway) : undefined
    const isDrawET = isDrawReg && inp.etHome !== '' && inp.etAway !== '' && inp.etHome === inp.etAway
    const penH = inp.penHome !== '' ? parseInt(inp.penHome) : undefined
    const penA = inp.penAway !== '' ? parseInt(inp.penAway) : undefined
    const pred: Prediction = {
      matchId: game.id,
      homeTeamName: getTeamName(game, 'home'),
      awayTeamName: getTeamName(game, 'away'),
      homeTeamFlag: game.homeTeam?.flag ?? '',
      awayTeamFlag: game.awayTeam?.flag ?? '',
      homeScore: h, awayScore: a,
      ...(knockout && etH !== undefined && etA !== undefined ? { etHomeScore: etH, etAwayScore: etA } : {}),
      ...(knockout && isDrawET && penH !== undefined && penA !== undefined ? { penHomeScore: penH, penAwayScore: penA } : {}),
      createdAt: new Date().toISOString(),
    }
    const updated = { ...predictions, [game.id]: pred }
    setPredictions(updated)
    savePredictions(updated)
    setInputs((prev) => { const next = { ...prev }; delete next[game.id]; return next })
    setEditingIds(prev => { const next = new Set(prev); next.delete(game.id); return next })
  }, [inputs, predictions])

  const clearPrediction = useCallback((matchId: string) => {
    const updated = { ...predictions }
    delete updated[matchId]
    setPredictions(updated)
    savePredictions(updated)
    setEditingIds(prev => { const next = new Set(prev); next.delete(matchId); return next })
    setInputs(prev => { const next = { ...prev }; delete next[matchId]; return next })
  }, [predictions])

  const finishedPredictions = finishedGames
    .filter((g) => predictions[g.id])
    .map((g) => {
      const pred = predictions[g.id]
      const result = isKnockoutGame(g) ? 'pending' as const : getPredictionResult(pred, g)
      const knockoutPts = isKnockoutGame(g) ? getKnockoutPredictionPoints(pred, g) : 0
      return { game: g, pred, result, knockoutPts }
    })

  const totalPoints = finishedPredictions.reduce((s, { result, knockoutPts, game }) =>
    s + (isKnockoutGame(game) ? knockoutPts : resultPoints[result]), 0)
  const maxPoints = finishedPredictions.length * 3
  const pendingCount = Object.keys(predictions).filter((id) => {
    const g = games.find((g) => g.id === id)
    return g && canPredict(g)
  }).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">{t.predictions.title}</h1>
          <p className="text-slate-400 text-sm">{t.predictions.subtitle}</p>
        </div>
        <Link href="/groups"
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-white text-sm font-semibold rounded-xl transition-colors shrink-0">
          <UsersRound size={15} className="text-amber-400" />
          Grupos
        </Link>
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
            const isEditing = editingIds.has(game.id)
            const inp = inputs[game.id] ?? { home: '', away: '', etHome: '', etAway: '', penHome: '', penAway: '' }
            const isLive = getMatchStatus(game) === 'live'
            const knockout = isKnockoutGame(game)
            const isDrawReg = knockout && inp.home !== '' && inp.away !== '' && inp.home === inp.away
            const isDrawET = isDrawReg && inp.etHome !== '' && inp.etAway !== '' && inp.etHome === inp.etAway
            const canSubmit = inp.home !== '' && inp.away !== '' &&
              (!isDrawReg || (inp.etHome !== '' && inp.etAway !== '')) &&
              (!isDrawET || (inp.penHome !== '' && inp.penAway !== ''))
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
                  {existing && !isEditing ? (
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-2xl font-black text-amber-400 w-8 text-center">{existing.homeScore}</span>
                        <span className="text-slate-600">–</span>
                        <span className="text-2xl font-black text-amber-400 w-8 text-center">{existing.awayScore}</span>
                      </div>
                      {existing.etHomeScore !== undefined && existing.etAwayScore !== undefined && (
                        <div className="text-xs text-amber-400/70">ET: {existing.etHomeScore}–{existing.etAwayScore}</div>
                      )}
                      {existing.penHomeScore !== undefined && existing.penAwayScore !== undefined && (
                        <div className="text-xs text-amber-400/70">PEN: {existing.penHomeScore}–{existing.penAwayScore}</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1">
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
                      {isDrawReg && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 uppercase w-10">Prórr.</span>
                          <input type="number" min="0" max="20" value={inp.etHome}
                            onChange={(e) => setInputs((prev) => ({ ...prev, [game.id]: { ...inp, etHome: e.target.value } }))}
                            className="w-9 bg-slate-800 border border-slate-600 rounded text-center text-white font-bold py-0.5 focus:outline-none focus:border-amber-500 text-sm"
                            placeholder="0"
                          />
                          <span className="text-slate-600 text-sm">–</span>
                          <input type="number" min="0" max="20" value={inp.etAway}
                            onChange={(e) => setInputs((prev) => ({ ...prev, [game.id]: { ...inp, etAway: e.target.value } }))}
                            className="w-9 bg-slate-800 border border-slate-600 rounded text-center text-white font-bold py-0.5 focus:outline-none focus:border-amber-500 text-sm"
                            placeholder="0"
                          />
                        </div>
                      )}
                      {isDrawET && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 uppercase w-10">Pênaltis</span>
                          <input type="number" min="0" max="20" value={inp.penHome}
                            onChange={(e) => setInputs((prev) => ({ ...prev, [game.id]: { ...inp, penHome: e.target.value } }))}
                            className="w-9 bg-slate-800 border border-slate-600 rounded text-center text-white font-bold py-0.5 focus:outline-none focus:border-amber-500 text-sm"
                            placeholder="0"
                          />
                          <span className="text-slate-600 text-sm">–</span>
                          <input type="number" min="0" max="20" value={inp.penAway}
                            onChange={(e) => setInputs((prev) => ({ ...prev, [game.id]: { ...inp, penAway: e.target.value } }))}
                            className="w-9 bg-slate-800 border border-slate-600 rounded text-center text-white font-bold py-0.5 focus:outline-none focus:border-amber-500 text-sm"
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-medium text-white truncate">{getTeamName(game, 'away')}</span>
                    <TeamFlag team={game.awayTeam} name={getTeamName(game, 'away')} size="sm" />
                  </div>
                </div>
                <GamePreview gameId={game.id} homeName={getTeamName(game, 'home')} awayName={getTeamName(game, 'away')} />
                <div className="mt-3 flex justify-end gap-2">
                  {existing && !isEditing ? (
                    <button onClick={() => startEdit(game)} className="text-xs text-slate-500 hover:text-amber-400 transition-colors">
                      {t.match.editPick}
                    </button>
                  ) : existing && isEditing ? (
                    <>
                      <button onClick={() => cancelEdit(game.id)} className="text-xs text-slate-500 hover:text-white transition-colors">
                        Cancelar
                      </button>
                      <button onClick={() => clearPrediction(game.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                        {t.predictions.clear}
                      </button>
                      <button onClick={() => submit(game)} disabled={!canSubmit}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold text-sm rounded-lg transition-colors"
                      >
                        {t.predictions.save}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => submit(game)} disabled={!canSubmit}
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
          {finishedPredictions.map(({ game, pred, result, knockoutPts }) => (
            <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wide">{localStageLabel(game.type, game.group, t)}</span>
                {isKnockoutGame(game) ? (
                  <span className="text-xs font-bold text-amber-400">{knockoutPts} pts</span>
                ) : (
                  <ResultBadge result={result} isDraw={game.home_score === game.away_score} t={t} />
                )}
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
                      <div className="text-lg font-black text-amber-400">
                        {pred.homeScore} – {pred.awayScore}
                        {pred.etHomeScore !== undefined && pred.etAwayScore !== undefined && (
                          <span className="text-amber-400/70 text-sm"> (ET: {pred.etHomeScore}–{pred.etAwayScore})</span>
                        )}
                        {pred.penHomeScore !== undefined && pred.penAwayScore !== undefined && (
                          <span className="text-amber-400/70 text-sm"> (PEN: {pred.penHomeScore}–{pred.penAwayScore})</span>
                        )}
                      </div>
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

// ── Pre-game preview (form + H2H) ────────────────────────────────────────────

function FormDots({ form }: { form: string }) {
  return (
    <div className="flex gap-0.5">
      {[...form].map((r, i) => (
        <span key={i} className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
          r === 'W' ? 'bg-green-500 text-white' :
          r === 'L' ? 'bg-red-500 text-white' :
          'bg-slate-700 text-slate-300'
        }`}>
          {r === 'W' ? 'V' : r === 'L' ? 'D' : 'E'}
        </span>
      ))}
    </div>
  )
}

function GamePreview({ gameId, homeName, awayName }: { gameId: string; homeName: string; awayName: string }) {
  const { data } = useSWR<MatchDetail>(`/api/match/${gameId}`, fetcher, { revalidateOnFocus: false })
  if (!data) return null
  const hasForm = data.homeForm || data.awayForm
  const h2h = data.h2h?.slice(0, 3) ?? []
  if (!hasForm && h2h.length === 0) return null
  return (
    <div className="mt-3 pt-3 border-t border-slate-800 text-[11px]">
      {hasForm && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col gap-1">
            <span className="text-slate-500">{homeName}</span>
            {data.homeForm && <FormDots form={data.homeForm} />}
          </div>
          <span className="text-slate-600 text-[10px] uppercase tracking-wider">Últimos 5</span>
          <div className="flex flex-col items-end gap-1">
            <span className="text-slate-500">{awayName}</span>
            {data.awayForm && <FormDots form={data.awayForm} />}
          </div>
        </div>
      )}
      {h2h.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-slate-600 text-[10px] uppercase tracking-wider mb-1">Últimos confrontos</div>
          {h2h.map((g, i) => {
            const hs = parseInt(g.homeScore), as_ = parseInt(g.awayScore)
            const hWon = hs > as_, aWon = as_ > hs
            return (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className="text-slate-600 w-14 shrink-0">{g.date?.slice(0, 7)}</span>
                <span className={`flex-1 text-right truncate ${hWon ? 'text-white font-semibold' : 'text-slate-500'}`}>{g.homeTeam}</span>
                <span className="font-black tabular-nums text-white shrink-0 w-10 text-center">{g.homeScore}–{g.awayScore}</span>
                <span className={`flex-1 truncate ${aWon ? 'text-white font-semibold' : 'text-slate-500'}`}>{g.awayTeam}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ResultBadge({ result, isDraw, t }: { result: PredictionResult; isDraw?: boolean; t: Translations }) {
  if (result === 'correct') return (
    <span className="flex items-center gap-1 text-xs font-bold text-green-400">
      <CheckCircle2 size={13} /> {t.predictions.resultCorrect}
    </span>
  )
  if (result === 'correct-winner') return (
    <span className="flex items-center gap-1 text-xs font-bold text-blue-400">
      <CheckCircle2 size={13} /> {isDraw ? t.predictions.resultDraw : t.predictions.resultWinner}
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
