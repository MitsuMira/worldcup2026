'use client'

import useSWR from 'swr'
import { useState, useEffect, useCallback } from 'react'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame, Prediction, MatchDetail } from '@/lib/types'
import { getMatchStatus, getTeamName } from '@/lib/utils'
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

// ── Form dots (no scores shown) ───────────────────────────────────────────────

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
  // H2H: hide result of this exact game by filtering it out
  const h2h = (data.h2h ?? []).slice(0, 3)
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LatePicksPage() {
  const { t } = useT()
  const { data, isLoading } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher)
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPredictions(loadPredictions())
  }, [])

  const games = data?.games ?? []
  // Only finished group-stage games, sorted chronologically
  const finishedGames = games
    .filter(g => getMatchStatus(g) === 'finished' && g.type === 'group')
    .sort((a, b) => new Date(a.local_date).getTime() - new Date(b.local_date).getTime())

  const unpredicted = finishedGames.filter(g => !predictions[g.id])
  const predicted = finishedGames.filter(g => !!predictions[g.id])

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
          {/* Unpredicted games */}
          {unpredicted.length === 0 && predicted.length === 0 && (
            <div className="text-slate-500 text-center py-20">Nenhuma partida disponível ainda.</div>
          )}

          {unpredicted.length > 0 && (
            <div className="space-y-3 mb-8">
              {unpredicted.map(game => {
                const inp = inputs[game.id] ?? { home: '', away: '' }
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
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number" min="0" max="20" value={inp.home}
                          onChange={e => setInputs(prev => ({ ...prev, [game.id]: { ...inp, home: e.target.value } }))}
                          className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold py-1.5 focus:outline-none focus:border-amber-500 text-sm"
                          placeholder="0"
                        />
                        <span className="text-slate-600 text-sm">–</span>
                        <input
                          type="number" min="0" max="20" value={inp.away}
                          onChange={e => setInputs(prev => ({ ...prev, [game.id]: { ...inp, away: e.target.value } }))}
                          className="w-12 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold py-1.5 focus:outline-none focus:border-amber-500 text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="text-sm font-medium text-white truncate">{getTeamName(game, 'away')}</span>
                        <TeamFlag team={game.awayTeam} name={getTeamName(game, 'away')} size="sm" />
                      </div>
                    </div>
                    <GamePreview gameId={game.id} homeName={getTeamName(game, 'home')} awayName={getTeamName(game, 'away')} />
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => submit(game)}
                        disabled={!inp.home || !inp.away}
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
                      <span className="text-lg font-black text-amber-400 shrink-0">
                        {pred.homeScore}–{pred.awayScore}
                      </span>
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
