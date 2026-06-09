'use client'

import useSWR from 'swr'
import { useState } from 'react'
import MatchCard from '@/components/MatchCard'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame } from '@/lib/types'
import { getMatchStatus, getTeamName, formatMatchDateTime, getVenueTimezone } from '@/lib/utils'
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
        <div className="text-xs text-blue-400/70 mb-1">{formatMatchDateTime(game.local_date, timezone, getVenueTimezone(game))}</div>
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

function BracketView({ games, timezone }: { games: EnrichedGame[]; timezone: string }) {
  const qf = games.filter((g) => g.type === 'qf').slice(0, 4)
  const sf = games.filter((g) => g.type === 'sf').slice(0, 2)
  const final = games.filter((g) => g.type === 'final').slice(0, 1)
  const third = games.filter((g) => g.type === 'third').slice(0, 1)

  const padToLength = (arr: EnrichedGame[], len: number): (EnrichedGame | undefined)[] => {
    const result: (EnrichedGame | undefined)[] = [...arr]
    while (result.length < len) result.push(undefined)
    return result
  }

  const qfGames = padToLength(qf, 4)
  const sfGames = padToLength(sf, 2)
  const finalGame = padToLength(final, 1)[0]
  const thirdGame = padToLength(third, 1)[0]

  return (
    <div className="overflow-x-auto pb-4">
      {/* Full bracket tree */}
      <div className="flex items-start gap-0 min-w-[760px]">
        {/* QF Left (1 & 2) */}
        <div className="flex flex-col justify-around" style={{ gap: '12px', paddingTop: '32px', paddingBottom: '32px' }}>
          {qfGames.slice(0, 2).map((g, i) => (
            <BracketMatchCard key={g?.id ?? `qf-left-${i}`} game={g} timezone={timezone} />
          ))}
        </div>

        {/* Connector left → SF1 */}
        <div className="flex flex-col justify-center shrink-0" style={{ height: '100%', minHeight: '280px' }}>
          <div className="relative w-8 h-full flex flex-col justify-around" style={{ paddingTop: '72px', paddingBottom: '72px' }}>
            <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-slate-700" />
            <div className="h-px w-8 bg-slate-700 absolute top-1/4" />
            <div className="h-px w-8 bg-slate-700 absolute bottom-1/4" />
            <div className="h-px w-4 bg-slate-700 absolute" style={{ top: 'calc(50%)', left: '50%' }} />
          </div>
        </div>

        {/* SF left */}
        <div className="flex flex-col justify-center" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
          <BracketMatchCard key={sfGames[0]?.id ?? 'sf-1'} game={sfGames[0]} timezone={timezone} />
        </div>

        {/* Connector SF1 → Final */}
        <div className="flex items-center shrink-0">
          <div className="h-px w-8 bg-slate-700" />
        </div>

        {/* Final + 3rd Place */}
        <div className="flex flex-col gap-6 justify-center" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
          <div>
            <div className="text-xs font-bold text-amber-400/70 uppercase tracking-widest text-center mb-2">Final</div>
            <BracketMatchCard game={finalGame} timezone={timezone} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mb-2">3rd Place</div>
            <BracketMatchCard game={thirdGame} timezone={timezone} />
          </div>
        </div>

        {/* Connector Final ← SF2 */}
        <div className="flex items-center shrink-0">
          <div className="h-px w-8 bg-slate-700" />
        </div>

        {/* SF right */}
        <div className="flex flex-col justify-center" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
          <BracketMatchCard key={sfGames[1]?.id ?? 'sf-2'} game={sfGames[1]} timezone={timezone} />
        </div>

        {/* Connector right → QF 3&4 */}
        <div className="flex flex-col justify-center shrink-0" style={{ height: '100%', minHeight: '280px' }}>
          <div className="relative w-8 h-full flex flex-col justify-around" style={{ paddingTop: '72px', paddingBottom: '72px' }}>
            <div className="absolute right-0 top-1/4 bottom-1/4 w-px bg-slate-700" />
            <div className="h-px w-8 bg-slate-700 absolute top-1/4 right-0" />
            <div className="h-px w-8 bg-slate-700 absolute bottom-1/4 right-0" />
          </div>
        </div>

        {/* QF Right (3 & 4) */}
        <div className="flex flex-col justify-around" style={{ gap: '12px', paddingTop: '32px', paddingBottom: '32px' }}>
          {qfGames.slice(2, 4).map((g, i) => (
            <BracketMatchCard key={g?.id ?? `qf-right-${i}`} game={g} timezone={timezone} />
          ))}
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
                <BracketView games={knockoutGames} timezone={timezone} />
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
