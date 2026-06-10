'use client'

import useSWR from 'swr'
import { useState } from 'react'
import MatchCard from '@/components/MatchCard'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame } from '@/lib/types'
import { getMatchStatus, getTeamName, formatMatchDateTime } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'
import { useSettings } from '@/contexts/SettingsContext'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Round = 'bracket' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

function BracketSlot({ game, side }: { game?: EnrichedGame; side: 'home' | 'away' }) {
  if (!game) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 min-w-[160px]">
        <div className="w-6 h-6 rounded bg-slate-700/50" />
        <span className="text-slate-500 text-sm font-medium">TBD</span>
      </div>
    )
  }

  const name = getTeamName(game, side)
  const team = side === 'home' ? game.homeTeam : game.awayTeam
  const score = side === 'home' ? game.home_score : game.away_score
  const otherScore = side === 'home' ? game.away_score : game.home_score
  const status = getMatchStatus(game)
  const isWinner = status === 'finished' && parseInt(score) > parseInt(otherScore)

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border min-w-[160px] transition-colors ${
      isWinner
        ? 'bg-green-500/10 border-green-500/30'
        : status === 'finished'
          ? 'bg-slate-800/30 border-slate-700/30'
          : 'bg-slate-800/50 border-slate-700/50'
    }`}>
      <TeamFlag team={team} name={name} size="sm" />
      <span className={`text-sm font-medium flex-1 truncate ${isWinner ? 'text-green-300' : 'text-white'}`}>
        {name}
      </span>
      {status !== 'scheduled' && (
        <span className={`text-sm font-black tabular-nums ${isWinner ? 'text-green-300' : 'text-slate-400'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

function BracketMatchCard({ game, timezone }: { game?: EnrichedGame; timezone: string }) {
  if (!game) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 space-y-1.5 min-w-[200px]">
        <BracketSlot side="home" />
        <div className="h-px bg-slate-800" />
        <BracketSlot side="away" />
      </div>
    )
  }

  const status = getMatchStatus(game)
  return (
    <div className={`bg-slate-900 border rounded-xl p-3 space-y-1.5 min-w-[200px] ${
      status === 'live' ? 'border-green-500/40 shadow-lg shadow-green-500/10' : 'border-slate-800'
    }`}>
      {status === 'live' && (
        <div className="flex items-center gap-1 text-xs text-green-400 font-bold mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          LIVE {game.time_elapsed}&apos;
        </div>
      )}
      {status === 'scheduled' && (
        <div className="text-xs text-blue-400/70 mb-1">{formatMatchDateTime(game.local_date, timezone)}</div>
      )}
      <BracketSlot game={game} side="home" />
      <div className="h-px bg-slate-800" />
      <BracketSlot game={game} side="away" />
    </div>
  )
}

function ConnectorLine({ vertical = false }: { vertical?: boolean }) {
  if (vertical) return <div className="w-px h-full bg-slate-700 absolute left-1/2" />
  return <div className="h-px w-6 bg-slate-700 shrink-0" />
}

function BracketRound({ label, games, timezone }: { label: string; games: EnrichedGame[]; timezone: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">{label}</div>
      {games.map((g) => (
        <BracketMatchCard key={g.id} game={g} timezone={timezone} />
      ))}
    </div>
  )
}

function BracketView({ games, timezone, t }: { games: EnrichedGame[]; timezone: string; t: import('@/lib/i18n').Translations }) {
  const byType = (type: string) =>
    games.filter((g) => g.type === type).sort((a, b) => a.local_date.localeCompare(b.local_date))

  const r32 = byType('r32')
  const r16 = byType('r16')
  const qf  = byType('qf')
  const sf  = byType('sf')
  const finalGame = byType('final')[0]
  const thirdGame = byType('third')[0]

  const rounds: Array<{ label: string; games: EnrichedGame[] }> = [
    ...(r32.length ? [{ label: t.playoffs.r32, games: r32 }] : []),
    ...(r16.length ? [{ label: t.playoffs.r16, games: r16 }] : []),
    ...(qf.length  ? [{ label: t.playoffs.qf,  games: qf  }] : []),
    ...(sf.length  ? [{ label: t.playoffs.sf,  games: sf  }] : []),
  ]

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max items-start">
        {rounds.map(({ label, games: rGames }) => (
          <BracketRound key={label} label={label} games={rGames} timezone={timezone} />
        ))}

        {/* Final + 3rd Place column */}
        <div className="flex flex-col gap-4 min-w-[200px]">
          <div>
            <div className="text-xs font-bold text-amber-400/70 uppercase tracking-widest text-center mb-2">
              {t.playoffs.final}
            </div>
            <BracketMatchCard game={finalGame} timezone={timezone} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mb-2">
              {t.playoffs.third}
            </div>
            <BracketMatchCard game={thirdGame} timezone={timezone} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlayoffsPage() {
  const { t } = useT()
  const { timezone } = useSettings()
  const [round, setRound] = useState<Round>('bracket')

  const { data, error, isLoading } = useSWR<{ games: EnrichedGame[] }>(
    '/api/games', fetcher, { refreshInterval: 30_000 },
  )

  const allGames = data?.games ?? []
  const knockoutGames = allGames.filter((g) => g.type !== 'group')

  const roundMap: Record<string, EnrichedGame[]> = {
    r32: knockoutGames.filter((g) => g.type === 'r32'),
    r16: knockoutGames.filter((g) => g.type === 'r16'),
    qf: knockoutGames.filter((g) => g.type === 'qf'),
    sf: knockoutGames.filter((g) => g.type === 'sf'),
    third: knockoutGames.filter((g) => g.type === 'third'),
    final: knockoutGames.filter((g) => g.type === 'final'),
  }

  const TABS: { key: Round; label: string }[] = [
    { key: 'bracket', label: t.playoffs.bracket },
    { key: 'r32', label: t.playoffs.r32 },
    { key: 'r16', label: t.playoffs.r16 },
    { key: 'qf', label: t.playoffs.qf },
    { key: 'sf', label: t.playoffs.sf },
    { key: 'third', label: t.playoffs.third },
    { key: 'final', label: t.playoffs.final },
  ]

  const currentGames = round === 'bracket' ? knockoutGames : (roundMap[round] ?? [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">{t.playoffs.title}</h1>
        <p className="text-slate-400 text-sm">{t.playoffs.subtitle}</p>
      </div>

      {/* Round tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setRound(key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              round === key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">
          {t.errors.games}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 size={20} className="animate-spin" />{t.loading.generic}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {round === 'bracket' ? (
            <div>
              {knockoutGames.length === 0 ? (
                <div className="text-slate-500 text-center py-20">{t.playoffs.noGames}</div>
              ) : (
                <BracketView games={knockoutGames} timezone={timezone} t={t} />
              )}
            </div>
          ) : (
            <div>
              {currentGames.length === 0 ? (
                <div className="text-slate-500 text-center py-20">{t.playoffs.noGames}</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentGames.map((g) => (
                    <MatchCard key={g.id} game={g} showPredictLink />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
