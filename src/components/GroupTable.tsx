'use client'

import Link from 'next/link'
import TeamFlag from './TeamFlag'
import type { EnrichedGroup } from '@/lib/types'
import { useT } from '@/contexts/LanguageContext'

interface Props {
  group: EnrichedGroup
  compact?: boolean
  highlightTeamId?: string
}

export default function GroupTable({ group, compact = false, highlightTeamId }: Props) {
  const { t } = useT()
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white">{t.match.stageGroup} {group.group}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wide">
            <th className="text-left px-4 py-2">{t.standings.team}</th>
            {!compact && <th className="text-center px-2 py-2">GF</th>}
            {!compact && <th className="text-center px-2 py-2">GA</th>}
            <th className="text-center px-2 py-2">GD</th>
            <th className="text-center px-3 py-2 font-bold text-slate-400">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((s, i) => {
            const isHighlighted = s.team_id === highlightTeamId
            return (
              <tr
                key={s.team_id}
                className={`border-t border-slate-800/50 ${
                  isHighlighted
                    ? 'bg-amber-500/10 text-amber-300'
                    : i < 2 ? 'text-white' : 'text-slate-400'
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                    <TeamFlag team={s.team} size="sm" />
                    {s.team ? (
                      <Link
                        href={`/teams/${s.team.id}`}
                        className="text-sm font-medium truncate max-w-[100px] hover:underline"
                      >
                        {s.team.name_en}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium truncate max-w-[100px]">{s.team_id}</span>
                    )}
                  </div>
                </td>
                {!compact && <td className="text-center px-2 py-2.5">{s.gf}</td>}
                {!compact && <td className="text-center px-2 py-2.5">{s.ga}</td>}
                <td className="text-center px-2 py-2.5">
                  {s.gd > 0 ? `+${s.gd}` : s.gd}
                </td>
                <td className="text-center px-3 py-2.5 font-bold text-white">{s.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t border-slate-800/50 flex items-center gap-2 text-xs text-slate-600">
        <span className="w-2 h-2 rounded-full bg-green-500/40 inline-block" />
        {t.group.top2}
      </div>
    </div>
  )
}
