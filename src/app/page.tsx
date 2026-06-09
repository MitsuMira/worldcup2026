'use client'

import useSWR from 'swr'
import MatchCard from '@/components/MatchCard'
import GroupTable from '@/components/GroupTable'
import CountdownTimer from '@/components/CountdownTimer'
import type { EnrichedGame } from '@/lib/types'
import type { EnrichedGroup } from '@/lib/types'
import { getMatchStatus, parseMatchDate } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TOURNAMENT_START = new Date('2026-06-11T19:00:00')

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">{title}</h2>
      {children}
    </section>
  )
}

export default function Home() {
  const { data: gamesData, error: gamesError, isLoading: gamesLoading } = useSWR<{ games: EnrichedGame[] }>(
    '/api/games',
    fetcher,
    { refreshInterval: 30_000 },
  )
  const { data: groupsData } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, {
    refreshInterval: 60_000,
  })

  const games = gamesData?.games ?? []
  const groups = groupsData?.groups ?? []

  const now = new Date()
  const tournamentStarted = now >= TOURNAMENT_START

  const liveGames = games.filter((g) => getMatchStatus(g) === 'live')

  const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`
  const todayGames = games.filter((g) => g.local_date?.startsWith(todayStr) && getMatchStatus(g) !== 'finished')

  const upcomingGames = games
    .filter((g) => {
      const d = parseMatchDate(g.local_date)
      return d && d > now && getMatchStatus(g) === 'scheduled'
    })
    .slice(0, 6)

  const recentResults = games
    .filter((g) => getMatchStatus(g) === 'finished')
    .slice(-4)
    .reverse()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1 text-amber-400 text-sm font-medium mb-4">
          <span>⚽</span> FIFA World Cup 2026
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">
          <span className="text-amber-400">WC</span> 2026
        </h1>
        <p className="text-slate-400 text-sm">
          June 11 – July 19 · United States, Canada & Mexico
        </p>
        {!tournamentStarted && (
          <div className="mt-6">
            <p className="text-slate-400 text-sm mb-2 uppercase tracking-widest font-medium">
              Kickoff countdown
            </p>
            <CountdownTimer />
          </div>
        )}
      </div>

      {gamesError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {gamesError.message ?? 'Failed to load matches. Check your API credentials in .env.local'}
        </div>
      )}

      {gamesLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-12">
          <Loader2 size={20} className="animate-spin" />
          Loading matches…
        </div>
      )}

      {/* Live matches */}
      {liveGames.length > 0 && (
        <Section title="🔴 Live Now">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveGames.map((g) => (
              <MatchCard key={g.id} game={g} />
            ))}
          </div>
        </Section>
      )}

      {/* Today's matches */}
      {todayGames.length > 0 && (
        <Section title="📅 Today">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayGames.map((g) => (
              <MatchCard key={g.id} game={g} showPredictLink />
            ))}
          </div>
        </Section>
      )}

      {/* Upcoming matches (pre-tournament or future days) */}
      {!tournamentStarted && upcomingGames.length > 0 && (
        <Section title="🗓 First Matches">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingGames.map((g) => (
              <MatchCard key={g.id} game={g} showPredictLink />
            ))}
          </div>
        </Section>
      )}

      {tournamentStarted && upcomingGames.length > 0 && liveGames.length === 0 && todayGames.length === 0 && (
        <Section title="⏭ Up Next">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingGames.map((g) => (
              <MatchCard key={g.id} game={g} showPredictLink />
            ))}
          </div>
        </Section>
      )}

      {/* Recent results */}
      {recentResults.length > 0 && (
        <Section title="📊 Recent Results">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentResults.map((g) => (
              <MatchCard key={g.id} game={g} />
            ))}
          </div>
        </Section>
      )}

      {/* Group standings preview */}
      {groups.length > 0 && (
        <Section title="🏆 Group Standings">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.slice(0, 8).map((g) => (
              <GroupTable key={g.group} group={g} compact />
            ))}
          </div>
          {groups.length > 8 && (
            <div className="mt-4 text-center">
              <a href="/standings" className="text-sm text-blue-400 hover:text-blue-300">
                View all 12 groups →
              </a>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
