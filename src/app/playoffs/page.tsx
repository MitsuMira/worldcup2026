'use client'

import useSWR from 'swr'
import { useState } from 'react'
import MatchCard from '@/components/MatchCard'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame } from '@/lib/types'
import { getMatchStatus, getTeamName, formatTime } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'
import { useSettings } from '@/contexts/SettingsContext'
import type { Translations } from '@/lib/i18n'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Round = 'bracket' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

// ─── Bracket layout constants ────────────────────────────────────────────────
// CARD_H must match the actual rendered height of BracketCard.
// p-2 (16px) + h-4 status (16px) + 3×space-y-1 (12px) + 2×slot-py-1 (2×32px) + divider (1px) = 109px → round to 112
const CARD_H = 112
const CARD_GAP = 8
const BASE = CARD_H + CARD_GAP // vertical step per game in the first round

// WC 2026 knockout structure: R32→R16→QF→SF→Final
const ROUND_META = {
  r32: { count: 16, absIdx: 0 },
  r16: { count: 8,  absIdx: 1 },
  qf:  { count: 4,  absIdx: 2 },
  sf:  { count: 2,  absIdx: 3 },
} as const

// Compute the `top` px value for game[gameIdx] in the given round.
// absIdx is the absolute round position (0=R32, …, 4=Final).
// firstAbsIdx is the absIdx of the earliest displayed round.
// The formula places each card so its centre is the midpoint of the two
// source-round cards that feed into it.
function bracketTop(absIdx: number, gameIdx: number, firstAbsIdx: number): number {
  const rel = absIdx - firstAbsIdx
  const factor = Math.pow(2, rel)
  return (factor - 1) * BASE / 2 + gameIdx * factor * BASE
}

