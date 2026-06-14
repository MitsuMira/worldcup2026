'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
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
  // Persistent members from Supabase (visible even when others are offline)
  const [persistentMembers, setPersistentMembers] = useState<Record<string, PartyMember>>({})

  const { data: gamesData } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 30_000 })
  const games = gamesData?.games ?? []

  const localGroupLabel = getGroups().find(g => g.code === code)?.label ?? code
  const { state, status } = useAblyGroup(mounted ? code : null, userId, userName, predictions, localGroupLabel)

  // Debounced upsert of own predictions to Supabase
  const upsertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const upsertToSupabase = useCallback((uid: string, uname: string, preds: Record<string, PartyPrediction>) => {
    if (!uid || !uname) return
    if (upsertTimer.current) clearTimeout(upsertTimer.current)
    upsertTimer.current = setTimeout(() => {
      fetch(`/api/groups/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, name: uname, predictions: preds }),
      }).catch(() => { /* non-fatal */ })
    }, 2000)
  }, [code])

  // Load all group members from Supabase (persistent leaderboard)
  const loadFromSupabase = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${code}`, { method: 'POST' })
      const data = await res.json() as { members: Array<{ user_id: string; name: string; predictions: Record<string, PartyPrediction>; updated_at: string }> }
      const map: Record<string, PartyMember> = {}
      for (const m of data.members ?? []) {
        map[m.user_id] = {
          userId: m.user_id,
          name: m.name,
          predictions: m.predictions,
          joinedAt: m.updated_at,
          online: false,
        }
      }
      setPersistentMembers(map)
    } catch { /* non-fatal */ }
  }, [code])

  useEffect(() => {
    setMounted(true)
    const uid = getOrCreateUserId()
    const uname = getUserName()
    setUserId(uid)
    setUserName(uname)

    const raw = loadPredictions()
    const preds = raw as unknown as Record<string, PartyPrediction>
    setPredictions(preds)

    // Ensure this group is saved locally
    const groups = getGroups()
    if (!groups.find(g => g.code === code)) {
      saveGroup({ code, label: code, joinedAt: new Date().toISOString() })
    }

    // Load existing members from Supabase immediately (no waiting for Ably)
    loadFromSupabase()

    // Persist own predictions to Supabase
    upsertToSupabase(uid, uname, preds)

    const onStorage = () => {
      const updated = loadPredictions() as unknown as Record<string, PartyPrediction>
      setPredictions(updated)
      upsertToSupabase(uid, uname, updated)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [code, loadFromSupabase, upsertToSupabase])

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

  // Merge Supabase baseline with Ably real-time overlay
  const mergedMembers = useMemo(() => {
    const merged: Record<string, PartyMember> = {}
    // Start with persistent data (everyone who has ever been in the group)
    for (const [uid, m] of Object.entries(persistentMembers)) {
      merged[uid] = { ...m, online: false }
    }
    // Overlay real-time data (more up-to-date predictions + online flag)
    for (const [uid, m] of Object.entries(state.members)) {
      merged[uid] = { ...merged[uid], ...m, online: true }
    }
    return merged
  }, [persistentMembers, state.members])

  const rankedMembers = useMemo(() => {
    return Object.values(mergedMembers)
      .map(m => ({ member: m, ...calcPoints(m, games) }))
      .sort((a, b) => b.pts - a.pts || b.exact - a.exact)
  }, [mergedMembers, games])

  if (!mounted) return null

  const members = Object.values(mergedMembers).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hostLabel = (members.find(m => (m as any).groupLabel) as any)?.groupLabel as string | undefined
  const groupLabel = hostLabel ?? localGroupLabel

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
          Carregando grupo…
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

      {rankedMembers.length > 0 && (
        <p className="text-center text-xs text-slate-600 mt-6">
          🟢 online agora · ⚫ visto anteriormente
        </p>
      )}
    </div>
  )
}
