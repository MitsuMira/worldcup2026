'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp, Crown, RefreshCw, Settings, Lock, Share2, UserX, ArrowRightLeft } from 'lucide-react'
import { getOrCreateUserId, getUserName, getGroups, saveGroup } from '@/lib/identity'
import type { EnrichedGame, Prediction } from '@/lib/types'
import { getPredictionResult, getTeamName, getMatchStatus } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const STORAGE_KEY = 'wc2026_predictions'

type PredictionResult = 'correct' | 'correct-winner' | 'wrong' | 'pending'
type Tab = 'leaderboard' | 'matches'
type MatchFilter = 'all' | 'finished' | 'upcoming'

interface KvMember {
  userId: string
  name: string
  predictions: Record<string, { homeScore: number | string; awayScore: number | string }>
  updatedAt: string
}

interface GroupSettings {
  exists: boolean
  label: string
  creatorId: string | null
  minParticipation: number
}

const PARTICIPATION_OPTIONS = [
  { value: 0,   label: 'Todas as partidas', desc: 'Conta todas, independente de quem palpitou' },
  { value: 50,  label: 'Maioria (≥50%)', desc: 'Conta se mais da metade dos membros palpitou' },
  { value: 100, label: 'Todos os membros', desc: 'Conta apenas se todos palpitaram' },
]

function loadPredictions(): Record<string, Prediction> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

// Returns whether a game counts given the minParticipation setting
function gameCountsForScoring(game: EnrichedGame, allMembers: KvMember[], minParticipation: number): boolean {
  if (minParticipation === 0 || allMembers.length === 0) return true
  const predictors = allMembers.filter(m => m.predictions[game.id]).length
  return (predictors / allMembers.length) * 100 >= minParticipation
}

