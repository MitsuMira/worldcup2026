'use client'

import useSWR from 'swr'
import GroupTable from '@/components/GroupTable'
import type { EnrichedGroup } from '@/lib/types'
import { useT } from '@/contexts/LanguageContext'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function StandingsPage() {
  const { t } = useT()
  const { data, error, isLoading } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, { refreshInterval: 60_000 })

  const groups = [...(data?.groups ?? [])]
    .filter((g) => Array.isArray(g?.standings))
    .sort((a, b) => a.group.localeCompare(b.group))

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
        {groups.map((g) => <GroupTable key={g.group} group={g} />)}
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
