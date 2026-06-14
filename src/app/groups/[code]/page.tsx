'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, Wifi, WifiOff, ChevronDown, ChevronUp, Crown } from 'lucide-react'
import { useAblyGroup } from '@/hooks/useAblyGroup'
import { getOrCreateUserId, getUserName, getGroups, saveGroup } from '@/lib/identity'
import type { PartyMember, PartyPrediction } from '@/lib/partyTypes'
import type { EnrichedGame, Prediction } from '@/lib/types'
import { getPredictionResult, getTeamName, getMatchStatus } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const STORAGE_KEY = 'wc2026_predictions'

type PredictionResult = 'correct' | 'correct-winner' | 'wrong' | 'pending'
const resultPoints: Record<PredictionResult, number> = { correct: 3, 'correct-winner': 1, wrong: 0, pending: 0 }

function loadPredictions(): Record<string, Prediction> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function calcPoints(member: PartyMember, games: EnrichedGame[]) {
  let pts = 0, exact = 0, winner = 0
  for (const game of games) {
    const pred = member.predictions[game.id]
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

function ResultDot({ result }: { result: PredictionResult }) {
  if (result === 'correct') return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="Placar exato" />
  if (result === 'correct-winner') return <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" title="Vencedor certo" />
  if (result === 'wrong') return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Errou" />
  return <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" title="Aguardando" />
}

function MemberRow({
  member, rank, isMe, games, expanded, onToggle,
}: {
  member: PartyMember; rank: number; isMe: boolean; games: EnrichedGame[]
  expanded: boolean; onToggle: () => void
}) {
  const { pts, exact, winner } = calcPoints(member, games)
  const finishedGames = games.filter(g => getMatchStatus(g) === 'finished')
  const predictedFinished = finishedGames.filter(g => member.predictions[g.id])

  return (
    <div className={`border rounded-xl transition-colors ${isMe ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 bg-slate-900'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <span className={`text-sm font-black w-6 shrink-0 text-center ${rank === 1 ? 'text-amber-400' : 'text-slate-500'}`}>
          {rank === 1 ? <Crown size={16} className="text-amber-400 inline" /> : rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{member.name}</span>
            {isMe && <span className="text-[10px] text-amber-400 font-bold">você</span>}
            {member.online && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="online" />}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {predictedFinished.length} palpites · {exact} exatos · {winner} vencedor
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-black text-white">{pts}</div>
          <div className="text-[10px] text-slate-500">pts</div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800">
          <div className="mt-3 space-y-2">
            {games.filter(g => getMatchStatus(g) === 'finished').map(game => {
              const pred = member.predictions[game.id] as PartyPrediction | undefined
              if (!pred) return null
              const result = getPredictionResult(
                { ...pred, homeScore: Number(pred.homeScore), awayScore: Number(pred.awayScore) } as Prediction,
                game,
              )
              return (
                <div key={game.id} className="flex items-center gap-2 text-xs">
                  <ResultDot result={result as PredictionResult} />
                  <span className="text-slate-400 truncate flex-1">{getTeamName(game, 'home')} vs {getTeamName(game, 'away')}</span>
                  <span className="text-slate-500 shrink-0">{game.home_score}–{game.away_score}</span>
                  <span className={`font-bold shrink-0 ${result === 'correct' ? 'text-green-400' : result === 'correct-winner' ? 'text-blue-400' : result === 'wrong' ? 'text-red-400' : 'text-slate-600'}`}>
                    {pred.homeScore}–{pred.awayScore}
                  </span>
                </div>
              )
            })}
            {/* Upcoming predictions */}
            {games.filter(g => getMatchStatus(g) !== 'finished' && member.predictions[g.id]).length > 0 && (
              <>
                <div className="text-[10px] text-slate-600 uppercase tracking-wider pt-1">Palpites futuros</div>
                {games.filter(g => getMatchStatus(g) !== 'finished' && member.predictions[g.id]).map(game => {
                  const pred = member.predictions[game.id]
                  if (!pred) return null
                  return (
                    <div key={game.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-slate-700 inline-block shrink-0" />
                      <span className="text-slate-400 truncate flex-1">{getTeamName(game, 'home')} vs {getTeamName(game, 'away')}</span>
                      <span className="text-amber-400 font-bold shrink-0">{pred.homeScore}–{pred.awayScore}</span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function GroupPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [predictions, setPredictions] = useState<Record<string, PartyPrediction>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: gamesData } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 30_000 })
  const games = gamesData?.games ?? []

  const { state, status } = useAblyGroup(mounted ? code : null, userId, userName, predictions)

  useEffect(() => {
    setMounted(true)
    const uid = getOrCreateUserId()
    const name = getUserName()
    setUserId(uid)
    setUserName(name)

    const raw = loadPredictions()
    // cast local Prediction → PartyPrediction (same shape)
    setPredictions(raw as unknown as Record<string, PartyPrediction>)

    // Ensure this group is saved locally
    const groups = getGroups()
    if (!groups.find(g => g.code === code)) {
      saveGroup({ code, label: code, joinedAt: new Date().toISOString() })
    }

    // Keep predictions in sync with localStorage changes
    const onStorage = () => {
      const updated = loadPredictions()
      setPredictions(updated as unknown as Record<string, PartyPrediction>)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [code])

  // Also re-sync predictions periodically (in case same-tab changes)
  useEffect(() => {
    if (!mounted) return
    const raw = loadPredictions()
    setPredictions(raw as unknown as Record<string, PartyPrediction>)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rankedMembers = useMemo(() => {
    if (!state) return []
    return Object.values(state.members)
      .map(m => ({ member: m, ...calcPoints(m, games) }))
      .sort((a, b) => b.pts - a.pts || b.exact - a.exact)
  }, [state, games])

  if (!mounted) return null

  const groupLabel = getGroups().find(g => g.code === code)?.label ?? code

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/groups" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">{groupLabel}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-slate-400 tracking-widest">{code}</span>
            <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors">
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {status === 'connected'
            ? <><Wifi size={13} className="text-green-400" /><span className="text-green-400">ao vivo</span></>
            : status === 'connecting'
            ? <><Wifi size={13} className="text-slate-500 animate-pulse" /><span className="text-slate-500">conectando…</span></>
            : <><WifiOff size={13} className="text-red-400" /><span className="text-red-400">desconectado</span></>
          }
        </div>
      </div>

      {/* Share hint */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-6 flex items-center gap-3">
        <div className="flex-1 text-xs text-slate-400">
          Compartilhe o código <span className="font-mono font-bold text-white">{code}</span> com amigos para entrarem no grupo.
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 shrink-0 transition-colors">
          {copied ? <Check size={13} /> : <Copy size={13} />} Copiar
        </button>
      </div>

      {/* Leaderboard */}
      {rankedMembers.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-12">
          {status === 'connected' ? 'Aguardando outros membros…' : 'Conectando ao grupo…'}
        </div>
      ) : (
        <div className="space-y-2">
          {rankedMembers.map(({ member }, i) => (
            <MemberRow
              key={member.userId}
              member={member}
              rank={i + 1}
              isMe={member.userId === userId}
              games={games}
              expanded={expanded === member.userId}
              onToggle={() => setExpanded(expanded === member.userId ? null : member.userId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
