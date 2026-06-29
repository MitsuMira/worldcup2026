'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Star } from 'lucide-react'
import TeamFlag from '@/components/TeamFlag'
import type { ApiTeam, EnrichedGroup, EnrichedGame } from '@/lib/types'
import { FIFA_RANK } from '@/lib/fifaRanking'
import { useT } from '@/contexts/LanguageContext'
import { useFavorites } from '@/contexts/FavoriteTeamsContext'
import { isTeamConfirmedInTop, canTeamReachPosition } from '@/lib/groupSimulation'
import { isEspnPlaceholder } from '@/lib/bracketStructure'
import { Loader2 } from 'lucide-react'
import { useState, useMemo } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const ROUND_SHORT: Record<string, string> = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: '3rd', final: 'Final' }
const ROUND_PRIO: Record<string, number> = { final: 0, third: 0, sf: 1, qf: 2, r16: 3, r32: 4 }
const PHASE_ORDER = ['final', 'third', 'sf', 'qf', 'r16', 'r32', 'group', 'eliminated'] as const
const PHASE_COLOR: Record<string, string> = {
  final: 'text-yellow-400',
  third: 'text-orange-400',
  sf: 'text-purple-400',
  qf: 'text-blue-400',
  r16: 'text-emerald-400',
  r32: 'text-teal-400',
  group: 'text-slate-400',
  eliminated: 'text-red-500',
}

interface TeamStatus {
  position: number
  isConfirmedQualified: boolean
  isConfirmedFirst: boolean
  isConfirmedSecond: boolean
  isEliminated: boolean
}

export default function TeamsPage() {
  const { t } = useT()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { data, error, isLoading } = useSWR<{ teams: ApiTeam[] }>('/api/teams', fetcher, { revalidateOnFocus: false })
  const { data: groupsData } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, { revalidateOnFocus: false })
  const { data: gamesData } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { revalidateOnFocus: false })
  const [search, setSearch] = useState('')

  const teams = data?.teams ?? []
  const filtered = teams.filter((tm) => {
    if (isEspnPlaceholder(tm.name_en)) return false
    if (search && !tm.name_en.toLowerCase().includes(search.toLowerCase()) &&
        !tm.fifa_code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const teamKoRound = useMemo(() => {
    const games = gamesData?.games ?? []
    const map = new Map<string, string>()
    for (const g of games) {
      if (g.type === 'group') continue
      for (const tid of [g.home_team_id, g.away_team_id]) {
        const cur = map.get(tid)
        if (!cur || (ROUND_PRIO[g.type] ?? 99) < (ROUND_PRIO[cur] ?? 99)) map.set(tid, g.type)
      }
    }
    return map
  }, [gamesData])

  const teamStatusMap = useMemo(() => {
    const groups = groupsData?.groups ?? []
    const games = gamesData?.games ?? []
    if (!groups.length || !games.length) return new Map<string, TeamStatus>()

    const map = new Map<string, TeamStatus>()
    for (const group of groups) {
      const groupLetter = group.group || group.standings.find(s => s.team?.groups)?.team?.groups || ''
      const groupGames = games.filter(g => g.type === 'group' && g.group === groupLetter)

      group.standings.forEach((s, i) => {
        const hasGames = groupGames.length > 0
        const isConfirmedQualified = i < 2 && hasGames &&
          isTeamConfirmedInTop(group, s.team_id, 1, groupGames)
        const isConfirmedFirst = i === 0 && hasGames &&
          isTeamConfirmedInTop(group, s.team_id, 0, groupGames)
        const isConfirmedSecond = i === 1 && isConfirmedQualified &&
          !canTeamReachPosition(group, s.team_id, 0, groupGames)
        const isEliminated = i >= 2 && hasGames &&
          !canTeamReachPosition(group, s.team_id, 2, groupGames)

        map.set(s.team_id, { position: i + 1, isConfirmedQualified, isConfirmedFirst, isConfirmedSecond, isEliminated })
      })
    }
    return map
  }, [groupsData, gamesData])

  const byPhase = useMemo(() => {
    return PHASE_ORDER.reduce<Record<string, ApiTeam[]>>((acc, phase) => {
      acc[phase] = filtered.filter((tm) => {
        if (teamKoRound.has(tm.id)) return teamKoRound.get(tm.id) === phase
        if (phase === 'eliminated') return teamStatusMap.get(tm.id)?.isEliminated === true
        return phase === 'group' && !teamStatusMap.get(tm.id)?.isEliminated
      })
      return acc
    }, {} as Record<string, ApiTeam[]>)
  }, [filtered, teamKoRound, teamStatusMap])

  const phaseLabel = (phase: string): string => ({
    final: t.teams.phaseFinal,
    third: t.teams.phaseThird,
    sf: t.teams.phaseSF,
    qf: t.teams.phaseQF,
    r16: t.teams.phaseR16,
    r32: t.teams.phaseR32,
    group: t.teams.phaseGroupStage,
    eliminated: t.teams.eliminatedGroupStage,
  }[phase] ?? phase)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">{t.teams.title}</h1>
        <p className="text-slate-400 text-sm">{t.teams.subtitle}</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder={t.teams.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">{t.errors.teams}</div>
      )}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" />{t.loading.teams}
        </div>
      )}

      {search ? (
        <TeamGrid teams={filtered} isFavorite={isFavorite} toggleFavorite={toggleFavorite} statusMap={teamStatusMap} teamKoRound={teamKoRound} />
      ) : (
        PHASE_ORDER.map((phase) => {
          const phaseTeams = byPhase[phase]
          if (!phaseTeams?.length) return null
          return (
            <div key={phase} className="mb-8">
              <h2 className={`text-sm font-bold ${PHASE_COLOR[phase]} uppercase tracking-widest mb-3`}>
                {phaseLabel(phase)} · {phaseTeams.length} {t.teams.teamsCount}
              </h2>
              <TeamGrid teams={phaseTeams} isFavorite={isFavorite} toggleFavorite={toggleFavorite} statusMap={teamStatusMap} teamKoRound={teamKoRound} />
            </div>
          )
        })
      )}

      {!isLoading && filtered.length === 0 && !error && (
        <div className="text-slate-500 text-center py-20">{t.teams.noTeams}</div>
      )}
    </div>
  )
}

