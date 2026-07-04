'use client'

import useSWR from 'swr'
import { useState, useEffect, useCallback } from 'react'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame, Prediction } from '@/lib/types'
import { getMatchStatus, getTeamName, isKnockoutGame } from '@/lib/utils'
import { localStageLabel } from '@/lib/i18n'
import { useT } from '@/contexts/LanguageContext'
import { Loader2, CheckCircle2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const STORAGE_KEY = 'wc2026_predictions'

function loadPredictions(): Record<string, Prediction> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}
function savePredictions(p: Record<string, Prediction>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LatePicksPage() {
  const { t } = useT()
  const { data, isLoading } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher)
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string; etHome: string; etAway: string; penHome: string; penAway: string }>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPredictions(loadPredictions())
  }, [])

  const games = data?.games ?? []
  // All finished games (group + knockout), sorted chronologically
  const finishedGames = games
    .filter(g => getMatchStatus(g) === 'finished')
    .sort((a, b) => new Date(a.local_date).getTime() - new Date(b.local_date).getTime())

  const unpredicted = finishedGames.filter(g => !predictions[g.id])
  const predicted = finishedGames.filter(g => !!predictions[g.id])

  const submit = useCallback((game: EnrichedGame) => {
    const inp = inputs[game.id]
    if (!inp) return
    const h = parseInt(inp.home), a = parseInt(inp.away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    const knockout = isKnockoutGame(game)
    const isDrawReg = knockout && inp.home !== '' && inp.away !== '' && inp.home === inp.away
    const etH = inp.etHome !== '' ? parseInt(inp.etHome) : undefined
    const etA = inp.etAway !== '' ? parseInt(inp.etAway) : undefined
    if (isDrawReg && etH !== undefined && etA !== undefined && (etH < h || etA < a)) return
    const isDrawET = isDrawReg && inp.etHome !== '' && inp.etAway !== '' && inp.etHome === inp.etAway
    const penH = inp.penHome !== '' ? parseInt(inp.penHome) : undefined
    const penA = inp.penAway !== '' ? parseInt(inp.penAway) : undefined
    if (isDrawET && penH !== undefined && penA !== undefined && penH === penA) return
    const pred: Prediction = {
      matchId: game.id,
      homeTeamName: getTeamName(game, 'home'),
      awayTeamName: getTeamName(game, 'away'),
      homeTeamFlag: game.homeTeam?.flag ?? '',
      awayTeamFlag: game.awayTeam?.flag ?? '',
      homeScore: h, awayScore: a,
      ...(knockout && isDrawReg && etH !== undefined && etA !== undefined ? { etHomeScore: etH, etAwayScore: etA } : {}),
      ...(knockout && isDrawET && penH !== undefined && penA !== undefined ? { penHomeScore: penH, penAwayScore: penA } : {}),
      createdAt: new Date().toISOString(),
    }
    const updated = { ...predictions, [game.id]: pred }
    setPredictions(updated)
    savePredictions(updated)
    setInputs(prev => { const next = { ...prev }; delete next[game.id]; return next })
  }, [inputs, predictions])

  if (!mounted) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Palpites em aberto</h1>
        <p className="text-slate-400 text-sm">
          Adicione seu palpite para as partidas encerradas. Tente sem ver o resultado!
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" /> Carregando…
        </div>
      )}

      {!isLoading && (
        <>
          {unpredicted.length === 0 && predicted.length === 0 && (
            <div className="text-slate-500 text-center py-20">Nenhuma partida disponível ainda.</div>
          )}

          {/* Unpredicted games */}
          {unpredicted.length > 0 && (
            <div className="space-y-3 mb-8">
              {unpredicted.map(game => {
                const inp = inputs[game.id] ?? { home: '', away: '', etHome: '', etAway: '', penHome: '', penAway: '' }
                const knockout = isKnockoutGame(game)
                const isDrawReg = knockout && inp.home !== '' && inp.away !== '' && inp.home === inp.away
                const isDrawET = isDrawReg && inp.etHome !== '' && inp.etAway !== '' && inp.etHome === inp.etAway
                const penIsTie = isDrawET && inp.penHome !== '' && inp.penAway !== '' && inp.penHome === inp.penAway
                const canSave = inp.home !== '' && inp.away !== '' &&
                  (!isDrawReg || (inp.etHome !== '' && inp.etAway !== '')) &&
                  (!isDrawET || (inp.penHome !== '' && inp.penAway !== '')) &&
                  !penIsTie
                return (
                  <div key={game.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-500 uppercase tracking-wide">
                        {localStageLabel(game.type, game.group, t)}
                      </span>
                      <span className="text-[10px] text-slate-600">sem resultado</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TeamFlag team={game.homeTeam} name={getTeamName(game, 'home')} size="sm" />
                        <span className="text-sm font-medium text-white truncate">{getTeamName(game, 'home')}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="20" value={inp.home}
                            onChange={e => {
                              const v = e.target.value
                              const upd = { ...inp, home: v }
                              if (knockout && v !== '' && v === inp.away) {
                                if (!inp.etHome) upd.etHome = v
                                if (!inp.etAway) upd.etAway = inp.away
                              }
                              setInputs(prev => ({ ...prev, [game.id]: upd }))
                            }}
                            className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold py-1.5 focus:outline-none focus:border-amber-500 text-sm"
                            placeholder="0"
                          />
                          <span className="text-slate-600 text-sm">–</span>
                          <input
                            type="number" min="0" max="20" value={inp.away}
                            onChange={e => {
                              const v = e.target.value
                              const upd = { ...inp, away: v }
                              if (knockout && v !== '' && inp.home === v) {
                                if (!inp.etHome) upd.etHome = inp.home
                                if (!inp.etAway) upd.etAway = v
                              }
                              setInputs(prev => ({ ...prev, [game.id]: upd }))
                            }}
                            className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold py-1.5 focus:outline-none focus:border-amber-500 text-sm"
                            placeholder="0"
                          />
                        </div>
                        {isDrawReg && (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-amber-400/70 uppercase w-10">{t.match.aet}</span>
                              <input type="number" min={parseInt(inp.home) || 0} max="20" value={inp.etHome}
                                onChange={e => {
                                  const v = e.target.value, min = parseInt(inp.home) || 0, n = parseInt(v)
                                  setInputs(prev => ({ ...prev, [game.id]: { ...inp, etHome: v !== '' && !isNaN(n) && n < min ? String(min) : v } }))
                                }}
                                className="w-9 bg-slate-800 border border-slate-600 rounded text-center text-white font-bold py-0.5 focus:outline-none focus:border-amber-500 text-sm"
                                placeholder={inp.home}
                              />
                              <span className="text-slate-600 text-sm">–</span>
                              <input type="number" min={parseInt(inp.away) || 0} max="20" value={inp.etAway}
                                onChange={e => {
                                  const v = e.target.value, min = parseInt(inp.away) || 0, n = parseInt(v)
                                  setInputs(prev => ({ ...prev, [game.id]: { ...inp, etAway: v !== '' && !isNaN(n) && n < min ? String(min) : v } }))
                                }}
                                className="w-9 bg-slate-800 border border-slate-600 rounded text-center text-white font-bold py-0.5 focus:outline-none focus:border-amber-500 text-sm"
                                placeholder={inp.away}
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 ml-12">{t.match.aetHint} {inp.home}–{inp.away}</span>
                          </div>
                        )}
                        {isDrawET && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 uppercase w-10">{t.match.penalties}</span>
                            <input type="number" min="0" max="20" value={inp.penHome}
                              onChange={e => setInputs(prev => ({ ...prev, [game.id]: { ...inp, penHome: e.target.value } }))}
                              className="w-9 bg-slate-800 border border-slate-600 rounded text-center text-white font-bold py-0.5 focus:outline-none focus:border-amber-500 text-sm"
                              placeholder="0"
                            />
                            <span className="text-slate-600 text-sm">–</span>
                            <input type="number" min="0" max="20" value={inp.penAway}
                              onChange={e => setInputs(prev => ({ ...prev, [game.id]: { ...inp, penAway: e.target.value } }))}
                              className="w-9 bg-slate-800 border border-slate-600 rounded text-center text-white font-bold py-0.5 focus:outline-none focus:border-amber-500 text-sm"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="text-sm font-medium text-white truncate">{getTeamName(game, 'away')}</span>
                        <TeamFlag team={game.awayTeam} name={getTeamName(game, 'away')} size="sm" />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => submit(game)}
                        disabled={!canSave}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold text-sm rounded-lg transition-colors"
                      >
                        Salvar palpite
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Already predicted */}
          {predicted.length > 0 && (
            <>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <CheckCircle2 size={12} className="text-green-500" />
                Palpites salvos ({predicted.length})
              </div>
              <div className="space-y-2">
                {predicted.map(game => {
                  const pred = predictions[game.id]
                  return (
                    <div key={game.id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
                      <TeamFlag team={game.homeTeam} name={getTeamName(game, 'home')} size="sm" />
                      <span className="text-sm text-slate-300 truncate flex-1">{getTeamName(game, 'home')}</span>
                      <div className="flex flex-col items-center shrink-0">
                        <span className="text-lg font-black text-amber-400">
                          {pred.homeScore}–{pred.awayScore}
                        </span>
                        {pred.etHomeScore !== undefined && pred.etAwayScore !== undefined && (
                          <span className="text-xs text-amber-400/70">ET: {pred.etHomeScore}–{pred.etAwayScore}</span>
                        )}
                        {pred.penHomeScore !== undefined && pred.penAwayScore !== undefined && (
                          <span className="text-xs text-amber-400/60">PEN: {pred.penHomeScore}–{pred.penAwayScore}</span>
                        )}
                      </div>
                      <span className="text-sm text-slate-300 truncate flex-1 text-right">{getTeamName(game, 'away')}</span>
                      <TeamFlag team={game.awayTeam} name={getTeamName(game, 'away')} size="sm" />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
