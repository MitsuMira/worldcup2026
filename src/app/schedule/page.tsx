'use client'

import useSWR from 'swr'
import { useState } from 'react'
import MatchCard from '@/components/MatchCard'
import type { EnrichedGame } from '@/lib/types'
import { getMatchStatus, groupGamesByDate, formatMatchDate } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function SchedulePage() {
  const { t } = useT()
  const { data, error, isLoading } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 30_000 })
  const [filter, setFilter] = useState(0) // index into filters array
  const [groupFilter, setGroupFilter] = useState('All')

  const allGames = data?.games ?? []
  const now = new Date()
  const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`

  const filters = [
    { label: t.schedule.all, fn: () => true },
    { label: t.schedule.live, fn: (g: EnrichedGame) => getMatchStatus(g) === 'live' },
    { label: t.schedule.today, fn: (g: EnrichedGame) => !!g.local_date?.startsWith(todayStr) },
    { label: t.schedule.upcoming, fn: (g: EnrichedGame) => getMatchStatus(g) === 'scheduled' },
    { label: t.schedule.finished, fn: (g: EnrichedGame) => getMatchStatus(g) === 'finished' },
    { label: t.schedule.groupStage, fn: (g: EnrichedGame) => g.type === 'group' },
    { label: t.schedule.knockout, fn: (g: EnrichedGame) => g.type !== 'group' },
  ]

  const filtered = allGames.filter((g) => {
    if (!filters[filter].fn(g)) return false
    if (groupFilter !== 'All' && g.group !== groupFilter) return false
    return true
  })

  const byDate = groupGamesByDate(filtered)
  const sortedDates = [...byDate.keys()].sort((a, b) => {
    const [am, ad, ay] = a.split('/').map(Number)
    const [bm, bd, by] = b.split('/').map(Number)
    return new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime()
  })

  const showGroupFilter = filter === 0 || filter === 5

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">{t.schedule.title}</h1>
        <p className="text-slate-400 text-sm">{t.schedule.subtitle}</p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
        {filters.map(({ label }, i) => (
          <button
            key={label}
            onClick={() => setFilter(i)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === i ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showGroupFilter && (
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
          <button
            onClick={() => setGroupFilter('All')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              groupFilter === 'All' ? 'bg-slate-600 text-white' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.schedule.allGroups}
          </button>
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                groupFilter === g ? 'bg-slate-600 text-white' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.match.stageGroup} {g}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">
          {t.errors.schedule}
        </div>
      )}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" />{t.loading.schedule}
        </div>
      )}
      {!isLoading && filtered.length === 0 && !error && (
        <div className="text-slate-500 text-center py-20">{t.schedule.noMatches}</div>
      )}

      {sortedDates.map((dateKey) => {
        const dayGames = byDate.get(dateKey) ?? []
        return (
          <div key={dateKey} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
                {formatMatchDate(dateKey + ' 00:00')}
              </h2>
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-600">
                {dayGames.length} {dayGames.length === 1 ? t.schedule.match : t.schedule.matches}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {dayGames.map((g) => <MatchCard key={g.id} game={g} showPredictLink />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
