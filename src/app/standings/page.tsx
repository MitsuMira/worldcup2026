'use client'

import useSWR from 'swr'
import GroupTable from '@/components/GroupTable'
import type { EnrichedGroup } from '@/lib/types'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function StandingsPage() {
  const { data, error, isLoading } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, {
    refreshInterval: 60_000,
  })

  const groups = data?.groups ?? []
  const sorted = [...groups].sort((a, b) => a.group.localeCompare(b.group))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Group Standings</h1>
        <p className="text-slate-400 text-sm">12 groups · Top 2 in each group advance</p>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">
          Failed to load standings.
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" />
          Loading standings…
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {sorted.map((g) => (
          <GroupTable key={g.group} group={g} />
        ))}
      </div>

      {!isLoading && sorted.length === 0 && !error && (
        <div className="text-slate-500 text-center py-20">No standings data yet.</div>
      )}

      <div className="mt-10 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
        <p className="font-semibold text-slate-300 mb-2">How qualification works</p>
        <ul className="space-y-1 text-xs">
          <li>• 48 teams in 12 groups of 4</li>
          <li>• Top 2 from each group advance to the Round of 32</li>
          <li>• 8 best third-place teams also advance (total: 32 teams)</li>
          <li>• Tiebreaker: Points → Goal difference → Goals scored → Head-to-head</li>
        </ul>
      </div>
    </div>
  )
}
