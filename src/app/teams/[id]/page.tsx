'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { Star } from 'lucide-react'
import TeamFlag from '@/components/TeamFlag'
import GroupTable from '@/components/GroupTable'
import MatchCard from '@/components/MatchCard'
import type { ApiTeam, EnrichedGame, EnrichedGroup, MatchDetail, RosterPlayer } from '@/lib/types'
import { FIFA_RANK } from '@/lib/fifaRanking'
import { FIFA_SQUADS_BY_CODE, type FifaPlayer } from '@/lib/fifaSquads'
import { getMatchStatus, parseMatchDate, getVenueTimezone } from '@/lib/utils'
import { BRACKET_POSITIONS, isEspnPlaceholder } from '@/lib/bracketStructure'
import { simulateLiveStandings } from '@/lib/simulateLiveStandings'
import { useT } from '@/contexts/LanguageContext'
import { useFavorites } from '@/contexts/FavoriteTeamsContext'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ── Bracket traversal for future opponent computation ─────────────────────────

const KO_NEXT: Record<number, number> = {
  73:90,74:89,75:90,76:91,77:89,78:91,79:92,80:92,
  81:94,82:94,83:93,84:93,85:96,86:95,87:96,88:95,
  89:97,90:97,91:99,92:99,93:98,94:98,95:100,96:100,
  97:101,98:101,99:102,100:102,101:103,102:103,
}
const KO_FEEDERS: Record<number, [number, number]> = {
  89:[74,77],90:[73,75],91:[76,78],92:[79,80],
  93:[83,84],94:[81,82],95:[86,88],96:[85,87],
  97:[89,90],98:[93,94],99:[91,92],100:[95,96],
  101:[97,98],102:[99,100],103:[101,102],
}
const KO_ROUND: Record<number, string> = {
  89:'r16',90:'r16',91:'r16',92:'r16',93:'r16',94:'r16',95:'r16',96:'r16',
  97:'qf',98:'qf',99:'qf',100:'qf',
  101:'sf',102:'sf',103:'final',
}

function getGameMatchNum(game: EnrichedGame): number | null {
  const tz = getVenueTimezone(game)
  const d = parseMatchDate(game.local_date)
  if (!d) return null
  const dateStr = d.toLocaleDateString('sv-SE', { timeZone: tz })
  const rawCity = game.stadium?.city_en ?? ''
  const bp = BRACKET_POSITIONS.get(`${dateStr}_${rawCity}`) ??
             BRACKET_POSITIONS.get(`${dateStr}_${rawCity.split(',')[0].trim()}`)
  return bp?.matchNum ?? null
}

function getPossibleOpponents(
  matchNum: number,
  gameByMatchNum: Map<number, EnrichedGame>,
  allTeams: ApiTeam[],
): ApiTeam[] {
  const game = gameByMatchNum.get(matchNum)
  if (game) {
    const st = getMatchStatus(game)
    if (st === 'finished') {
      const hs = parseInt(game.home_score), as_ = parseInt(game.away_score)
      if (!isNaN(hs) && !isNaN(as_)) {
        const winnerId = hs > as_ ? game.home_team_id : game.away_team_id
        const w = allTeams.find(t => t.id === winnerId)
        return w ? [w] : []
      }
    }
    const res: ApiTeam[] = []
    if (!isEspnPlaceholder(game.home_team_name_en ?? '')) {
      const t = allTeams.find(tm => tm.id === game.home_team_id)
      if (t) res.push(t)
    }
    if (!isEspnPlaceholder(game.away_team_name_en ?? '')) {
      const t = allTeams.find(tm => tm.id === game.away_team_id)
      if (t) res.push(t)
    }
    if (res.length > 0) return res
  }
  const feeders = KO_FEEDERS[matchNum]
  if (!feeders) return []
  return [
    ...getPossibleOpponents(feeders[0], gameByMatchNum, allTeams),
    ...getPossibleOpponents(feeders[1], gameByMatchNum, allTeams),
  ]
}

const JOURNEY_ROUNDS = ['r32', 'r16', 'qf', 'sf', 'third', 'final'] as const
type JourneyRound = typeof JOURNEY_ROUNDS[number]

