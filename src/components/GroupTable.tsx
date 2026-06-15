'use client'

import Link from 'next/link'
import TeamFlag from './TeamFlag'
import type { EnrichedGroup } from '@/lib/types'
import { useT } from '@/contexts/LanguageContext'

interface Props {
  group: EnrichedGroup
  compact?: boolean
  highlightTeamId?: string
  qualifyingThirds?: Set<string>
}

export default function GroupTable({ group, compact = false, highlightTeamId, qualifyingThirds }: Props) {
  const { t } = useT()
  const groupLetter = group.group || group.standings.find((s) => s.team?.groups)?.team?.groups || ''

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white">{t.match.stageGroup} {groupLetter}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wide">
            <th className="text-left px-4 py-2">{t.standings.team}</th>
            {!compact && <th className="text-center px-1.5 py-2">P</th>}
            {!compact && <th className="text-center px-1.5 py-2">V</th>}
            {!compact && <th className="text-center px-1.5 py-2">E</th>}
            {!compact && <th className="text-center px-1.5 py-2">D</th>}
            <th className="text-center px-2 py-2">GD</th>
            {!compact && <th className="text-center px-1.5 py-2">🟨</th>}
            {!compact && <th className="text-center px-1.5 py-2">🟥</th>}
            <th className="text-center px-3 py-2 font-bold text-slate-400">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((s, i) => {
            const isHighlighted = s.team_id === highlightTeamId
            const isThirdQualified = i === 2 && qualifyingThirds?.has(s.team_id)
            const isThirdEliminated = i === 2 && qualifyingThirds && !qualifyingThirds.has(s.team_id) && qualifyingThirds.size > 0
            const isEliminated = i === 3

            return (
              <tr
                key={s.team_id}
                className={`border-t border-slate-800/50 ${
                  isHighlighted
                    ? 'bg-amber-500/10 text-amber-300'
                    : i < 2
                    ? 'text-white'
                    : isThirdQualified
                    ? 'text-white'
                    : 'text-slate-500'
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-4 shrink-0">{i + 1}</span>
                    <TeamFlag team={s.team} size="sm" />
                    {s.team ? (
                      <Link href={`/teams/${s.team.id}`} className="text-sm font-medium truncate max-w-[90px] hover:underline">
                        {s.team.name_en}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium truncate max-w-[90px]">{s.team_id}</span>
                    )}
                    {isThirdQualified && (
                      <span className="text-[9px] font-bold text-emerald-400 shrink-0">Q</span>
                    )}
                    {isThirdEliminated && (
                      <span className="text-[9px] font-bold text-red-500 shrink-0">✕</span>
                    )}
                  </div>
                </td>
                {!compact && <td className="text-center px-1.5 py-2.5">{s.played ?? 0}</td>}
                {!compact && <td className="text-center px-1.5 py-2.5">{s.w ?? 0}</td>}
                {!compact && <td className="text-center px-1.5 py-2.5">{s.d ?? 0}</td>}
                {!compact && <td className="text-center px-1.5 py-2.5">{s.l ?? 0}</td>}
                <td className="text-center px-2 py-2.5">
                  {(s.gd ?? 0) > 0 ? `+${s.gd}` : s.gd ?? 0}
                </td>
                {!compact && <td className="text-center px-1.5 py-2.5 text-yellow-400/80">{s.yellows ?? 0}</td>}
                {!compact && <td className="text-center px-1.5 py-2.5 text-red-500/80">{s.reds ?? 0}</td>}
                <td className="text-center px-3 py-2.5 font-bold text-white">{s.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t border-slate-800/50 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500/60 inline-block" />
          <span className="text-slate-500">{t.group.top2}</span>
        </span>
        {qualifyingThirds && qualifyingThirds.size > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">Q</span>
            <span className="text-slate-500">3º classificado</span>
          </span>
        )}
        {isElimZoneVisible(group) && (
          <span className="flex items-center gap-1.5">
            <span className="text-red-500 font-bold">✕</span>
            <span className="text-slate-500">eliminado</span>
          </span>
        )}
      </div>
    </div>
  )
}

function isElimZoneVisible(group: EnrichedGroup) {
  // Only show eliminated legend if at least one team has played games
  return group.standings.some(s => (s.played ?? 0) > 0)
}
