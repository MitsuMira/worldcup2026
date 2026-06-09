'use client'

import useSWR from 'swr'
import TeamFlag from '@/components/TeamFlag'
import type { ApiTeam } from '@/lib/types'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function TeamsPage() {
  const { data, error, isLoading } = useSWR<{ teams: ApiTeam[] }>('/api/teams', fetcher, {
    revalidateOnFocus: false,
  })
  const [groupFilter, setGroupFilter] = useState<string>('All')
  const [search, setSearch] = useState('')

  const teams = data?.teams ?? []
  const filtered = teams.filter((t) => {
    if (groupFilter !== 'All' && t.groups !== groupFilter) return false
    if (search && !t.name_en.toLowerCase().includes(search.toLowerCase()) &&
        !t.fifa_code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const byGroup = GROUPS.reduce<Record<string, ApiTeam[]>>((acc, g) => {
    acc[g] = filtered.filter((t) => t.groups === g)
    return acc
  }, {})

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Teams</h1>
        <p className="text-slate-400 text-sm">48 nations competing for the World Cup</p>
      </div>

      {/* Search + group filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search teams…"
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
            All
          </button>
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
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
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">
          Failed to load teams.
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" />
          Loading teams…
        </div>
      )}

      {/* Show all groups or filtered */}
      {groupFilter === 'All' && !search ? (
        GROUPS.map((g) => {
          const groupTeams = byGroup[g]
          if (groupTeams.length === 0) return null
          return (
            <div key={g} className="mb-8">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                Group {g}
              </h2>
              <TeamGrid teams={groupTeams} />
            </div>
          )
        })
      ) : (
        <TeamGrid teams={filtered} />
      )}

      {!isLoading && filtered.length === 0 && !error && (
        <div className="text-slate-500 text-center py-20">No teams found.</div>
      )}
    </div>
  )
}

function TeamGrid({ teams }: { teams: ApiTeam[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {teams.map((team) => (
        <div
          key={team.id}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-slate-600 transition-colors"
        >
          <TeamFlag team={team} size="lg" />
          <div className="text-center">
            <div className="text-sm font-semibold text-white leading-tight">{team.name_en}</div>
            <div className="text-xs text-slate-500 mt-0.5">{team.fifa_code}</div>
            <div className="text-xs text-blue-400/70 mt-0.5">Group {team.groups}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