function calcPoints(member: KvMember, games: EnrichedGame[], allMembers: KvMember[], minParticipation: number) {
  let pts = 0, exact = 0, winner = 0
  for (const game of games) {
    if (!gameCountsForScoring(game, allMembers, minParticipation)) continue
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
  if (result === 'correct') return <span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" title="Placar exato" />
  if (result === 'correct-winner') return <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0" title="Vencedor certo" />
  if (result === 'wrong') return <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0" title="Errou" />
  return <span className="w-2 h-2 rounded-full bg-slate-700 inline-block shrink-0" title="Aguardando" />
}

// ── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ settings, userId, members, code, onUpdated }: {
  settings: GroupSettings
  userId: string
  members: KvMember[]
  code: string
  onUpdated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const isOwner = settings.creatorId === userId
  const ownerMember = members.find(m => m.userId === settings.creatorId)

  const patch = async (body: object) => {
    setSaving(true)
    try {
      await fetch(`/api/groups/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...body }),
      })
      onUpdated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 text-sm">
      <div className="flex items-center gap-2 mb-3">
        <Settings size={14} className="text-slate-400" />
        <span className="font-semibold text-white text-sm">Configurações do grupo</span>
      </div>

      {/* Ownership */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-1">Proprietário</div>
        {settings.creatorId ? (
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Crown size={12} className="text-amber-400" />
            <span>{ownerMember?.name ?? settings.creatorId}</span>
            {isOwner && <span className="text-amber-400 font-bold">(você)</span>}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Sem proprietário definido</span>
            <button
              onClick={() => patch({ action: 'claim' })}
              disabled={saving}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
            >
              Reivindicar
            </button>
          </div>
        )}
      </div>

      {/* Participation threshold */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-slate-500">Partidas que contam para pontuação</div>
          {!isOwner && <Lock size={10} className="text-slate-600" />}
        </div>
        <div className="space-y-1.5">
          {PARTICIPATION_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-2.5 rounded-lg px-3 py-2 border transition-colors ${
                settings.minParticipation === opt.value
                  ? 'border-amber-500/50 bg-amber-500/5'
                  : 'border-slate-800 bg-slate-800/40'
              } ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <input
                type="radio"
                name="minParticipation"
                value={opt.value}
                checked={settings.minParticipation === opt.value}
                disabled={!isOwner || saving}
                onChange={() => patch({ action: 'settings', minParticipation: opt.value })}
                className="mt-0.5 accent-amber-500 shrink-0"
              />
              <div>
                <div className={`text-xs font-semibold ${settings.minParticipation === opt.value ? 'text-white' : 'text-slate-400'}`}>
                  {opt.label}
                </div>
                <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
        {!isOwner && settings.creatorId && (
          <p className="text-[10px] text-slate-600 mt-2">Apenas o proprietário pode alterar esta configuração.</p>
        )}
      </div>
    </div>
  )
}

// ── Leaderboard tab ──────────────────────────────────────────────────────────

function MemberRow({ member, rank, isMe, games, allMembers, minParticipation, expanded, onToggle, isAdmin, onKick, onTransfer }: {
  member: KvMember; rank: number; isMe: boolean; games: EnrichedGame[]
  allMembers: KvMember[]; minParticipation: number
  expanded: boolean; onToggle: () => void
  isAdmin: boolean; onKick: (m: KvMember) => void; onTransfer: (m: KvMember) => void
}) {
  const { pts, exact, winner } = calcPoints(member, games, allMembers, minParticipation)
  const countedFinished = games.filter(g =>
    getMatchStatus(g) === 'finished' && gameCountsForScoring(g, allMembers, minParticipation)
  )
  const predictedCounted = countedFinished.filter(g => member.predictions[g.id])

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
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {predictedCounted.length} palpites · {exact} exatos · {winner} vencedor
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-black text-white">{pts}</div>
          <div className="text-[10px] text-slate-500">pts</div>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
      </button>

      {/* Admin actions — visible to admin for other members */}
      {isAdmin && !isMe && (
        <div className="px-4 pb-3 flex items-center gap-3 border-t border-slate-800/50">
          <span className="text-[10px] text-slate-600 uppercase tracking-wide flex-1">Admin</span>
          <button
            onClick={e => { e.stopPropagation(); onTransfer(member) }}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-amber-400 transition-colors"
            title="Transferir admin"
          >
            <ArrowRightLeft size={11} /> Tornar admin
          </button>
          <button
            onClick={e => { e.stopPropagation(); onKick(member) }}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-400 transition-colors"
            title="Remover do grupo"
          >
            <UserX size={11} /> Remover
          </button>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800">
          <div className="mt-3 space-y-2">
            {countedFinished.map(game => {
              const pred = member.predictions[game.id]
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
            {games.filter(g => getMatchStatus(g) !== 'finished' && member.predictions[g.id] && gameCountsForScoring(g, allMembers, minParticipation)).length > 0 && (
              <>
                <div className="text-[10px] text-slate-600 uppercase tracking-wider pt-1">Palpites futuros</div>
                {games.filter(g => getMatchStatus(g) !== 'finished' && member.predictions[g.id] && gameCountsForScoring(g, allMembers, minParticipation)).map(game => {
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

// ── Matches tab ──────────────────────────────────────────────────────────────

function MatchCompare({ game, members, rankedOrder, counts }: {
  game: EnrichedGame
  members: KvMember[]
  rankedOrder: string[]
  counts: boolean // whether this game counts for scoring
}) {
  const finished = getMatchStatus(game) === 'finished'
  const anyPrediction = members.some(m => m.predictions[game.id])
  if (!anyPrediction) return null

  return (
    <div className={`border rounded-xl overflow-hidden ${counts ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/50 border-slate-800/50'}`}>
      {/* Match header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {game.group && <span className="text-[10px] font-bold text-slate-500 shrink-0">Gr.{game.group}</span>}
          <span className="text-xs text-white font-semibold truncate">
            {getTeamName(game, 'home')} vs {getTeamName(game, 'away')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!counts && (
            <span className="text-[9px] font-bold text-slate-600 bg-slate-800 rounded px-1.5 py-0.5">não conta</span>
          )}
          {finished ? (
            <span className="text-xs font-black text-white">{game.home_score}–{game.away_score}</span>
          ) : (
            <span className="text-[10px] text-slate-500">não iniciado</span>
          )}
        </div>
      </div>
      {/* Member predictions */}
      <div className={`divide-y divide-slate-800/50 ${!counts ? 'opacity-50' : ''}`}>
        {rankedOrder.map((uid, i) => {
          const member = members.find(m => m.userId === uid)
          if (!member) return null
          const pred = member.predictions[game.id]
          if (!pred) return (
            <div key={uid} className="px-4 py-2.5 flex items-center gap-3">
              <span className="text-xs text-slate-600 w-5 text-center">{i + 1}</span>
              <span className="text-xs text-slate-500 truncate flex-1">{member.name}</span>
              <span className="text-xs text-slate-700">—</span>
            </div>
          )
          const result = finished
            ? getPredictionResult({ ...pred, homeScore: Number(pred.homeScore), awayScore: Number(pred.awayScore) } as Prediction, game) as PredictionResult
            : 'pending'
          return (
            <div key={uid} className="px-4 py-2.5 flex items-center gap-3">
              <span className="text-xs text-slate-500 w-5 text-center">{i + 1}</span>
              <span className="text-xs text-white truncate flex-1">{member.name}</span>
              <ResultDot result={result} />
              <span className={`text-xs font-bold shrink-0 ${result === 'correct' ? 'text-green-400' : result === 'correct-winner' ? 'text-blue-400' : result === 'wrong' ? 'text-red-400' : 'text-amber-400'}`}>
                {pred.homeScore}–{pred.awayScore}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function GroupPage() {
  const { code } = useParams<{ code: string }>()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<Tab>('leaderboard')
  const [showSettings, setShowSettings] = useState(false)
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')

  const { data: gamesData } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 30_000 })
  const games = gamesData?.games ?? []

  const { data: settingsData, mutate: refreshSettings } = useSWR<GroupSettings>(
    mounted ? `group-settings-${code}` : null,
    () => fetch(`/api/groups/${code}`).then(r => r.json()),
    { refreshInterval: 60_000 }
  )
  const settings: GroupSettings = settingsData ?? { exists: true, label: code, creatorId: null, minParticipation: 0 }

  const { data: membersData, mutate: refreshMembers } = useSWR<{ members: KvMember[] }>(
    mounted ? `group-members-${code}` : null,
    () => fetch(`/api/groups/${code}`, { method: 'POST' }).then(r => r.json()),
    { refreshInterval: 30_000 }
  )
  const members = membersData?.members ?? []

  const upsertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const upsertToKv = useCallback((uid: string, uname: string, preds: Record<string, Prediction>, label: string) => {
    if (!uid || !uname) return
    if (upsertTimer.current) clearTimeout(upsertTimer.current)
    upsertTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/groups/${code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, name: uname, predictions: preds, groupLabel: label }),
        })
        if (res.ok) refreshMembers()
      } catch { /* non-fatal */ }
    }, 1500)
  }, [code, refreshMembers])

  const localGroupLabel = getGroups().find(g => g.code === code)?.label ?? code

  useEffect(() => {
    setMounted(true)
    const uid = getOrCreateUserId()
    const uname = getUserName()
    setUserId(uid)
    const preds = loadPredictions()
    if (!getGroups().find(g => g.code === code)) saveGroup({ code, label: code, joinedAt: new Date().toISOString() })
    const label = getGroups().find(g => g.code === code)?.label ?? code
    upsertToKv(uid, uname, preds, label)
    const onStorage = () => upsertToKv(uid, uname, loadPredictions(), label)
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [code, upsertToKv])

  const minParticipation = settings.minParticipation ?? 0

  const rankedMembers = useMemo(() =>
    members
      .map(m => ({ member: m, ...calcPoints(m, games, members, minParticipation) }))
      .sort((a, b) => b.pts - a.pts || b.exact - a.exact),
    [members, games, minParticipation]
  )
  const rankedOrder = rankedMembers.map(r => r.member.userId)

  // Games with at least one prediction
  const gamesWithPredictions = useMemo(() =>
    games.filter(g => members.some(m => m.predictions[g.id])),
    [games, members]
  )

  // Available group letters for the filter
  const availableGroups = useMemo(() => {
    const letters = [...new Set(gamesWithPredictions.map(g => g.group).filter(Boolean))].sort()
    return letters
  }, [gamesWithPredictions])

  // Apply filters
  const filteredGames = useMemo(() => {
    let list = gamesWithPredictions
    if (groupFilter !== 'all') list = list.filter(g => g.group === groupFilter)
    if (matchFilter === 'finished') list = list.filter(g => getMatchStatus(g) === 'finished')
    else if (matchFilter === 'upcoming') list = list.filter(g => getMatchStatus(g) !== 'finished')
    return list
  }, [gamesWithPredictions, groupFilter, matchFilter])

  const finishedFiltered = filteredGames.filter(g => getMatchStatus(g) === 'finished')
  const upcomingFiltered = filteredGames.filter(g => getMatchStatus(g) !== 'finished')

  const isAdmin = settings.creatorId === userId

  const kickMember = async (member: KvMember) => {
    if (!confirm(`Remover ${member.name} do grupo?`)) return
    try {
      await fetch(`/api/groups/${code}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.userId, adminId: userId }),
      })
      refreshMembers()
    } catch { /* non-fatal */ }
  }

  const transferAdmin = async (member: KvMember) => {
    if (!confirm(`Tornar ${member.name} o novo administrador?\nVocê perderá os privilégios de admin.`)) return
    try {
      await fetch(`/api/groups/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'transfer', targetId: member.userId }),
      })
      refreshSettings()
    } catch { /* non-fatal */ }
  }

  const share = () => {
    const url = `${window.location.origin}/join/${code}`
    if (navigator.share) {
      navigator.share({ title: `Entrar no grupo ${localGroupLabel}`, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/groups" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">{localGroupLabel}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-slate-400 tracking-widest">{code}</span>
            <button onClick={share} className="text-slate-500 hover:text-slate-300 transition-colors">
              {copied ? <Check size={12} className="text-green-400" /> : <Share2 size={12} />}
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(v => !v)}
          className={`p-1 transition-colors ${showSettings ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
          title="Configurações"
        >
          <Settings size={16} />
        </button>
        <button onClick={() => { refreshMembers(); refreshSettings() }} className="text-slate-500 hover:text-slate-300 transition-colors p-1" title="Atualizar">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && settingsData && (
        <SettingsPanel
          settings={settings}
          userId={userId}
          members={members}
          code={code}
          onUpdated={() => { refreshSettings(); refreshMembers() }}
        />
      )}

      {/* Share hint */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex items-center gap-3">
        <div className="flex-1 text-xs text-slate-400">
          Compartilhe <span className="font-mono font-bold text-white">{code}</span> com amigos para entrarem.
        </div>
        <button onClick={share} className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 shrink-0 transition-colors">
          {copied ? <Check size={13} /> : <Share2 size={13} />} Compartilhar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-4">
        <button onClick={() => setTab('leaderboard')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'leaderboard' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>
          Classificação
        </button>
        <button onClick={() => setTab('matches')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'matches' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>
          Partidas
        </button>
      </div>

      {/* Content */}
      {rankedMembers.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-12">Carregando grupo…</div>
      ) : tab === 'leaderboard' ? (
        <div className="space-y-2">
          {rankedMembers.map(({ member }, i) => (
            <MemberRow key={member.userId} member={member} rank={i + 1}
              isMe={member.userId === userId} games={games}
              allMembers={members} minParticipation={minParticipation}
              expanded={expanded === member.userId}
              onToggle={() => setExpanded(expanded === member.userId ? null : member.userId)}
              isAdmin={isAdmin}
              onKick={kickMember}
              onTransfer={transferAdmin} />
          ))}
        </div>
      ) : (
        <div>
          {/* Filters */}
          <div className="space-y-2 mb-4">
            {/* Status filter */}
            <div className="flex gap-1.5">
              {(['all', 'finished', 'upcoming'] as MatchFilter[]).map(f => (
                <button key={f} onClick={() => setMatchFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${matchFilter === f ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  {f === 'all' ? 'Todas' : f === 'finished' ? 'Encerradas' : 'Próximas'}
                </button>
              ))}
            </div>
            {/* Group filter */}
            {availableGroups.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setGroupFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${groupFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  Todos
                </button>
                {availableGroups.map(g => (
                  <button key={g} onClick={() => setGroupFilter(g)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${groupFilter === g ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    Gr.{g}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {matchFilter !== 'upcoming' && finishedFiltered.length > 0 && (
              <>
                {matchFilter === 'all' && <div className="text-xs text-slate-500 uppercase tracking-wide">Encerradas</div>}
                {finishedFiltered.map(game => (
                  <MatchCompare key={game.id} game={game} members={members} rankedOrder={rankedOrder}
                    counts={gameCountsForScoring(game, members, minParticipation)} />
                ))}
              </>
            )}
            {matchFilter !== 'finished' && upcomingFiltered.length > 0 && (
              <>
                {matchFilter === 'all' && finishedFiltered.length > 0 && <div className="text-xs text-slate-500 uppercase tracking-wide mt-4">Próximas</div>}
                {matchFilter === 'all' && finishedFiltered.length === 0 && <div className="text-xs text-slate-500 uppercase tracking-wide">Próximas</div>}
                {upcomingFiltered.map(game => (
                  <MatchCompare key={game.id} game={game} members={members} rankedOrder={rankedOrder}
                    counts={gameCountsForScoring(game, members, minParticipation)} />
                ))}
              </>
            )}
            {filteredGames.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-8">
                {gamesWithPredictions.length === 0 ? 'Nenhum palpite feito ainda.' : 'Nenhuma partida com estes filtros.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
