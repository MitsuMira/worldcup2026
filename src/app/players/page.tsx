'use client'

import useSWR from 'swr'
import { useState, useMemo } from 'react'
import type { ApiTeam, EnrichedGame, MatchDetail } from '@/lib/types'
import { FIFA_SQUADS_BY_CODE } from '@/lib/fifaSquads'
import TeamFlag from '@/components/TeamFlag'
import { useT } from '@/contexts/LanguageContext'
import { getMatchStatus } from '@/lib/utils'
import { Loader2, ChevronUp, ChevronDown } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')

const toTitleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

const POS_COLOR: Record<string, string> = {
  GK: 'bg-amber-500/20 text-amber-400',
  DF: 'bg-blue-500/20 text-blue-400',
  MF: 'bg-green-500/20 text-green-400',
  FW: 'bg-red-500/20 text-red-400',
}

interface PlayerRow {
  name: string
  teamId: string
  team: ApiTeam | undefined
  pos: string
  goals: number
  yellowCards: number
  redCards: number
  apps: number
  minutesPlayed: number
  club: string
}

type SortKey = 'goals' | 'apps' | 'minutesPlayed' | 'yellowCards' | 'redCards'

export default function PlayersPage() {
  const { t } = useT()
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState<'All' | 'GK' | 'DF' | 'MF' | 'FW'>('All')
  const [sortBy, setSortBy] = useState<SortKey>('goals')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const { data: teamsData } = useSWR<{ teams: ApiTeam[] }>('/api/teams', fetcher, { revalidateOnFocus: false })
  const { data: gamesData, isLoading: gamesLoading } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { revalidateOnFocus: false })

  const teams = teamsData?.teams ?? []
  const games = gamesData?.games ?? []

  const finishedIds = useMemo(
    () => games.filter((g) => getMatchStatus(g) === 'finished').map((g) => g.id),
    [games],
  )

  const { data: matchDetailsList, isLoading: detailsLoading } = useSWR<(MatchDetail | null)[]>(
    finishedIds.length > 0 ? ['all-players', ...finishedIds] : null,
    () =>
      Promise.allSettled(
        finishedIds.map((id) =>
          fetch(`/api/match/${id}`).then((r) => r.json()),
        ),
      ).then((results) =>
        results.map((r) => (r.status === 'fulfilled' ? (r.value as MatchDetail) : null)),
      ),
    { revalidateOnFocus: false },
  )

  const teamByCode = useMemo(() => {
    const m = new Map<string, ApiTeam>()
    teams.forEach((t) => m.set(t.fifa_code, t))
    return m
  }, [teams])

  const playerRows = useMemo<PlayerRow[]>(() => {
    if (!matchDetailsList || !teams.length) return []

    const statsMap = new Map<string, {
      teamId: string; apps: number; minutesPlayed: number
      goals: number; yellowCards: number; redCards: number
    }>()

    const getOrCreate = (name: string, teamId: string) => {
      const key = `${teamId}\x00${name}`
      if (!statsMap.has(key)) {
        statsMap.set(key, { teamId, apps: 0, minutesPlayed: 0, goals: 0, yellowCards: 0, redCards: 0 })
      }
      return statsMap.get(key)!
    }

    for (const detail of matchDetailsList) {
      if (!detail?.events) continue
      const events = detail.events

      for (const [lineup, teamId] of [
        [detail.homeLineup, detail.homeTeamId],
        [detail.awayLineup, detail.awayTeamId],
      ] as const) {
        if (!lineup) continue

        for (const player of lineup.starters ?? []) {
          const stat = getOrCreate(player.name, teamId)
          stat.apps++
          const subOff = events.find((e) => e.type === 'sub' && e.secondaryPlayer === player.name)
          stat.minutesPlayed += subOff ? Math.min(subOff.minute, 90) : 90
        }

        for (const player of lineup.subs ?? []) {
          const subOn = events.find((e) => e.type === 'sub' && e.primaryPlayer === player.name)
          if (!subOn) continue
          const stat = getOrCreate(player.name, teamId)
          stat.apps++
          const minOn = Math.min(subOn.minute, 90)
          const subOff = events.find(
            (e) => e.type === 'sub' && e.secondaryPlayer === player.name && e.minute > subOn.minute,
          )
          stat.minutesPlayed += Math.max(0, (subOff ? Math.min(subOff.minute, 90) : 90) - minOn)
        }
      }

      for (const event of events) {
        if (event.type === 'sub' || event.type === 'missed_penalty') continue
        const key1 = `${detail.homeTeamId}\x00${event.primaryPlayer}`
        const key2 = `${detail.awayTeamId}\x00${event.primaryPlayer}`
        const stat = statsMap.get(key1) ?? statsMap.get(key2)
        if (!stat) continue
        if (event.type === 'goal' || event.type === 'penalty') stat.goals++
        else if (event.type === 'yellow') stat.yellowCards++
        else if (event.type === 'yellowred') { stat.yellowCards++; stat.redCards++ }
        else if (event.type === 'red') stat.redCards++
      }
    }

    return [...statsMap.entries()].map(([key, stat]) => {
      const name = key.slice(key.indexOf('\x00') + 1)
      const team = teamByCode.get(stat.teamId)

      let pos = '', club = ''
      const squad = team ? FIFA_SQUADS_BY_CODE[team.fifa_code] : undefined
      if (squad) {
        const pn = norm(name)
        const fp = squad.players.find((p) => {
          const ln = norm(p.lastName), nn = norm(p.name), sn = norm(p.nameOnShirt)
          return (ln.length >= 4 && (pn.includes(ln) || ln.includes(pn))) ||
                 (sn.length >= 4 && (pn.includes(sn) || sn.includes(pn))) ||
                 (nn.length >= 5 && pn === nn)
        })
        if (fp) {
          pos = fp.pos
          club = fp.club.replace(/\s*\([A-Z]{2,3}\)$/, '')
        }
      }

      return { name, teamId: stat.teamId, team, pos, goals: stat.goals, yellowCards: stat.yellowCards, redCards: stat.redCards, apps: stat.apps, minutesPlayed: stat.minutesPlayed, club }
    })
  }, [matchDetailsList, teams, teamByCode])

  const filtered = useMemo(() => {
    let rows = playerRows
    if (posFilter !== 'All') rows = rows.filter((r) => r.pos === posFilter)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.teamId.toLowerCase().includes(s) ||
          (r.team?.name_en ?? '').toLowerCase().includes(s) ||
          r.club.toLowerCase().includes(s),
      )
    }
    return [...rows].sort((a, b) => {
      const diff = (b[sortBy] as number) - (a[sortBy] as number)
      const primary = sortDir === 'desc' ? diff : -diff
      if (primary !== 0) return primary
      // secondary sort: goals desc, then name
      return (b.goals - a.goals) || a.name.localeCompare(b.name)
    })
  }, [playerRows, posFilter, search, sortBy, sortDir])

  const loading = gamesLoading || (finishedIds.length > 0 && detailsLoading)

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortBy(key); setSortDir('desc') }
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(k)}
      className={`flex items-center gap-0.5 transition-colors ${sortBy === k ? 'text-blue-400' : 'hover:text-white'}`}
    >
      {label}
      {sortBy === k
        ? sortDir === 'desc'
          ? <ChevronDown size={11} />
          : <ChevronUp size={11} />
        : null}
    </button>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white mb-1">{t.players.title}</h1>
        <p className="text-slate-400 text-sm">{t.players.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder={t.players.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-64"
        />
        <div className="flex gap-2">
          {(['All', 'GK', 'DF', 'MF', 'FW'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                posFilter === pos
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {pos === 'All' ? t.players.allPos : pos}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" />
          {t.loading.generic}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="w-5 shrink-0" />
            <span className="flex-1">{t.players.title}</span>
            <SortBtn k="goals" label="⚽" />
            <SortBtn k="yellowCards" label="🟨" />
            <SortBtn k="redCards" label="🟥" />
            <SortBtn k="apps" label={t.teamDetail.appsShort} />
            <SortBtn k="minutesPlayed" label="Min" />
            <span className="hidden lg:block w-32 text-right">{t.teamDetail.squad}</span>
          </div>

          {/* Rows */}
          {filtered.map((row, i) => (
            <div
              key={`${row.teamId}:${row.name}`}
              className="flex items-center gap-3 px-3 py-2.5 border-t border-slate-800/50 hover:bg-slate-800/30 transition-colors"
            >
              {/* Rank */}
              <span className="text-xs text-slate-600 w-5 text-right shrink-0">{i + 1}</span>

              {/* Flag + Name + Pos */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="shrink-0">
                  {row.team && <TeamFlag team={row.team} size="sm" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate leading-tight">
                    {toTitleCase(row.name)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-500">{row.teamId}</span>
                    {row.pos && (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${POS_COLOR[row.pos] ?? 'bg-slate-700 text-slate-400'}`}>
                        {row.pos}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Goals */}
              <span className={`text-sm font-bold w-7 text-center shrink-0 ${row.goals > 0 ? 'text-white' : 'text-slate-700'}`}>
                {row.goals > 0 ? row.goals : '–'}
              </span>

              {/* Yellow cards */}
              <span className={`text-sm w-7 text-center shrink-0 ${row.yellowCards > 0 ? 'text-amber-400 font-bold' : 'text-slate-700'}`}>
                {row.yellowCards > 0 ? row.yellowCards : '–'}
              </span>

              {/* Red cards */}
              <span className={`text-sm w-7 text-center shrink-0 ${row.redCards > 0 ? 'text-red-400 font-bold' : 'text-slate-700'}`}>
                {row.redCards > 0 ? row.redCards : '–'}
              </span>

              {/* Apps */}
              <span className="text-xs text-slate-400 w-7 text-center shrink-0">
                {row.apps}
              </span>

              {/* Minutes */}
              <span className="text-xs text-slate-500 w-12 text-right shrink-0">
                {row.minutesPlayed}&apos;
              </span>

              {/* Club */}
              <span className="hidden lg:block text-[10px] text-slate-500 w-32 truncate text-right shrink-0">
                {row.club}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && finishedIds.length > 0 && (
        <div className="text-slate-500 text-center py-20">{t.players.noPlayers}</div>
      )}

      {!loading && finishedIds.length === 0 && (
        <div className="text-slate-500 text-center py-20">No finished games yet.</div>
      )}
    </div>
  )
}
