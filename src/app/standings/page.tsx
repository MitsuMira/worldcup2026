'use client'

import useSWR from 'swr'
import GroupTable from '@/components/GroupTable'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGroup, EnrichedGame } from '@/lib/types'
import { FIFA_RANK } from '@/lib/fifaRanking'
import { useT } from '@/contexts/LanguageContext'
import { simulateLiveStandings } from '@/lib/simulateLiveStandings'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// WC2026: 12 groups → top-2 advance + best 8 of 12 third-place teams = 32 in R32
const QUALIFYING_THIRDS = 8
const MIN_GAMES_TO_DETERMINE = 3 // only show Q/✕ once a group has finished all 3 matchday games

type ThirdEntry = EnrichedGroup['standings'][number] & { groupLetter: string }

function getThirds(groups: EnrichedGroup[]): ThirdEntry[] {
  const getGroupLetter = (g: EnrichedGroup) =>
    g.group || g.standings.find((s) => s.team?.groups)?.team?.groups || ''

  return groups
    .map(g => ({ ...(g.standings[2] as EnrichedGroup['standings'][number]), groupLetter: getGroupLetter(g) }))
    .filter(s => s && s.team_id)
    .sort((a, b) => {
      const pd = Number(b.pts) - Number(a.pts); if (pd) return pd
      const gdd = (b.gd ?? 0) - (a.gd ?? 0); if (gdd) return gdd
      const gfd = Number(b.gf) - Number(a.gf); if (gfd) return gfd
      const ca = (a.yellows ?? 0) + (a.reds ?? 0) * 3
      const cb = (b.yellows ?? 0) + (b.reds ?? 0) * 3
      const cd = ca - cb; if (cd) return cd
      return (FIFA_RANK[a.team_id] ?? 999) - (FIFA_RANK[b.team_id] ?? 999)
    })
}

function computeQualifyingThirds(groups: EnrichedGroup[]): Set<string> {
  const thirds = groups
    .map(g => g.standings[2])
    .filter(s => s && (s.played ?? 0) >= MIN_GAMES_TO_DETERMINE)

  if (thirds.length < QUALIFYING_THIRDS) return new Set() // not enough data yet

  const sorted = [...thirds].sort((a, b) => {
    const pd = Number(b.pts) - Number(a.pts); if (pd) return pd
    const gdd = (b.gd ?? 0) - (a.gd ?? 0); if (gdd) return gdd
    const gfd = Number(b.gf) - Number(a.gf); if (gfd) return gfd
    const ca = (a.yellows ?? 0) + (a.reds ?? 0) * 3
    const cb = (b.yellows ?? 0) + (b.reds ?? 0) * 3
    const cd = ca - cb; if (cd) return cd
    return (FIFA_RANK[a.team_id] ?? 999) - (FIFA_RANK[b.team_id] ?? 999)
  })

  return new Set(sorted.slice(0, QUALIFYING_THIRDS).map(s => s.team_id))
}

