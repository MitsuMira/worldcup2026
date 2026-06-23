'use client'

import Link from 'next/link'
import TeamFlag from './TeamFlag'
import type { EnrichedGroup, EnrichedGame } from '@/lib/types'
import { canTeamReachPosition, isTeamConfirmedInTop } from '@/lib/groupSimulation'
import { useT } from '@/contexts/LanguageContext'

interface Props {
  group: EnrichedGroup
  compact?: boolean
  highlightTeamId?: string
  qualifyingThirds?: Set<string>
  isLiveSimulated?: boolean
  allGames?: EnrichedGame[]
}

export default function GroupTable({ group, compact = false, highlightTeamId, qualifyingThirds, isLiveSimulated, allGames }: Props) {
  const { t } = useT()
  const groupLetter = group.group || group.standings.find((s) => s.team?.groups)?.team?.groups || ''

  // Games for this specific group, used for elimination simulation
  const groupGames = allGames?.filter(g => g.type === 'group' && g.group === groupLetter) ?? []

  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden ${isLiveSimulated ? 'border-amber-500/40' : 'border-slate-800'}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isLiveSimulated ? 'border-amber-500/20' : 'border-slate-800'}`}>
        <h3 className="text-sm font-bold text-white">{t.match.stageGroup} {groupLetter}</h3>
        {isLiveSimulated && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
            Simulado
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[340px]">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wide">
              <th className="text-left px-4 py-2">{t.standings.team}</th>
              {!compact && <th className="text-center px-1.5 py-2">J</th>}
              {!compact && <th className="text-center px-1.5 py-2">V</th>}
              {!compact && <th className="text-center px-1.5 py-2">E</th>}
              {!compact && <th className="text-center px-1.5 py-2">D</th>}
              <th className="text-center px-2 py-2">GD</th>
              <th className="text-center px-3 py-2 font-bold text-slate-400">Pts</th>
              {!compact && <th className="text-center px-1.5 py-2 opacity-40">🟨</th>}
              {!compact && <th className="text-center px-1.5 py-2 opacity-40">🟥</th>}
            </tr>
          </thead>
          <tbody>
            {group.standings.map((s, i) => {
              const isHighlighted = s.team_id === highlightTeamId
              const isThirdQualified = i === 2 && qualifyingThirds?.has(s.team_id)
              const isThirdEliminated = i === 2 && qualifyingThirds && !qualifyingThirds.has(s.team_id) && qualifyingThirds.size > 0
              // Mathematical elimination: can't reach 3rd even in the best possible scenario
              // Uses full FIFA H2H tiebreaker simulation when games data is available
              const isEliminated = i >= 2 && (
                groupGames.length > 0
                  ? !canTeamReachPosition(group, s.team_id, 2, groupGames)
                  : false
              )
              // Confirmed qualified: in top 2 AND no remaining scenario can displace them
              const isConfirmedQualified = i < 2 && groupGames.length > 0 &&
                isTeamConfirmedInTop(group, s.team_id, 1, groupGames)
              const movement = (s as typeof s & { _liveMovement?: number })._liveMovement ?? 0

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
                      <span className={`text-xs font-bold w-4 shrink-0 ${
                        i < 2 ? 'text-emerald-500' : i === 3 ? 'text-red-500' : 'text-slate-500'
                      }`}>{i + 1}</span>
                      {isLiveSimulated && movement !== 0 && (
                        <span className={`text-[9px] font-bold shrink-0 leading-none ${movement > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {movement > 0 ? '▲' : '▼'}
                        </span>
                      )}
                      {isLiveSimulated && movement === 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 inline-block" />
                      )}
                      <TeamFlag team={s.team} size="sm" />
                      {s.team ? (
                        <Link href={`/teams/${s.team.id}`} className="text-sm font-medium truncate max-w-[90px] hover:underline">
                          {s.team.name_en}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium truncate max-w-[90px]">{s.team_id}</span>
                      )}
                      {(isConfirmedQualified || isThirdQualified) && (
                        <span className="text-[9px] font-bold text-emerald-400 shrink-0">Q</span>
                      )}
                      {(isThirdEliminated || isEliminated) && (
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
                  <td className="text-center px-3 py-2.5 font-bold text-white">{s.pts}</td>
                  {!compact && <td className="text-center px-1.5 py-2.5 text-yellow-400/70 text-xs">{s.yellows ?? 0}</td>}
                  {!compact && <td className="text-center px-1.5 py-2.5 text-red-400/70 text-xs">{s.reds ?? 0}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-slate-800/50 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500/60 inline-block" />
          <span className="text-slate-500">{t.group.top2}</span>
        </span>
        {isQVisible(group, allGames) && (
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">Q</span>
            <span className="text-slate-500">{qualifyingThirds && qualifyingThirds.size > 0 ? 'classificado' : 'classificado matematicamente'}</span>
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
  return group.standings.some(s => (s.played ?? 0) > 0)
}

function isQVisible(group: EnrichedGroup, allGames?: EnrichedGame[]) {
  if (!allGames) return false
  const groupLetter = group.group || group.standings.find(s => s.team?.groups)?.team?.groups || ''
  const groupGames = allGames.filter(g => g.type === 'group' && g.group === groupLetter)
  if (groupGames.length === 0) return false
  return group.standings.slice(0, 2).some(s =>
    isTeamConfirmedInTop(group, s.team_id, 1, groupGames)
  ) || group.standings[2] !== undefined
}
