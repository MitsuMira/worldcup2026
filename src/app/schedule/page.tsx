'use client'

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import MatchCard from '@/components/MatchCard'
import type { EnrichedGame } from '@/lib/types'
import { getMatchStatus, groupGamesByDate, parseMatchDate } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'
import { useSettings } from '@/contexts/SettingsContext'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function SchedulePage() {
  const { t } = useT()
  const { timezone } = useSettings()
  const { data, error, isLoading } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 30_000 })
  const [filter, setFilter] = useState(0) // index into filters array
  const [groupFilter, setGroupFilter] = useState('All')
  const [hasAutoFiltered, setHasAutoFiltered] = useState(false)

  const allGames = data?.games ?? []
  const now = new Date()
  // today in user's timezone as YYYY-MM-DD (sv-SE locale)
  const todayKey = now.toLocaleDateString('sv-SE', timezone ? { timeZone: timezone } : undefined)

  // Auto-switch to Knockout filter once all group games are finished
  useEffect(() => {
    if (!data || hasAutoFiltered || filter !== 0) return
    setHasAutoFiltered(true)
    const groupGames = data.games.filter((g) => g.type === 'group')
    const allGroupDone = groupGames.length > 0 && groupGames.every((g) => getMatchStatus(g) === 'finished')
    const hasKnockout = data.games.some((g) => g.type !== 'group')
    if (allGroupDone && hasKnockout) setFilter(filters.length - 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const filters = [
    { label: t.schedule.all, fn: () => true },
    { label: t.schedule.live, fn: (g: EnrichedGame) => getMatchStatus(g) === 'live' },
    { label: t.schedule.today, fn: (g: EnrichedGame) => {
      const d = parseMatchDate(g.local_date)
      return !!d && d.toLocaleDateString('sv-SE', timezone ? { timeZone: timezone } : undefined) === todayKey
    }},
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

  // groupGamesByDate returns YYYY-MM-DD keys — sort lexicographically (works correctly)
  const byDate = groupGamesByDate(filtered, timezone)
  const sortedDates = [...byDate.keys()].filter(k => k !== 'Unknown').sort()

  const showGroupFilter = filter !== filters.length - 1  // hide only for Knockout

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
                {new Date(dateKey + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
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