function BestThirdsTable({ groups }: { groups: EnrichedGroup[] }) {
  const thirds = getThirds(groups)
  if (thirds.length === 0) return null

  const enoughData = thirds.every(t => (t.played ?? 0) >= MIN_GAMES_TO_DETERMINE)

  return (
    <div className="mt-10">
      <h2 className="text-xl font-black text-white mb-1">Melhores 3ºs Colocados</h2>
      <p className="text-slate-400 text-sm mb-4">
        Os 8 melhores de 12 grupos avançam para a Fase de 32 · ordenados por Pts → SG → GP → Cartões → Ranking FIFA
      </p>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* header */}
        <div className="grid grid-cols-[1.5rem_1fr_2rem_2.5rem_2.5rem_2.5rem_2.5rem_2.5rem] gap-x-2 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
          <span>#</span>
          <span>Seleção</span>
          <span className="text-center">Gr</span>
          <span className="text-right">Pts</span>
          <span className="text-right">J</span>
          <span className="text-right">SG</span>
          <span className="text-right">GP</span>
          <span className="text-right">FIFA</span>
        </div>
        {thirds.map((s, i) => {
          const qualifies = enoughData && i < QUALIFYING_THIRDS
          const borderColor = enoughData
            ? (i < QUALIFYING_THIRDS ? 'border-l-emerald-500' : 'border-l-slate-700')
            : 'border-l-slate-700'
          const cutoff = enoughData && i === QUALIFYING_THIRDS - 1
          return (
            <div key={s.team_id}>
              <div
                className={`grid grid-cols-[1.5rem_1fr_2rem_2.5rem_2.5rem_2.5rem_2.5rem_2.5rem] gap-x-2 px-3 py-2 text-xs border-t border-slate-800/60 border-l-2 transition-colors
                  ${borderColor}
                  ${qualifies ? 'bg-emerald-500/5' : ''}
                `}
              >
                <span className={`font-bold ${qualifies ? 'text-emerald-400' : 'text-slate-500'}`}>{i + 1}</span>
                <span className="flex items-center gap-1.5 min-w-0">
                  {s.team && <TeamFlag team={s.team} size="sm" />}
                  <span className={`truncate font-medium ${qualifies ? 'text-white' : 'text-slate-400'}`}>
                    {s.team?.name_en ?? s.team_id}
                  </span>
                </span>
                <span className={`text-center font-bold ${qualifies ? 'text-amber-400' : 'text-slate-500'}`}>{s.groupLetter}</span>
                <span className={`text-right font-bold tabular-nums ${qualifies ? 'text-white' : 'text-slate-400'}`}>{s.pts ?? '—'}</span>
                <span className="text-right tabular-nums text-slate-500">{s.played ?? '—'}</span>
                <span className="text-right tabular-nums text-slate-400">{s.gd !== undefined ? (s.gd > 0 ? `+${s.gd}` : s.gd) : '—'}</span>
                <span className="text-right tabular-nums text-slate-400">{s.gf ?? '—'}</span>
                <span className="text-right tabular-nums text-slate-500">{FIFA_RANK[s.team_id] != null ? `#${FIFA_RANK[s.team_id]}` : '—'}</span>
              </div>
              {cutoff && enoughData && (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/60">
                  <div className="flex-1 border-t border-dashed border-emerald-800" />
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-widest whitespace-nowrap">Classificados ↑ · Eliminados ↓</span>
                  <div className="flex-1 border-t border-dashed border-emerald-800" />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!enoughData && (
        <p className="text-slate-600 text-xs mt-2 text-center">
          A classificação final dos melhores 3ºs será definida ao término de todos os jogos da fase de grupos.
        </p>
      )}
    </div>
  )
}

export default function StandingsPage() {
  const { t } = useT()
  const { data, error, isLoading } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, { refreshInterval: 60_000 })
  const { data: gamesData } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 15_000 })

  const getGroupLetter = (g: EnrichedGroup) =>
    g.group || g.standings.find((s) => s.team?.groups)?.team?.groups || ''

  const rawGroups = [...(data?.groups ?? [])]
    .filter((g) => Array.isArray(g?.standings))
    .sort((a, b) => getGroupLetter(a).localeCompare(getGroupLetter(b)))

  const { groups, liveGroupLetters } = simulateLiveStandings(rawGroups, gamesData?.games ?? [])

  const qualifyingThirds = computeQualifyingThirds(groups)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white mb-1">{t.standings.title}</h1>
        <p className="text-slate-400 text-sm">{t.standings.subtitle}</p>
      </div>

      <details className="mb-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-semibold text-slate-300 hover:text-white list-none">
          <span>{t.standings.qualTitle}</span>
          <span className="text-slate-500 text-xs transition-transform group-open:rotate-180">▼</span>
        </summary>
        <ul className="px-4 pb-4 space-y-1.5 text-xs text-slate-400">
          {t.standings.qualRules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-slate-600 shrink-0">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </details>

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

      {liveGroupLetters.size > 0 && (
        <div className="flex items-center gap-2 mb-4 text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block shrink-0" />
          Classificação simulada com o placar atual dos jogos ao vivo. Pode mudar a qualquer momento.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {groups.map((g) => (
          <GroupTable
            key={getGroupLetter(g) || g.standings[0]?.team_id}
            group={g}
            qualifyingThirds={qualifyingThirds}
            isLiveSimulated={liveGroupLetters.has(getGroupLetter(g))}
          />
        ))}
      </div>

      {!isLoading && groups.length === 0 && !error && (
        <div className="text-slate-500 text-center py-20">{t.standings.noData}</div>
      )}

      {groups.length > 0 && <BestThirdsTable groups={groups} />}
    </div>
  )
}