// ─────────────────────────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useT()
  const { isFavorite, toggleFavorite } = useFavorites()

  const { data: teamsData, isLoading: teamsLoading } = useSWR<{ teams: ApiTeam[] }>('/api/teams', fetcher, { revalidateOnFocus: false })
  const { data: gamesData, isLoading: gamesLoading } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 30_000 })
  const { data: groupsData } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, { refreshInterval: 60_000 })

  const teams = teamsData?.teams ?? []
  const games = gamesData?.games ?? []
  const rawGroups = groupsData?.groups ?? []
  const { groups, liveGroupLetters } = simulateLiveStandings(rawGroups, games)

  const team = teams.find((tm) => tm.id === id)
  const isLoading = teamsLoading || gamesLoading


  const teamGames = games
    .filter((g) => g.home_team_id === id || g.away_team_id === id)
    .sort((a, b) => (parseMatchDate(a.local_date)?.getTime() ?? 0) - (parseMatchDate(b.local_date)?.getTime() ?? 0))

  const finishedGames = teamGames.filter((g) => getMatchStatus(g) === 'finished')
  const upcomingGames = teamGames.filter((g) => getMatchStatus(g) !== 'finished')
  const teamGroup = groups.find((g) =>
    (g.group && g.group === team?.groups) ||
    g.standings.some((s) => s.team_id === team?.id)
  )

  // Compute W/D/L from finished games
  let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0
  for (const g of finishedGames) {
    const isHome = g.home_team_id === id
    const ts = parseInt(isHome ? g.home_score : g.away_score)
    const os = parseInt(isHome ? g.away_score : g.home_score)
    if (isNaN(ts) || isNaN(os)) continue
    played++; gf += ts; ga += os
    if (ts > os) won++
    else if (ts === os) drawn++
    else lost++
  }
  const pts = won * 3 + drawn
  const gd = gf - ga

  // Aggregate goal scorers from finished games
  const scorerMap = new Map<string, number>()
  for (const g of finishedGames) {
    const isHome = g.home_team_id === id
    const raw = isHome ? g.home_scorers : g.away_scorers
    if (raw && raw !== 'null') {
      raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((name) => {
        scorerMap.set(name, (scorerMap.get(name) ?? 0) + 1)
      })
    }
  }
  const topScorers = [...scorerMap.entries()].sort((a, b) => b[1] - a[1])

  // Playoff / group phase detection
  const groupGames = teamGames.filter((g) => g.type === 'group')
  const knockoutGames = teamGames.filter((g) => g.type !== 'group')
  const hasKnockoutGames = knockoutGames.length > 0
  const groupComplete = groupGames.length > 0 && groupGames.every((g) => getMatchStatus(g) === 'finished')
  const isEliminatedAtGroup = groupComplete && !hasKnockoutGames

  const knockoutByRound: Partial<Record<JourneyRound, EnrichedGame>> = {}
  for (const g of knockoutGames) knockoutByRound[g.type as JourneyRound] = g

  const currentKoRound = (['final', 'third', 'sf', 'qf', 'r16', 'r32'] as JourneyRound[]).find((r) => knockoutByRound[r])
  const ROUND_SHORT: Record<string, string> = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: '3rd', final: 'Final' }

  // Build matchNum → game map for bracket lookups
  const gameByMatchNum = new Map<number, EnrichedGame>()
  for (const game of games) {
    const mn = getGameMatchNum(game)
    if (mn) gameByMatchNum.set(mn, game)
  }

  // Compute possible future opponent rows
  type FutureRow = { round: string; possibleTeams: ApiTeam[]; scheduledGame?: EnrichedGame }
  const futureOpponentRows: FutureRow[] = []
  if (hasKnockoutGames && currentKoRound && currentKoRound !== 'final' && currentKoRound !== 'third') {
    const curGame = knockoutByRound[currentKoRound]
    const myMatchNum = curGame ? getGameMatchNum(curGame) : null
    if (myMatchNum) {
      let cur = myMatchNum
      while (KO_NEXT[cur]) {
        const nextMn = KO_NEXT[cur]
        const round = KO_ROUND[nextMn]
        if (round && !knockoutByRound[round as JourneyRound]) {
          const feeders = KO_FEEDERS[nextMn]
          if (feeders) {
            const oppMn = feeders[0] === cur ? feeders[1] : feeders[1] === cur ? feeders[0] : null
            if (oppMn !== null) {
              const possible = getPossibleOpponents(oppMn, gameByMatchNum, teams)
              if (possible.length > 0) {
                futureOpponentRows.push({ round, possibleTeams: possible, scheduledGame: gameByMatchNum.get(nextMn) })
              }
            }
          }
        }
        cur = nextMn
      }
    }
  }

  // Fetch match details for finished games
  const finishedGameIds = finishedGames.map(g => g.id)
  const { data: matchDetailsList } = useSWR<MatchDetail[]>(
    finishedGameIds.length > 0 ? ['team-matches', id, ...finishedGameIds] : null,
    () => Promise.all(finishedGameIds.map(gid => fetch(`/api/match/${gid}`).then(r => r.json()))),
    { revalidateOnFocus: false }
  )

  // Aggregate cards
  let totalYellow = 0, totalRed = 0
  for (const g of finishedGames) {
    const isHome = g.home_team_id === id
    totalYellow += (isHome ? g.home_yellow_cards : g.away_yellow_cards) ?? 0
    totalRed += (isHome ? g.home_red_cards : g.away_red_cards) ?? 0
  }

  const playerStats = new Map<string, PlayerStat>()

  const getStat = (player: RosterPlayer): PlayerStat => {
    if (!playerStats.has(player.name)) {
      playerStats.set(player.name, {
        name: player.name,
        position: player.position,
        headshot: player.headshot,
        apps: 0, starts: 0, minutesPlayed: 0,
        goals: 0, yellowCards: 0, redCards: 0,
        everPlayed: false,
      })
    }
    return playerStats.get(player.name)!
  }

  if (matchDetailsList) {
    for (const detail of matchDetailsList) {
      if (!detail || !detail.events) continue
      const lineup = detail.homeTeamId === id ? detail.homeLineup : detail.awayLineup
      if (!lineup) continue
      const starters = lineup.starters ?? []
      const subs = lineup.subs ?? []
      const events = detail.events ?? []

      // Register every squad member (even unused subs)
      for (const player of [...starters, ...subs]) getStat(player)

      // Starters
      for (const player of starters) {
        const stat = getStat(player)
        stat.apps++; stat.starts++; stat.everPlayed = true
        const subOff = events.find(e => e.type === 'sub' && e.secondaryPlayer === player.name)
        stat.minutesPlayed += subOff ? Math.min(subOff.minute, 90) : 90
      }

      // Subs who actually came on
      for (const player of subs) {
        const subOn = events.find(e => e.type === 'sub' && e.primaryPlayer === player.name)
        if (!subOn) continue
        const stat = getStat(player)
        stat.apps++; stat.everPlayed = true
        const minuteOn = Math.min(subOn.minute, 90)
        // Could also be subbed off themselves
        const subOff = events.find(e => e.type === 'sub' && e.secondaryPlayer === player.name && e.minute > subOn.minute)
        const minuteOff = subOff ? Math.min(subOff.minute, 90) : 90
        stat.minutesPlayed += Math.max(0, minuteOff - minuteOn)
      }

      // Goals and cards
      for (const event of events) {
        if (event.teamId !== id) continue
        const stat = playerStats.get(event.primaryPlayer)
        if (!stat) continue
        if (event.type === 'goal') stat.goals++
        else if (event.type === 'yellow') stat.yellowCards++
        else if (event.type === 'red' || event.type === 'yellowred') stat.redCards++
      }
    }
  }

  const playedList = [...playerStats.values()]
    .filter(p => p.everPlayed)
    .sort((a, b) => b.minutesPlayed - a.minutesPlayed || a.name.localeCompare(b.name))

  const notPlayedList = [...playerStats.values()]
    .filter(p => !p.everPlayed)
    .sort((a, b) => a.name.localeCompare(b.name))

  const squadList = [...playedList, ...notPlayedList]

  const anyGoals = playedList.some(p => p.goals > 0)
  const anyYellow = playedList.some(p => p.yellowCards > 0)
  const anyRed = playedList.some(p => p.redCards > 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-400 py-32">
        <Loader2 size={20} className="animate-spin" />{t.loading.generic}
      </div>
    )
  }

  if (!team) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 mb-4">Team not found.</p>
        <Link href="/teams" className="text-blue-400 hover:underline">{t.teamDetail.backToTeams}</Link>
      </div>
    )
  }

  const fav = isFavorite(team.id)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link href="/teams" className="text-sm text-slate-400 hover:text-white mb-6 inline-block">
        {t.teamDetail.backToTeams}
      </Link>

      {/* Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5">
          <TeamFlag team={team} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white">{team.name_en}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-slate-400 text-sm">{team.fifa_code}</span>
              <span className="text-slate-600">·</span>
              {hasKnockoutGames && currentKoRound ? (
                <>
                  <span className="text-slate-500 text-xs">{t.match.stageGroup} {team.groups}</span>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                    🏆 {ROUND_SHORT[currentKoRound]}
                  </span>
                </>
              ) : isEliminatedAtGroup ? (
                <>
                  <span className="text-slate-500 text-xs">{t.match.stageGroup} {team.groups}</span>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                    Eliminated
                  </span>
                </>
              ) : (
                <span className="text-blue-400 text-sm">{t.match.stageGroup} {team.groups}</span>
              )}
              {FIFA_RANK[team.fifa_code] != null && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                    #{FIFA_RANK[team.fifa_code]} FIFA
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(team.id)}
            title={fav ? t.favorites.removeFromFav : t.favorites.addToFav}
            className={`p-3 rounded-xl border transition-colors ${
              fav
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-amber-400 hover:border-amber-500/30'
            }`}
          >
            <Star size={20} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Stats bar */}
        {played > 0 && (
          <>
            <div className="mt-5 grid grid-cols-4 sm:grid-cols-8 gap-2 text-center">
              {[
                { label: t.teamDetail.played, value: played },
                { label: t.teamDetail.won, value: won, color: 'text-green-400' },
                { label: t.teamDetail.drawn, value: drawn, color: 'text-slate-300' },
                { label: t.teamDetail.lost, value: lost, color: 'text-red-400' },
                { label: 'GF', value: gf },
                { label: 'GA', value: ga },
                { label: 'GD', value: gd > 0 ? `+${gd}` : gd, color: gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : '' },
                { label: 'Pts', value: pts, color: 'text-blue-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 rounded-lg py-2">
                  <div className={`text-lg font-black ${color ?? 'text-white'}`}>{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {(totalYellow > 0 || totalRed > 0) && (
              <div className="mt-3 flex gap-3">
                {totalYellow > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5">
                    <span className="text-base">🟨</span>
                    <span className="text-white font-bold text-sm">{totalYellow}</span>
                    <span className="text-slate-500 text-xs">{t.teamDetail.yellowCards}</span>
                  </div>
                )}
                {totalRed > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5">
                    <span className="text-base">🟥</span>
                    <span className="text-white font-bold text-sm">{totalRed}</span>
                    <span className="text-slate-500 text-xs">{t.teamDetail.redCards}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Playoff journey (teams that advanced to knockout rounds) */}
      {hasKnockoutGames && (
        <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">🏆 Tournament Path</h2>
          <div className="flex flex-col gap-2">
            {JOURNEY_ROUNDS.filter((r) => knockoutByRound[r]).map((round) => {
              const game = knockoutByRound[round]!
              const status = getMatchStatus(game)
              const isHome = game.home_team_id === id
              const opponentTeam = isHome ? game.awayTeam : game.homeTeam
              const opponentName = opponentTeam?.name_en ?? (isHome ? game.away_team_name_en : game.home_team_name_en) ?? '?'
              const teamScore = isHome ? game.home_score : game.away_score
              const oppScore = isHome ? game.away_score : game.home_score
              const ts = parseInt(teamScore), os = parseInt(oppScore)
              const isWin = status === 'finished' && ts > os
              const isLoss = status === 'finished' && ts < os
              const suffix = game.decidedBy === 'et' ? 'AET' : game.decidedBy === 'penalties' ? 'PSO' : null
              return (
                <div key={round} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                  status === 'live'   ? 'bg-green-500/10 border-green-500/30' :
                  isWin              ? 'bg-emerald-500/5 border-emerald-500/20' :
                  isLoss             ? 'bg-red-500/5 border-red-500/20' :
                                       'bg-slate-800/50 border-slate-700/50'
                }`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-9 shrink-0">
                    {ROUND_SHORT[round]}
                  </span>
                  <span className="text-xs text-slate-600 shrink-0">vs</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {opponentTeam && <TeamFlag team={opponentTeam} size="sm" />}
                    <span className={`text-sm font-medium truncate ${status !== 'scheduled' ? 'text-white' : 'text-slate-400'}`}>
                      {opponentName}
                    </span>
                  </div>
                  {status === 'finished' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {suffix && <span className="text-[9px] text-slate-500">{suffix}</span>}
                      <span className={`text-sm font-black tabular-nums ${isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-slate-300'}`}>
                        {teamScore}–{oppScore}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        isWin  ? 'bg-emerald-500/20 text-emerald-400' :
                        isLoss ? 'bg-red-500/20 text-red-400' :
                                 'bg-slate-700 text-slate-300'
                      }`}>{isWin ? 'W' : isLoss ? 'L' : 'D'}</span>
                    </div>
                  )}
                  {status === 'live' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-green-400 animate-pulse">LIVE</span>
                      <span className="text-sm font-black text-white tabular-nums">{teamScore}–{oppScore}</span>
                    </div>
                  )}
                  {status === 'scheduled' && (
                    <span className="text-[10px] text-blue-400 shrink-0">
                      {parseMatchDate(game.local_date)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ?? ''}
                    </span>
                  )}
                </div>
              )
            })}
            {futureOpponentRows.length > 0 && (
              <>
                <div className="flex items-center gap-2 my-0.5">
                  <div className="flex-1 border-t border-dashed border-slate-700/50" />
                  <span className="text-[9px] text-slate-600 uppercase tracking-widest whitespace-nowrap">possible</span>
                  <div className="flex-1 border-t border-dashed border-slate-700/50" />
                </div>
                {futureOpponentRows.map(({ round, possibleTeams, scheduledGame }) =>
                  possibleTeams.length === 1 ? (
                    <div key={round} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border bg-slate-800/30 border-slate-700/40">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-9 shrink-0">
                        {ROUND_SHORT[round]}
                      </span>
                      <span className="text-xs text-slate-600 shrink-0">vs</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TeamFlag team={possibleTeams[0]} size="sm" />
                        <span className="text-sm font-medium truncate text-slate-300">{possibleTeams[0].name_en}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {scheduledGame
                          ? (parseMatchDate(scheduledGame.local_date)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ?? 'TBD')
                          : 'TBD'}
                      </span>
                    </div>
                  ) : (
                    <div key={round} className="flex items-center gap-3 rounded-xl px-3 py-2 border border-dashed bg-slate-800/20 border-slate-700/30">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-9 shrink-0">
                        {ROUND_SHORT[round]}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap flex-1">
                        {possibleTeams.map(t => <TeamFlag key={t.id} team={t} size="sm" />)}
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0">{possibleTeams.length}</span>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Group standings (always visible for non-playoff teams; collapsible at bottom for playoff teams) */}
      {teamGroup && !hasKnockoutGames && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.groupStanding}</h2>
          <GroupTable group={teamGroup} highlightTeamId={team.id} isLiveSimulated={liveGroupLetters.has(team.groups)} allGames={games} />
        </div>
      )}

      {/* Tournament scorers */}
      {topScorers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
            ⚽ {t.teamDetail.scorers}
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {topScorers.map(([name, goals], i) => (
              <div
                key={name}
                className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-800/50 first:border-t-0"
              >
                <span className="text-xs text-slate-600 w-5 text-right">{i + 1}</span>
                <span className="flex-1 text-sm text-white font-medium">{name}</span>
                <span className="flex items-center gap-1 text-sm font-bold text-white">
                  <span className="text-base">⚽</span>
                  {goals}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming matches */}
      {upcomingGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.upcomingMatches}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {upcomingGames.map((g) => <MatchCard key={g.id} game={g} showPredictLink />)}
          </div>
        </div>
      )}

      {/* Past results */}
      {finishedGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.pastMatches}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[...finishedGames].reverse().map((g) => <MatchCard key={g.id} game={g} />)}
          </div>
        </div>
      )}

      {teamGames.length === 0 && (
        <div className="text-slate-500 text-center py-12">{t.teamDetail.noMatches}</div>
      )}

      {/* Group standings — historical panel at bottom for teams in the knockout phase */}
      {teamGroup && hasKnockoutGames && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.groupStanding}</h2>
          <GroupTable group={teamGroup} highlightTeamId={team.id} isLiveSimulated={liveGroupLetters.has(team.groups)} allGames={games} />
        </div>
      )}

      {/* Squad / Elenco */}
      <SquadSection team={team} playerStats={playerStats} />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function calcAge(dob: string): number {
  const [d, m, y] = dob.split('/').map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  if (today < new Date(today.getFullYear(), m - 1, d)) age--
  return age
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')
}

interface PlayerStat {
  name: string; position?: string; headshot?: string
  apps: number; starts: number; minutesPlayed: number
  goals: number; yellowCards: number; redCards: number; everPlayed: boolean
}

function matchFifaToEspn(player: FifaPlayer, playerStats: Map<string, PlayerStat>): PlayerStat | null {
  const lastN = norm(player.lastName)
  const nameN = norm(player.name)
  const shirtN = norm(player.nameOnShirt)
  for (const [espnName, stat] of playerStats) {
    const en = norm(espnName)
    if (lastN.length >= 4 && (en.includes(lastN) || lastN.includes(en))) return stat
    if (shirtN.length >= 4 && (en.includes(shirtN) || shirtN.includes(en))) return stat
    if (nameN.length >= 5 && en === nameN) return stat
  }
  return null
}

const POS_ORDER: FifaPlayer['pos'][] = ['GK', 'DF', 'MF', 'FW']
const POS_COLOR: Record<string, string> = {
  GK: 'bg-amber-500/20 text-amber-400',
  DF: 'bg-blue-500/20 text-blue-400',
  MF: 'bg-green-500/20 text-green-400',
  FW: 'bg-red-500/20 text-red-400',
}

function SquadSection({ team, playerStats }: { team: ApiTeam; playerStats: Map<string, PlayerStat> }) {
  const { t } = useT()
  const fifaSquad = team.fifa_code ? FIFA_SQUADS_BY_CODE[team.fifa_code] : undefined
  const posLabel: Record<string, string> = {
    GK: t.teamDetail.posGK,
    DF: t.teamDetail.posDF,
    MF: t.teamDetail.posMF,
    FW: t.teamDetail.posFW,
  }

  if (!fifaSquad) {
    const list = [...playerStats.values()].sort((a, b) => b.minutesPlayed - a.minutesPlayed)
    if (!list.length) return null
    return (
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.squad}</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/50">
          {list.map(p => (
            <div key={p.name} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-sm text-white font-medium flex-1">{p.name}</span>
              {p.apps > 0 && <span className="text-xs text-slate-500">{p.apps} {t.teamDetail.appsShort} · {p.minutesPlayed}&apos;</span>}
              {p.goals > 0 && <span className="text-xs text-white font-bold">⚽{p.goals}</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {fifaSquad.coachName && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-base shrink-0">🧑‍💼</div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">{t.teamDetail.headCoach}</div>
            <div className="text-sm text-white font-semibold truncate">{toTitleCase(fifaSquad.coachName)}</div>
          </div>
          <span className="text-xs text-slate-500 shrink-0 ml-auto">{fifaSquad.coachNationality}</span>
        </div>
      )}

      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t.teamDetail.squad}</h2>

      {POS_ORDER.map(pos => {
        const players = fifaSquad.players.filter(p => p.pos === pos)
        if (!players.length) return null
        return (
          <div key={pos} className="mb-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-1.5">{posLabel[pos]}</div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/40">
              {players.map(p => {
                const stat = matchFifaToEspn(p, playerStats)
                const age = calcAge(p.dob)
                const club = p.club.replace(/\s*\([A-Z]{2,3}\)$/, '')
                return (
                  <div key={p.number} className="flex items-center gap-2.5 px-3 py-2.5">
                    <span className="text-xs text-slate-600 w-5 text-right shrink-0">{p.number}</span>
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${POS_COLOR[pos]}`}>{pos}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{toTitleCase(p.name)}</div>
                      <div className="text-[10px] text-slate-500 truncate">{club} · {age} {t.teamDetail.ageUnit}</div>
                    </div>
                    {stat?.everPlayed ? (
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="text-slate-400">{stat.apps} {t.teamDetail.appsShort}</span>
                        <span className="text-slate-600">{stat.minutesPlayed}&apos;</span>
                        {stat.goals > 0 && <span className="font-bold text-white">⚽{stat.goals}</span>}
                        {stat.yellowCards > 0 && <span>🟨</span>}
                        {stat.redCards > 0 && <span>🟥</span>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600 shrink-0">{p.caps} {t.teamDetail.intlCaps}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