function TeamGrid({
  teams,
  isFavorite,
  toggleFavorite,
  statusMap,
  teamKoRound,
}: {
  teams: ApiTeam[]
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => void
  statusMap: Map<string, TeamStatus>
  teamKoRound?: Map<string, string>
}) {
  const { t } = useT()
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {teams.map((team) => {
        const fav = isFavorite(team.id)
        const status = statusMap.get(team.id)
        const koRound = teamKoRound?.get(team.id)
        const positionColor = status
          ? (status.isConfirmedFirst || status.isConfirmedSecond)
            ? 'text-emerald-400'
            : status.isEliminated
            ? 'text-red-400'
            : 'text-slate-500'
          : 'text-slate-500'

        return (
          <div key={team.id} className="relative group">
            <Link
              href={`/teams/${team.id}`}
              className="block bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-slate-600 transition-colors"
            >
              <TeamFlag team={team} size="lg" />
              <div className="text-center">
                <div className="text-sm font-semibold text-white leading-tight">{team.name_en}</div>
                <div className="text-xs text-slate-500 mt-0.5">{team.fifa_code}</div>
                {koRound ? (
                  <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">🏆 {ROUND_SHORT[koRound]}</div>
                ) : (
                  <div className="text-xs text-blue-400/70 mt-0.5">{t.match.stageGroup} {team.groups}</div>
                )}
                {FIFA_RANK[team.fifa_code] != null && (
                  <div className="text-[10px] text-amber-400/80 mt-0.5">#{FIFA_RANK[team.fifa_code]} FIFA</div>
                )}
                {!koRound && status && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className={`text-[10px] font-bold ${positionColor}`}>{status.position}°</span>
                    {status.isConfirmedQualified && (
                      <span className="text-[9px] font-bold text-emerald-400">{t.teams.qualified}</span>
                    )}
                    {status.isEliminated && (
                      <span className="text-[9px] font-bold text-red-500">{t.teams.eliminated}</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
            <button
              onClick={(e) => { e.preventDefault(); toggleFavorite(team.id) }}
              className={`absolute top-2 right-2 p-1 rounded-lg transition-colors ${
                fav
                  ? 'text-amber-400'
                  : 'text-slate-700 group-hover:text-slate-500 hover:!text-amber-400'
              }`}
            >
              <Star size={14} fill={fav ? 'currentColor' : 'none'} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
