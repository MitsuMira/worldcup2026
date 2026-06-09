'use client'

import Link from 'next/link'
import TeamFlag from './TeamFlag'
import type { EnrichedGame } from '@/lib/types'
import { getMatchStatus, getStatusLabel, getScorers, getTeamName, formatMatchDateTime } from '@/lib/utils'
import { localStageLabel } from '@/lib/i18n'
import { useT } from '@/contexts/LanguageContext'
import { MapPin } from 'lucide-react'

interface Props {
  game: EnrichedGame
  showPredictLink?: boolean
}

export default function MatchCard({ game, showPredictLink = false }: Props) {
  const { t } = useT()
  const status = getMatchStatus(game)
  const statusLabel = getStatusLabel(game)
  const homeScorers = getScorers(game.home_scorers)
  const awayScorers = getScorers(game.away_scorers)
  const homeName = getTeamName(game, 'home')
  const awayName = getTeamName(game, 'away')
  const stageLabel = localStageLabel(game.type, game.group, t)

  return (
    <div
      className={`relative bg-slate-900 border rounded-xl p-4 transition-all hover:border-slate-600 ${
        status === 'live'
          ? 'border-green-500/50 shadow-lg shadow-green-500/10'
          : 'border-slate-800'
      }`}
    >
      {/* Stage + status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{stageLabel}</span>
        {status === 'live' ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {t.match.live} {game.time_elapsed}&apos;
          </span>
        ) : status === 'finished' ? (
          <span className="text-xs text-slate-500 font-semibold">FT</span>
        ) : (
          <span className="text-xs text-blue-400 font-medium">
            {formatMatchDateTime(game.local_date)}
          </span>
        )}
      </div>

      {/* Teams and score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1 w-24 sm:w-32">
          <TeamFlag team={game.homeTeam} name={homeName} size="lg" />
          <span className="text-xs sm:text-sm text-white font-semibold text-center leading-tight mt-1">
            {homeName}
          </span>
          {game.homeTeam?.fifa_code && (
            <span className="text-xs text-slate-500">{game.homeTeam.fifa_code}</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {status === 'scheduled' ? (
            <span className="text-2xl font-bold text-slate-500">{t.match.vs}</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-black tabular-nums ${status === 'live' ? 'text-white' : 'text-slate-300'}`}>
                {game.home_score}
              </span>
              <span className="text-xl text-slate-600">–</span>
              <span className={`text-3xl font-black tabular-nums ${status === 'live' ? 'text-white' : 'text-slate-300'}`}>
                {game.away_score}
              </span>
            </div>
          )}
          {status === 'live' && (
            <span className="text-xs text-green-400 font-bold">{statusLabel}</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 w-24 sm:w-32">
          <TeamFlag team={game.awayTeam} name={awayName} size="lg" />
          <span className="text-xs sm:text-sm text-white font-semibold text-center leading-tight mt-1">
            {awayName}
          </span>
          {game.awayTeam?.fifa_code && (
            <span className="text-xs text-slate-500">{game.awayTeam.fifa_code}</span>
          )}
        </div>
      </div>

      {(homeScorers.length > 0 || awayScorers.length > 0) && (
        <div className="mt-3 flex justify-between text-xs text-slate-400 gap-4">
          <div className="flex-1">{homeScorers.map((s) => `⚽ ${s}`).join(' · ')}</div>
          <div className="flex-1 text-right">{awayScorers.map((s) => `⚽ ${s}`).join(' · ')}</div>
        </div>
      )}

      {game.stadium && (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
          <MapPin size={11} />
          <span>{game.stadium.name_en} · {game.stadium.city_en}</span>
        </div>
      )}

      {showPredictLink && status === 'scheduled' && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <Link
            href={`/predictions?match=${game.id}`}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
          >
            {t.match.predict}
          </Link>
        </div>
      )}
    </div>
  )
}