// ─── Bracket slot (single team row) ─────────────────────────────────────────
function BracketSlot({ game, side }: { game?: EnrichedGame; side: 'home' | 'away' }) {
  if (!game) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="w-5 h-5 rounded bg-slate-700/50 shrink-0" />
        <span className="text-slate-500 text-xs font-medium">TBD</span>
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
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition-colors ${
      isWinner
        ? 'bg-green-500/10 border-green-500/30'
        : status === 'finished'
          ? 'bg-slate-800/30 border-slate-700/30'
          : 'bg-slate-800/50 border-slate-700/50'
    }`}>
      <TeamFlag team={team} name={name} size="sm" />
      <span className={`text-xs font-medium flex-1 truncate ${isWinner ? 'text-green-300' : 'text-white'}`}>
        {name}
      </span>
      {status !== 'scheduled' && (
        <span className={`text-xs font-black tabular-nums ${isWinner ? 'text-green-300' : 'text-slate-400'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

// ─── Single bracket match card ───────────────────────────────────────────────
// Fixed height (CARD_H) so the alignment formula stays accurate.
function BracketCard({ game, timezone }: { game?: EnrichedGame; timezone: string }) {
  const status = game ? getMatchStatus(game) : null

  return (
    <div
      className={`bg-slate-900 border rounded-xl p-2 space-y-1 overflow-hidden ${
        status === 'live' ? 'border-green-500/40 shadow shadow-green-500/10' : 'border-slate-800'
      }`}
      style={{ height: CARD_H }}
    >
      {/* Status line — always rendered (h-4) so card height stays constant */}
      <div className="h-4 flex items-center">
        {status === 'live' && game && (
          <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE {game.time_elapsed}&apos;
          </span>
        )}
        {status === 'scheduled' && game && (
          <span className="text-[10px] text-blue-400/70">{formatTime(game.local_date, timezone)}</span>
        )}
        {status === 'finished' && (
          <span className="text-[10px] text-slate-500 font-bold">FT</span>
        )}
      </div>

      <BracketSlot game={game} side="home" />
      <div className="h-px bg-slate-800" />
      <BracketSlot game={game} side="away" />
    </div>
  )
}

// ─── Aligned bracket view ────────────────────────────────────────────────────
function BracketView({ games, timezone, t }: { games: EnrichedGame[]; timezone: string; t: Translations }) {
  const byType = (type: string) =>
    games.filter((g) => g.type === type).sort((a, b) => a.local_date.localeCompare(b.local_date))

  const roundGames = {
    r32:   byType('r32'),
    r16:   byType('r16'),
    qf:    byType('qf'),
    sf:    byType('sf'),
    final: byType('final'),
    third: byType('third'),
  }

  const activeKeys = (['r32', 'r16', 'qf', 'sf'] as const).filter(
    (k) => roundGames[k].length > 0,
  )

  if (!activeKeys.length && !roundGames.final.length && !roundGames.third.length) {
    return <div className="text-slate-500 text-center py-20">{t.playoffs.noGames}</div>
  }

  const firstKey = activeKeys[0] ?? 'sf'
  const { count: firstCount, absIdx: firstAbsIdx } = ROUND_META[firstKey] ?? { count: 2, absIdx: 3 }
  const containerH = firstCount * BASE - CARD_GAP

  // Final sits at the same vertical level as round index 4 (one beyond SF)
  const finalTop = bracketTop(4, 0, firstAbsIdx)

  const roundLabels: Record<string, string> = {
    r32: t.playoffs.r32, r16: t.playoffs.r16, qf: t.playoffs.qf, sf: t.playoffs.sf,
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-2 min-w-max items-start">

        {/* Knockout rounds R32 → SF */}
        {activeKeys.map((key) => {
          const { count, absIdx } = ROUND_META[key]
          const padded = Array.from(
            { length: count },
            (_, i) => roundGames[key][i] as EnrichedGame | undefined,
          )
          return (
            <div key={key} className="flex flex-col">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mb-2">
                {roundLabels[key]}
              </div>
              <div className="relative w-[196px]" style={{ height: containerH }}>
                {padded.map((game, i) => (
                  <div
                    key={game?.id ?? `empty-${i}`}
                    className="absolute left-0 right-0"
                    style={{ top: bracketTop(absIdx, i, firstAbsIdx) }}
                  >
                    <BracketCard game={game} timezone={timezone} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Final + 3rd Place — same column, vertically centred in the bracket */}
        <div className="flex flex-col">
          <div className="text-xs font-bold text-amber-400/70 uppercase tracking-widest text-center mb-2">
            {t.playoffs.final}
          </div>
          <div className="relative w-[196px]" style={{ height: containerH }}>
            <div className="absolute left-0 right-0" style={{ top: finalTop }}>
              <BracketCard game={roundGames.final[0]} timezone={timezone} />
            </div>
            <div className="absolute left-0 right-0" style={{ top: finalTop + CARD_H + 28 }}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">
                {t.playoffs.third}
              </div>
              <BracketCard game={roundGames.third[0]} timezone={timezone} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
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
    r32:   knockoutGames.filter((g) => g.type === 'r32'),
    r16:   knockoutGames.filter((g) => g.type === 'r16'),
    qf:    knockoutGames.filter((g) => g.type === 'qf'),
    sf:    knockoutGames.filter((g) => g.type === 'sf'),
    third: knockoutGames.filter((g) => g.type === 'third'),
    final: knockoutGames.filter((g) => g.type === 'final'),
  }

  const TABS: { key: Round; label: string }[] = [
    { key: 'bracket', label: t.playoffs.bracket },
    { key: 'r32',     label: t.playoffs.r32 },
    { key: 'r16',     label: t.playoffs.r16 },
    { key: 'qf',      label: t.playoffs.qf },
    { key: 'sf',      label: t.playoffs.sf },
    { key: 'third',   label: t.playoffs.third },
    { key: 'final',   label: t.playoffs.final },
  ]

  const currentGames = round === 'bracket' ? knockoutGames : (roundMap[round] ?? [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">{t.playoffs.title}</h1>
        <p className="text-slate-400 text-sm">{t.playoffs.subtitle}</p>
      </div>

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
            knockoutGames.length === 0
              ? <div className="text-slate-500 text-center py-20">{t.playoffs.noGames}</div>
              : <BracketView games={knockoutGames} timezone={timezone} t={t} />
          ) : (
            currentGames.length === 0
              ? <div className="text-slate-500 text-center py-20">{t.playoffs.noGames}</div>
              : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentGames.map((g) => (
                    <MatchCard key={g.id} game={g} showPredictLink />
                  ))}
                </div>
              )
          )}
        </>
      )}
    </div>
  )
}
