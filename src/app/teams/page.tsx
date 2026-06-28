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
const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const ROUND_SHORT: Record<string, string> = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: '3rd', final: 'Final' }
const ROUND_PRIO: Record<string, number> = { final: 0, third: 0, sf: 1, qf: 2, r16: 3, r32: 4 }

interface TeamStatus {
  position: number        // 1–4 current standing position
  isConfirmedQualified: boolean  // confirmed top-2
  isConfirmedFirst: boolean
  isConfirmedSecond: boolean
  isEliminated: boolean          // can't reach 3rd
}

export default function TeamsPage() {
  const { t } = useT()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { data, error, isLoading } = useSWR<{ teams: ApiTeam[] }>('/api/teams', fetcher, { revalidateOnFocus: false })
  const { data: groupsData } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, { revalidateOnFocus: false })
  const { data: gamesData } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { revalidateOnFocus: false })
  const [groupFilter, setGroupFilter] = useState('All')
  const [search, setSearch] = useState('')

  const teams = data?.teams ?? []
  const filtered = teams.filter((tm) => {
    if (isEspnPlaceholder(tm.name_en)) return false
    if (groupFilter !== 'All' && tm.groups !== groupFilter) return false
    if (search && !tm.name_en.toLowerCase().includes(search.toLowerCase()) &&
        !tm.fifa_code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const byGroup = GROUPS.reduce<Record<string, ApiTeam[]>>((acc, g) => {
    acc[g] = filtered.filter((tm) => tm.groups === g)
    return acc
  }, {})

  // Team ID → their most advanced knockout round (undefined if eliminated at group stage)
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

  const groupStageComplete = useMemo(() => {
    const games = gamesData?.games ?? []
    const groupGames = games.filter((g) => g.type === 'group')
    return groupGames.length > 0 && groupGames.every((g) => g.finished === 'TRUE')
  }, [gamesData])

  // Build qualification/position status for every team using the same
  // brute-force simulation that GroupTable uses.
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">{t.teams.title}</h1>
        <p className="text-slate-400 text-sm">{t.teams.subtitle}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder={t.teams.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
        />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setGroupFilter('All')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              groupFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t.teams.all}
          </button>
          {GROUPS.map((g) => (
            <button key={g} onClick={() => setGroupFilter(g)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                groupFilter === g ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">{t.errors.teams}</div>
      )}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" />{t.loading.teams}
        </div>
      )}

      {groupFilter === 'All' && !search ? (
        groupStageComplete ? (
          // Playoff-era view: split by knockout vs group-eliminated
          (() => {
            const koTeams = filtered
              .filter((tm) => teamKoRound.has(tm.id))
              .sort((a, b) => (ROUND_PRIO[teamKoRound.get(a.id)!] ?? 99) - (ROUND_PRIO[teamKoRound.get(b.id)!] ?? 99))
            const groupEliminated = filtered.filter((tm) => !teamKoRound.has(tm.id))
            return (
              <>
                {koTeams.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-3">
                      🏆 {t.teams.knockoutPhase} · {koTeams.length} {t.teams.teamsCount}
                    </h2>
                    <TeamGrid teams={koTeams} isFavorite={isFavorite} toggleFavorite={toggleFavorite} statusMap={teamStatusMap} teamKoRound={teamKoRound} />
                  </div>
                )}
                {groupEliminated.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
                      {t.teams.eliminatedGroupStage} · {groupEliminated.length} {t.teams.teamsCount}
                    </h2>
                    <TeamGrid teams={groupEliminated} isFavorite={isFavorite} toggleFavorite={toggleFavorite} statusMap={teamStatusMap} />
                  </div>
                )}
              </>
            )
          })()
        ) : (
          // Group-phase view
          GROUPS.map((g) => {
            const groupTeams = byGroup[g]
            if (!groupTeams?.length) return null
            return (
              <div key={g} className="mb-8">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {t.match.stageGroup} {g}
                </h2>
                <TeamGrid teams={groupTeams} isFavorite={isFavorite} toggleFavorite={toggleFavorite} statusMap={teamStatusMap} />
              </div>
            )
          })
        )
      ) : (
        <TeamGrid teams={filtered} isFavorite={isFavorite} toggleFavorite={toggleFavorite} statusMap={teamStatusMap} teamKoRound={teamKoRound} />
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
            {/* Favorite star */}
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
