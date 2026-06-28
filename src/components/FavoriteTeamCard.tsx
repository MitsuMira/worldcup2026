'use client'

import Link from 'next/link'
import TeamFlag from './TeamFlag'
import type { ApiTeam, EnrichedGame, EnrichedGroup } from '@/lib/types'
import { getMatchStatus, getTeamName, parseMatchDate } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'
import MiniCountdown from './MiniCountdown'

const ROUND_PRIO: Record<string, number> = { final: 0, third: 0, sf: 1, qf: 2, r16: 3, r32: 4 }

interface Props {
  team: ApiTeam
  games: EnrichedGame[]
  groups: EnrichedGroup[]
}

export default function FavoriteTeamCard({ team, games, groups }: Props) {
  const { t } = useT()

  const teamGames = games.filter((g) => g.home_team_id === team.id || g.away_team_id === team.id)

  const lastGame = [...teamGames]
    .filter((g) => getMatchStatus(g) === 'finished')
    .sort((a, b) => {
      const da = parseMatchDate(a.local_date)?.getTime() ?? 0
      const db = parseMatchDate(b.local_date)?.getTime() ?? 0
      return db - da
    })[0]

  const nextGame = teamGames
    .filter((g) => getMatchStatus(g) === 'scheduled' || getMatchStatus(g) === 'live')
    .sort((a, b) => {
      const da = parseMatchDate(a.local_date)?.getTime() ?? 0
      const db = parseMatchDate(b.local_date)?.getTime() ?? 0
      return da - db
    })[0]

  const teamGroup = groups.find((g) => g.group === team.groups)
  const standing = teamGroup?.standings.findIndex((s) => s.team_id === team.id)
  const position = standing !== undefined && standing >= 0 ? standing + 1 : null
  const pts = teamGroup?.standings.find((s) => s.team_id === team.id)?.pts

  const knockoutGames = teamGames.filter((g) => g.type !== 'group')
  const koRound = knockoutGames.reduce<string | null>((best, g) => {
    const prio = ROUND_PRIO[g.type] ?? 99
    return best === null || prio < (ROUND_PRIO[best] ?? 99) ? g.type : best
  }, null)

  const groupGames = teamGames.filter((g) => g.type === 'group')
  const groupComplete = groupGames.length > 0 && groupGames.every((g) => getMatchStatus(g) === 'finished')
  const isEliminated = groupComplete && !koRound

  return (
    <Link
      href={`/teams/${team.id}`}
      className="block bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-amber-500/40 hover:bg-slate-800/50 transition-all"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <TeamFlag team={team} size="md" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm truncate">{team.name_en}</div>
          <div className="text-xs text-slate-500">{team.fifa_code}</div>
        </div>
        <div className="text-right flex-shrink-0">
          {koRound ? (
            <>
              <div className="text-xs text-slate-500">{t.favorites.groupPos} {team.groups}</div>
              <div className="text-xs font-bold text-emerald-400">🏆 {({
                r32: t.match.stageR32, r16: t.match.stageR16, qf: t.match.stageQF,
                sf: t.match.stageSF, third: t.match.stageThird, final: t.match.stageFinal,
              } as Record<string, string>)[koRound] ?? koRound}</div>
            </>
          ) : isEliminated ? (
            <>
              <div className="text-xs text-slate-500">{t.favorites.groupPos} {team.groups}</div>
              <div className="text-xs font-bold text-red-400">{t.teams.eliminated}</div>
            </>
          ) : (
            <>
              <div className="text-xs text-slate-500">{t.favorites.groupPos} {team.groups}</div>
              {position !== null && (
                <div className={`text-sm font-black ${position <= 2 ? 'text-green-400' : 'text-slate-400'}`}>
                  #{position}
                  {pts !== undefined && <span className="text-xs font-normal text-slate-500 ml-1">{pts}pts</span>}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Last result */}
      {lastGame && (
        <div className="text-xs mb-1.5 flex items-center gap-1.5">
          <span className="text-slate-600 shrink-0">{t.favorites.lastMatch}:</span>
          <span className="text-slate-400">
            {getTeamName(lastGame, 'home')} {lastGame.home_score}–{lastGame.away_score} {getTeamName(lastGame, 'away')}
          </span>
          <span className="text-slate-600 shrink-0 ml-auto">FT</span>
        </div>
      )}

      {/* Next match */}
      {nextGame && (
        <div className="text-xs flex items-center gap-1.5">
          <span className="text-slate-600 shrink-0">{t.favorites.nextMatch}:</span>
          <span className="text-slate-400 truncate">
            {getTeamName(nextGame, 'home')} {t.match.vs} {getTeamName(nextGame, 'away')}
          </span>
          {getMatchStatus(nextGame) === 'live' ? (
            <span className="ml-auto text-green-400 font-bold shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              {t.match.live}
            </span>
          ) : (
            (() => {
              const d = parseMatchDate(nextGame.local_date)
              return d ? (
                <MiniCountdown
                  target={d}
                  className="ml-auto text-slate-500 font-mono shrink-0 tabular-nums"
                />
              ) : null
            })()
          )}
        </div>
      )}

      {!lastGame && !nextGame && (
        <div className="text-xs text-slate-600">{t.teamDetail.noMatches}</div>
      )}
    </Link>
  )
}
