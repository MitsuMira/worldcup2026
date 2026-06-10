'use client'

import useSWR from 'swr'
import { useState } from 'react'
import MatchCard from '@/components/MatchCard'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame } from '@/lib/types'
import { getMatchStatus, getTeamName, formatTime, parseMatchDate } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'
import { useSettings } from '@/contexts/SettingsContext'
import type { Translations } from '@/lib/i18n'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Round = 'bracket' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

// ─── Layout constants ────────────────────────────────────────────────────────
// CARD_H must equal the actual rendered height of BracketCard (checked via CSS):
//   p-2 (16) + h-5 (20) + 3×space-y-1 (12) + 2×slot py-1 (2×32) + divider (1) = 113 → 116
const CARD_H = 116
const CARD_GAP = 8
const BASE  = CARD_H + CARD_GAP   // vertical stride between same-round cards in a half

// Expected games per half for each round in the WC2026 bracket
const HALF_COUNT: Record<string, number> = { r32: 8, r16: 4, qf: 2, sf: 1 }

// Vertical top position for game[idx] in a round.
// absIdx = 0 → outermost round (R32), absIdx = 3 → SF
function halfTop(absIdx: number, idx: number): number {
  const f = Math.pow(2, absIdx)
  return (f - 1) * BASE / 2 + idx * f * BASE
}

// ─── Bracket slot ────────────────────────────────────────────────────────────
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
  const other = side === 'home' ? game.away_score : game.home_score
  const status = getMatchStatus(game)
  const won = status === 'finished' && parseInt(score) > parseInt(other)

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition-colors ${
      won         ? 'bg-green-500/10 border-green-500/30'
      : status === 'finished' ? 'bg-slate-800/30 border-slate-700/30'
      : 'bg-slate-800/50 border-slate-700/50'
    }`}>
      <TeamFlag team={team} name={name} size="sm" />
      <span className={`text-xs font-medium flex-1 truncate ${won ? 'text-green-300' : 'text-white'}`}>
        {name}
      </span>
      {status !== 'scheduled' && (
        <span className={`text-xs font-black tabular-nums ${won ? 'text-green-300' : 'text-slate-400'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

// ─── Single card ─────────────────────────────────────────────────────────────
function BracketCard({ game, timezone }: { game?: EnrichedGame; timezone: string }) {
  const status = game ? getMatchStatus(game) : null
  const d = game ? parseMatchDate(game.local_date) : null
  const dateStr = d?.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', ...(timezone ? { timeZone: timezone } : {}),
  })
  const timeStr = game ? formatTime(game.local_date, timezone) : ''

  return (
    <div
      className={`bg-slate-900 border rounded-xl p-2 space-y-1 overflow-hidden ${
        status === 'live' ? 'border-green-500/40 shadow shadow-green-500/10' : 'border-slate-800'
      }`}
      style={{ height: CARD_H }}
    >
      <div className="h-5 flex items-center">
        {status === 'live' && game && (
          <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE {game.time_elapsed}&apos;
          </span>
        )}
        {status === 'scheduled' && game && (
          <span className="text-[10px] text-blue-400/70 font-medium">{dateStr} · {timeStr}</span>
        )}
        {status === 'finished' && (
          <span className="text-[10px] text-slate-500 font-bold">FT · {dateStr}</span>
        )}
      </div>
      <BracketSlot game={game} side="home" />
      <div className="h-px bg-slate-800" />
      <BracketSlot game={game} side="away" />
    </div>
  )
}

