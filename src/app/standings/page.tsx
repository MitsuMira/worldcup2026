'use client'

import useSWR from 'swr'
import GroupTable from '@/components/GroupTable'
import type { EnrichedGroup } from '@/lib/types'
import { useT } from '@/contexts/LanguageContext'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// WC2026: 12 groups → top-2 advance + best 8 of 12 third-place teams = 32 in R32
const QUALIFYING_THIRDS = 8
const MIN_GAMES_TO_DETERMINE = 3 // only show Q/✕ once a group has finished all 3 matchday games

function computeQualifyingThirds(groups: EnrichedGroup[]): Set<string> {
  // Collect 3rd-place team from each group (index 2) that has played enough games
  const thirds = groups
    .map(g => g.standings[2])
    .filter(s => s && (s.played ?? 0) >= MIN_GAMES_TO_DETERMINE)

  if (thirds.length < QUALIFYING_THIRDS) return new Set() // not enough data yet

  // FIFA criteria for best thirds: pts → GD → GF → conduct score (fewer cards = better)
  const sorted = [...thirds].sort((a, b) => {
    const pd = Number(b.pts) - Number(a.pts); if (pd) return pd
    const gdd = (b.gd ?? 0) - (a.gd ?? 0); if (gdd) return gdd
    const gfd = Number(b.gf) - Number(a.gf); if (gfd) return gfd
    const ca = (a.yellows ?? 0) + (a.reds ?? 0) * 3
    const cb = (b.yellows ?? 0) + (b.reds ?? 0) * 3
    return ca - cb
  })

  return new Set(sorted.slice(0, QUALIFYING_THIRDS).map(s => s.team_id))
}

export default function StandingsPage() {
  const { t } = useT()
  const { data, error, isLoading } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, { refreshInterval: 60_000 })

  const getGroupLetter = (g: EnrichedGroup) =>
    g.group || g.standings.find((s) => s.team?.groups)?.team?.groups || ''

  const groups = [...(data?.groups ?? [])]
    .filter((g) => Array.isArray(g?.standings))
    .sort((a, b) => getGroupLetter(a).localeCompare(getGroupLetter(b)))

  const qualifyingThirds = computeQualifyingThirds(groups)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">{t.standings.title}</h1>
        <p className="text-slate-400 text-sm">{t.standings.subtitle}</p>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">
          {t.errors.standings}
        </div>
      )}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" />{t.loading.standings}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {groups.map((g) => (
          <GroupTable
            key={getGroupLetter(g) || g.standings[0]?.team_id}
            group={g}
            qualifyingThirds={qualifyingThirds}
          />
        ))}
      </div>

      {!isLoading && groups.length === 0 && !error && (
        <div className="text-slate-500 text-center py-20">{t.standings.noData}</div>
      )}

      <div className="mt-10 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
        <p className="font-semibold text-slate-300 mb-2">{t.standings.qualTitle}</p>
        <ul className="space-y-1 text-xs">
          {t.standings.qualRules.map((rule, i) => (
            <li key={i}>• {rule}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
