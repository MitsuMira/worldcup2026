'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { Star } from 'lucide-react'
import TeamFlag from '@/components/TeamFlag'
import GroupTable from '@/components/GroupTable'
import MatchCard from '@/components/MatchCard'
import type { ApiTeam, EnrichedGame, EnrichedGroup } from '@/lib/types'
import { getMatchStatus, parseMatchDate } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'
import { useFavorites } from '@/contexts/FavoriteTeamsContext'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useT()
  const { isFavorite, toggleFavorite } = useFavorites()

  const { data: teamsData, isLoading: teamsLoading } = useSWR<{ teams: ApiTeam[] }>('/api/teams', fetcher, { revalidateOnFocus: false })
  const { data: gamesData, isLoading: gamesLoading } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 30_000 })
  const { data: groupsData } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, { refreshInterval: 60_000 })

  const teams = teamsData?.teams ?? []
  const games = gamesData?.games ?? []
  const groups = groupsData?.groups ?? []

  const team = teams.find((tm) => tm.id === id)
  const isLoading = teamsLoading || gamesLoading

  const teamGames = games
    .filter((g) => g.home_team_id === id || g.away_team_id === id)
    .sort((a, b) => (parseMatchDate(a.local_date)?.getTime() ?? 0) - (parseMatchDate(b.local_date)?.getTime() ?? 0))

  const finishedGames = teamGames.filter((g) => getMatchStatus(g) === 'finished')
  const upcomingGames = teamGames.filter((g) => getMatchStatus(g) !== 'finished')
  const teamGroup = groups.find((g) => g.group === team?.groups)

  // Compute W/D/L from finished games
  let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0
  for (const g of finishedGames) {
    const isHome = g.home_team_id === id
    const ts = parseInt(isHome ? g.home_score : g.away_score)
    const os = parseInt(isHome ? g.away_score : g.home_score)
    if (isNaN(ts) || isNaN(os)) continue
    played++; gf += ts; ga += os
    if (ts > os) won++
    else if (ts === os) drawn++
    else lost++
  }
  const pts = won * 3 + drawn
  const gd = gf - ga

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-400 py-32">
        <Loader2 size={20} className="animate-spin" />{t.loading.generic}
      </div>
    )
  }

  if (!team) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 mb-4">Team not found.</p>
        <Link href="/teams" className="text-blue-400 hover:underline">{t.teamDetail.backToTeams}</Link>
      </div>
    )
  }

  const fav = isFavorite(team.id)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link href="/teams" className="text-sm text-slate-400 hover:text-white mb-6 inline-block">
        {t.teamDetail.backToTeams}
      </Link>

      {/* Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5">
          <TeamFlag team={team} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white">{team.name_en}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-400 text-sm">{team.fifa_code}</span>
              <span className="text-slate-600">·</span>
              <span className="text-blue-400 text-sm">{t.match.stageGroup} {team.groups}</span>
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(team.id)}
            title={fav ? t.favorites.removeFromFav : t.favorites.addToFav}
            className={`p-3 rounded-xl border transition-colors ${
              fav
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-amber-400 hover:border-amber-500/30'
            }`}
          >
            <Star size={20} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Stats bar */}
        {played > 0 && (
          <div className="mt-5 grid grid-cols-7 gap-2 text-center">
            {[
              { label: t.teamDetail.played, value: played },
              { label: t.teamDetail.won, value: won, color: 'text-green-400' },
              { label: t.teamDetail.drawn, value: drawn, color: 'text-slate-300' },
              { label: t.teamDetail.lost, value: lost, color: 'text-red-400' },
              { label: 'GF', value: gf },
              { label: 'GA', value: ga },
              { label: 'GD', value: gd > 0 ? `+${gd}` : gd, color: gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : '' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 rounded-lg py-2">
                <div className={`text-lg font-black ${color ?? 'text-white'}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group standings */}
      {teamGroup && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.groupStanding}</h2>
          <GroupTable group={teamGroup} highlightTeamId={team.id} />
        </div>
      )}

      {/* Upcoming matches */}
      {upcomingGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.upcomingMatches}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {upcomingGames.map((g) => <MatchCard key={g.id} game={g} showPredictLink />)}
          </div>
        </div>
      )}

      {/* Past results */}
      {finishedGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.pastMatches}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[...finishedGames].reverse().map((g) => <MatchCard key={g.id} game={g} />)}
          </div>
        </div>
      )}

      {teamGames.length === 0 && (
        <div className="text-slate-500 text-center py-12">{t.teamDetail.noMatches}</div>
      )}
    </div>
  )
}