// ─── One half of the bracket (left or right) ─────────────────────────────────
// rounds: ordered outer → inner (e.g. R32 first, SF last)
// flip:   true for the right half — columns are rendered inner → outer
function HalfBracket({
  rounds,
  flip,
  timezone,
}: {
  rounds: { key: string; label: string; padded: (EnrichedGame | undefined)[]; absIdx: number }[]
  flip: boolean
  timezone: string
}) {
  if (!rounds.length) return null
  const firstCount = rounds[0].padded.length
  const containerH = firstCount * BASE - CARD_GAP
  const cols = flip ? [...rounds].reverse() : rounds

  return (
    <div className={`flex gap-2 ${flip ? 'flex-row-reverse' : ''}`}>
      {cols.map(({ key, label, padded, absIdx }) => (
        <div key={key} className="flex flex-col">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mb-2">
            {label}
          </div>
          <div className="relative w-[196px]" style={{ height: containerH }}>
            {padded.map((game, i) => (
              <div
                key={game?.id ?? `empty-${key}-${i}`}
                className="absolute left-0 right-0"
                style={{ top: halfTop(absIdx, i) }}
              >
                <BracketCard game={game} timezone={timezone} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Full split bracket ───────────────────────────────────────────────────────
function SplitBracketView({ games, timezone, t }: { games: EnrichedGame[]; timezone: string; t: Translations }) {
  const byType = (type: string) =>
    games.filter((g) => g.type === type).sort((a, b) => a.local_date.localeCompare(b.local_date))

  const r32   = byType('r32')
  const r16   = byType('r16')
  const qf    = byType('qf')
  const sf    = byType('sf')
  const final = byType('final')[0]
  const third = byType('third')[0]

  // Active round keys (only rounds that have data)
  const ROUND_ORDER = ['r32', 'r16', 'qf', 'sf'] as const
  const active = ROUND_ORDER.filter((k) => {
    if (k === 'r32') return r32.length > 0
    if (k === 'r16') return r16.length > 0
    if (k === 'qf')  return qf.length  > 0
    return sf.length > 0
  })

  if (!active.length && !final && !third) {
    return <div className="text-slate-500 text-center py-20">{t.playoffs.noGames}</div>
  }

  const allByKey: Record<string, EnrichedGame[]> = { r32, r16, qf, sf }
  const labels: Record<string, string> = {
    r32: t.playoffs.r32, r16: t.playoffs.r16, qf: t.playoffs.qf, sf: t.playoffs.sf,
  }

  const firstKey = active[0] ?? 'sf'
  const firstHalfCount = HALF_COUNT[firstKey] ?? 1
  const containerH = firstHalfCount * BASE - CARD_GAP

  // Build left/right half round specs
  function makeHalfRounds(halfIdx: 0 | 1) {
    return active.map((key, absIdx) => {
      const count = HALF_COUNT[key]
      const start = halfIdx * count
      const sliced = allByKey[key].slice(start, start + count)
      const padded = Array.from({ length: count }, (_, i) => sliced[i] as EnrichedGame | undefined)
      return { key: `${key}-${halfIdx}`, label: labels[key], padded, absIdx }
    })
  }

  const leftRounds  = makeHalfRounds(0)
  const rightRounds = makeHalfRounds(1)

  // Final is positioned at the same top as the SF games
  const sfAbsIdx = active.indexOf('sf')
  const finalTop = sfAbsIdx >= 0 ? halfTop(sfAbsIdx, 0) : halfTop(active.length - 1, 0)

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-2 min-w-max items-start">

        {/* Left half: R32 → R16 → QF → SF */}
        <HalfBracket rounds={leftRounds} flip={false} timezone={timezone} />

        {/* Final + 3rd Place — centre column */}
        <div className="flex flex-col">
          <div className="text-xs font-bold text-amber-400/70 uppercase tracking-widest text-center mb-2">
            {t.playoffs.final}
          </div>
          <div className="relative w-[196px]" style={{ height: containerH }}>
            <div className="absolute left-0 right-0" style={{ top: finalTop }}>
              <BracketCard game={final} timezone={timezone} />
            </div>
            <div className="absolute left-0 right-0" style={{ top: finalTop + CARD_H + 28 }}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1">
                {t.playoffs.third}
              </div>
              <BracketCard game={third} timezone={timezone} />
            </div>
          </div>
        </div>

        {/* Right half (mirrored): SF → QF → R16 → R32 */}
        <HalfBracket rounds={rightRounds} flip={true} timezone={timezone} />

      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
              : <SplitBracketView games={knockoutGames} timezone={timezone} t={t} />
          ) : (
            currentGames.length === 0
              ? <div className="text-slate-500 text-center py-20">{t.playoffs.noGames}</div>
              : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentGames.map((g) => <MatchCard key={g.id} game={g} showPredictLink />)}
                </div>
              )
          )}
        </>
      )}
    </div>
  )
}
