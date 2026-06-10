'use client'

import useSWR from 'swr'
import MatchCard from '@/components/MatchCard'
import GroupTable from '@/components/GroupTable'
import CountdownTimer from '@/components/CountdownTimer'
import FavoriteTeamCard from '@/components/FavoriteTeamCard'
import type { EnrichedGame, EnrichedGroup, ApiTeam } from '@/lib/types'
import { getMatchStatus, parseMatchDate } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'
import { useFavorites } from '@/contexts/FavoriteTeamsContext'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      {children}
    </section>
  )
}

export default function Home() {
  const { t } = useT()
  const { favorites } = useFavorites()

  const { data: gamesData, error: gamesError, isLoading: gamesLoading } = useSWR<{ games: EnrichedGame[] }>(
    '/api/games', fetcher, { refreshInterval: 30_000 },
  )
  const { data: groupsData } = useSWR<{ groups: EnrichedGroup[] }>(
    '/api/groups', fetcher, { refreshInterval: 60_000 },
  )
  const { data: teamsData } = useSWR<{ teams: ApiTeam[] }>(
    favorites.length > 0 ? '/api/teams' : null, fetcher, { revalidateOnFocus: false },
  )

  const games = gamesData?.games ?? []
  const teams = teamsData?.teams ?? []

  const getGroupLetter = (g: EnrichedGroup) =>
    g.group || g.standings.find((s) => s.team?.groups)?.team?.groups || ''

  const groups = [...(groupsData?.groups ?? [])].sort((a, b) =>
    getGroupLetter(a).localeCompare(getGroupLetter(b))
  )

  // Groups containing at least one favorite team (by team_id in standings)
  const favoriteGroups = favorites.length > 0
    ? groups.filter((g) => g.standings.some((s) => favorites.includes(s.team_id)))
    : []
  const homeGroups = favoriteGroups.length > 0 ? favoriteGroups : groups.slice(0, 8)
  const now = new Date()

  // Derive first game kickoff from API data — use it for countdown and tournament-started check
  const firstGame = [...games].sort((a, b) =>
    (parseMatchDate(a.local_date)?.getTime() ?? 0) -
    (parseMatchDate(b.local_date)?.getTime() ?? 0)
  )[0]
  const firstKickoff = firstGame ? parseMatchDate(firstGame.local_date) ?? null : null
  const tournamentStarted = firstKickoff ? now >= firstKickoff : false

  const favoriteTeams = teams.filter((tm) => favorites.includes(tm.id))

  const liveGames = games.filter((g) => getMatchStatus(g) === 'live')

  // "today" comparison in UTC (ISO dates from ESPN are UTC)
  const todayUTC = now.toISOString().slice(0, 10)
  const todayGames = games.filter((g) => {
    const d = parseMatchDate(g.local_date)
    return d && d.toISOString().slice(0, 10) === todayUTC && getMatchStatus(g) !== 'finished'
  })

  // Next 48 hours (excluding today's matches already shown and live)
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const upcoming48h = games.filter((g) => {
    const d = parseMatchDate(g.local_date)
    return d && d > now && d <= in48h && getMatchStatus(g) === 'scheduled' && d.toISOString().slice(0, 10) !== todayUTC
  }).sort((a, b) => (parseMatchDate(a.local_date)?.getTime() ?? 0) - (parseMatchDate(b.local_date)?.getTime() ?? 0))

  const upcomingGames = games
    .filter((g) => { const d = parseMatchDate(g.local_date); return d && d > now && getMatchStatus(g) === 'scheduled' })
    .slice(0, 6)
  const recentResults = games.filter((g) => getMatchStatus(g) === 'finished').slice(-4).reverse()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://upload.wikimedia.org/wikipedia/en/7/7b/2026_FIFA_World_Cup_emblem.svg"
          alt="FIFA World Cup 2026"
          className="mx-auto mb-4 w-24 h-24 object-contain"
        />
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
          {t.home.tournamentName}
        </h1>
        <p className="text-slate-400 text-sm">{t.home.tournamentDates} · {t.home.tournamentHosts}</p>
        {!tournamentStarted && (
          <div className="mt-6">
            <p className="text-slate-400 text-sm mb-2 uppercase tracking-widest font-medium">
              {t.countdown.label}
            </p>
            <CountdownTimer kickoff={firstKickoff ?? undefined} />
          </div>
        )}
      </div>

      {gamesError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {t.errors.games}
        </div>
      )}
      {gamesLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-12">
          <Loader2 size={20} className="animate-spin" />{t.loading.matches}
        </div>
      )}

      {/* My favorite teams */}
      <Section title={t.favorites.myTeams}>
        {favoriteTeams.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteTeams.map((tm) => (
              <FavoriteTeamCard key={tm.id} team={tm} games={games} groups={groups} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-6 text-center">
            <p className="text-slate-500 text-sm mb-2">{t.favorites.noFavorites}</p>
            <p className="text-slate-600 text-xs">{t.favorites.addFavorites}</p>
            <Link href="/teams" className="inline-block mt-3 text-xs text-blue-400 hover:text-blue-300">
              {t.nav.teams} →
            </Link>
          </div>
        )}
      </Section>

      {/* Live matches */}
      {liveGames.length > 0 && (
        <Section title={t.home.liveNow}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveGames.map((g) => <MatchCard key={g.id} game={g} />)}
          </div>
        </Section>
      )}

      {/* Today's matches */}
      {todayGames.length > 0 && (
        <Section title={t.home.today}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayGames.map((g) => <MatchCard key={g.id} game={g} showPredictLink />)}
          </div>
        </Section>
      )}

      {/* Next 48h (only during tournament) */}
      {tournamentStarted && upcoming48h.length > 0 && (
        <Section title={t.home.upcoming48h}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming48h.map((g) => <MatchCard key={g.id} game={g} showPredictLink />)}
          </div>
        </Section>
      )}

      {/* Pre-tournament: first matches */}
      {!tournamentStarted && upcomingGames.length > 0 && (
        <Section title={t.home.firstMatches}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingGames.map((g) => <MatchCard key={g.id} game={g} showPredictLink />)}
          </div>
        </Section>
      )}

      {/* Up next (during tournament, no live/today) */}
      {tournamentStarted && upcomingGames.length > 0 && liveGames.length === 0 && todayGames.length === 0 && upcoming48h.length === 0 && (
        <Section title={t.home.upNext}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingGames.map((g) => <MatchCard key={g.id} game={g} showPredictLink />)}
          </div>
        </Section>
      )}

      {/* Recent results */}
      {recentResults.length > 0 && (
        <Section title={t.home.recentResults}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentResults.map((g) => <MatchCard key={g.id} game={g} />)}
          </div>
        </Section>
      )}

      {/* Group standings preview */}
      {groups.length > 0 && (
        <Section title={t.home.groupStandings}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {homeGroups.map((g) => <GroupTable key={getGroupLetter(g) || g.standings[0]?.team_id} group={g} compact />)}
          </div>
          {homeGroups.length < groups.length && (
            <div className="mt-4 text-center">
              <Link href="/standings" className="text-sm text-blue-400 hover:text-blue-300">
                {t.home.viewAllGroups}
              </Link>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
