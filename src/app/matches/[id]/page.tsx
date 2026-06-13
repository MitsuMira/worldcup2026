'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, MapPin, User, Users } from 'lucide-react'
import TeamFlag from '@/components/TeamFlag'
import type { EnrichedGame, MatchDetail, MatchEvent, CommentaryEntry, Prediction, MatchLeader } from '@/lib/types'
import { getMatchStatus, getStageLabel, formatMatchDateTime, parseMatchDate } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import { useT } from '@/contexts/LanguageContext'
import { Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Tab = 'timeline' | 'feed' | 'stats' | 'lineups' | 'h2h'

// ── Event icons & labels ──────────────────────────────────────────────────────

function eventIcon(type: MatchEvent['type']) {
  switch (type) {
    case 'goal':           return '⚽'
    case 'owngoal':        return '⚽'
    case 'penalty':        return '⚽'
    case 'missed_penalty': return '❌'
    case 'yellow':         return '🟨'
    case 'red':            return '🟥'
    case 'yellowred':      return '🟨🟥'
    case 'sub':            return '↕'
  }
}

function eventLabel(ev: MatchEvent): string {
  switch (ev.type) {
    case 'owngoal':        return `${ev.primaryPlayer} (OG)`
    case 'penalty':        return `${ev.primaryPlayer} (P)`
    case 'missed_penalty': return `${ev.primaryPlayer} (missed P)`
    case 'sub':
      return ev.secondaryPlayer
        ? `${ev.secondaryPlayer} ↑  ${ev.primaryPlayer} ↓`
        : ev.primaryPlayer
    default:
      return ev.secondaryPlayer
        ? `${ev.primaryPlayer} (${ev.secondaryPlayer})`
        : ev.primaryPlayer
  }
}

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow({ label, home, away }: { label: string; home?: string; away?: string }) {
  if (home == null && away == null) return null
  const h = parseFloat(home ?? '0') || 0
  const a = parseFloat(away ?? '0') || 0
  const total = h + a || 1
  const hPct = Math.round((h / total) * 100)
  const aPct = 100 - hPct

  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span className="font-semibold text-white">{home ?? '—'}</span>
        <span className="text-slate-500 text-center">{label}</span>
        <span className="font-semibold text-white">{away ?? '—'}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
        <div className="bg-blue-500 rounded-l-full" style={{ width: `${hPct}%` }} />
        <div className="bg-amber-500 rounded-r-full" style={{ width: `${aPct}%` }} />
      </div>
    </div>
  )
}

// ── Player event badges ───────────────────────────────────────────────────────

function playerEventBadges(name: string, events: MatchEvent[]): string {
  const badges: string[] = []
  for (const e of events) {
    const isPrimary = e.primaryPlayer === name
    const isSecondary = e.secondaryPlayer === name
    if (!isPrimary && !isSecondary) continue
    if (isPrimary && (e.type === 'goal' || e.type === 'penalty')) badges.push('⚽')
    else if (isPrimary && e.type === 'owngoal') badges.push('⚽(OG)')
    else if (isPrimary && e.type === 'yellow') badges.push('🟨')
    else if (isPrimary && e.type === 'red') badges.push('🟥')
    else if (isPrimary && e.type === 'yellowred') badges.push('🟨🟥')
    else if (e.type === 'sub' && isSecondary) badges.push('↑')
    else if (e.type === 'sub' && isPrimary) badges.push('↓')
  }
  return badges.join(' ')
}

// ── Lineup column ─────────────────────────────────────────────────────────────

// ── Player avatar (headshot with fallback to jersey number) ──────────────────

function PlayerAvatar({ headshot, jersey, size = 5 }: { headshot: string; jersey?: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full object-cover shrink-0`
  return (
    <div className={`relative w-${size} h-${size} shrink-0`}>
      <img
        src={headshot}
        alt=""
        className={cls + ' border border-white/20 bg-slate-700'}
        onError={e => {
          const img = e.target as HTMLImageElement
          img.style.display = 'none'
          const fb = img.nextElementSibling as HTMLElement | null
          if (fb) fb.style.display = 'flex'
        }}
      />
      <div
        className={`w-${size} h-${size} rounded-full bg-slate-700 border border-white/20 items-center justify-center text-white text-[10px] font-bold absolute inset-0`}
        style={{ display: 'none' }}
      >
        {jersey ?? '?'}
      </div>
    </div>
  )
}

function LineupColumn({ lineup, color, subsLabel, events }: { lineup: NonNullable<MatchDetail['homeLineup']>; color: 'blue' | 'amber'; subsLabel: string; events: MatchEvent[] }) {
  const accent = color === 'blue' ? 'text-blue-400' : 'text-amber-400'
  return (
    <div className="flex-1 min-w-0">
      {lineup.formation && (
        <div className={`text-xs font-bold ${accent} mb-3 text-center`}>{lineup.formation}</div>
      )}
      <div className="space-y-1">
        {lineup.starters.map((p, i) => {
          const badges = playerEventBadges(p.name, events)
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
              {p.headshot
                ? <PlayerAvatar headshot={p.headshot} jersey={p.jersey} size={5} />
                : <span className="text-xs text-slate-600 w-5 text-right shrink-0">{p.jersey}</span>
              }
              <span className="truncate">{p.name}</span>
              {badges && <span className="text-xs shrink-0">{badges}</span>}
              <span className="text-xs text-slate-600 shrink-0">{p.position}</span>
            </div>
          )
        })}
      </div>
      {lineup.subs.length > 0 && (
        <>
          <div className="text-xs text-slate-600 uppercase tracking-widest mt-3 mb-1">{subsLabel}</div>
          <div className="space-y-1">
            {lineup.subs.map((p, i) => {
              const badges = playerEventBadges(p.name, events)
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                  {p.headshot
                    ? <PlayerAvatar headshot={p.headshot} jersey={p.jersey} size={5} />
                    : <span className="text-slate-700 w-5 text-right shrink-0">{p.jersey}</span>
                  }
                  <span className="truncate">{p.name}</span>
                  {badges && <span className="shrink-0">{badges}</span>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Formation field ───────────────────────────────────────────────────────────

function FormationField({ lineup, mirror }: { lineup: NonNullable<MatchDetail['homeLineup']>; mirror?: boolean }) {
  const formation = lineup.formation ?? ''
  const nums = formation.split('-').map(Number).filter(n => !isNaN(n) && n > 0)
  if (nums.length === 0 || lineup.starters.length < 11) return null

  const sorted = [...lineup.starters].sort((a, b) => (a.formationPlace ?? 99) - (b.formationPlace ?? 99))
  // rows: [GK], then groups from formation (e.g. 4,3,3), then optionally reverse for mirror
  const rows: typeof sorted[number][][] = [[sorted[0]]]
  let idx = 1
  for (const count of nums) {
    rows.push(sorted.slice(idx, idx + count))
    idx += count
  }
  const displayRows = mirror ? [...rows].reverse() : rows

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #166534, #15803d, #166534)', minHeight: 280, paddingTop: 12, paddingBottom: 12 }}
    >
      {/* Field lines */}
      <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none opacity-20">
        <div className="w-full border-b border-white/60 h-0" style={{ marginTop: '50%' }} />
      </div>
      <div className="absolute inset-x-0 top-1/2 -translate-y-px h-px bg-white/20" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />

      <div className="relative flex flex-col justify-between h-full gap-1 px-1" style={{ minHeight: 280 }}>
        {displayRows.map((row, ri) => (
          <div key={ri} className="flex justify-around items-center flex-1">
            {row.map((p, pi) => (
              <div key={pi} className="flex flex-col items-center gap-0.5 w-12">
                {p.headshot ? (
                  <PlayerAvatar headshot={p.headshot} jersey={p.jersey} size={8} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-xs font-bold">
                    {p.jersey ?? '?'}
                  </div>
                )}
                <span className="text-white text-[9px] font-semibold text-center leading-tight line-clamp-2 w-full text-center" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {p.name.split(' ').slice(-1)[0]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Leaders section ───────────────────────────────────────────────────────────

const CAT_ICON: Record<string, string> = {
  'Chutes Totais': '⚽',
  'Passes Precisos': '👟',
  'Intervenções Defensivas': '🛡️',
  'Defesas': '🧤',
}

function Dots({ n, max = 6, icon }: { n: number; max?: number; icon: string }) {
  const show = Math.min(n, max)
  if (n === 0) return <span className="text-[10px] text-slate-600">—</span>
  return (
    <span className="text-sm leading-tight">
      {Array.from({ length: show }).map((_, i) => <span key={i}>{icon}</span>)}
      {n > max && <span className="text-slate-500 text-[10px]"> +{n - max}</span>}
    </span>
  )
}

// xG bar with reference marker at 1.0 and a scale of 0→2
// xG = expected goals: 0.1 = weak chance, 0.3 = decent, 1.0 = penalty/tap-in certainty
function XGBar({ value, color }: { value: number; color: string }) {
  const MAX = 2.0
  const pct = Math.min(100, (value / MAX) * 100)
  const ref = 50 // 1.0 / 2.0 * 100
  return (
    <div className="w-full mt-1">
      <div className="relative h-2 bg-slate-700 rounded-full overflow-visible">
        {/* filled bar */}
        <div className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        {/* reference tick at xG=1.0 */}
        <div className="absolute top-[-2px] bottom-[-2px] w-px bg-slate-400/60" style={{ left: `${ref}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
        <span>0</span>
        <span className="text-slate-500">1.0 = 1 gol esperado</span>
        <span>2.0</span>
      </div>
    </div>
  )
}

function LeaderSide({ leader, color }: { leader: MatchLeader; color: 'blue' | 'amber' }) {
  const s = leader.summary ?? ''
  const cat = leader.category
  const barColor = color === 'blue' ? 'bg-blue-500' : 'bg-amber-500'

  const sog = s.match(/(\d+)\s*shots on goal/i)?.[1]
  const xg = s.match(/(\d+\.?\d*)\s*xG(?!C)/i)?.[1]
  const passes = s.match(/(\d+)\s*passes/i)?.[1]
  const bcc = s.match(/(\d+)\s*key chance/i)?.[1]
  const tkl = s.match(/(\d+)\s*tackles won/i)?.[1]
  const duel = s.match(/(\d+)\s*duels won/i)?.[1]
  const sf = s.match(/(\d+)\s*shots faced/i)?.[1]
  const xgc = s.match(/(\d+\.?\d*)\s*xGC/i)?.[1]

  return (
    <div className="flex-1 min-w-0">
      <div className="text-sm text-white font-semibold truncate">{leader.playerName}</div>

      {/* Shots category */}
      {cat.includes('Chutes') && (
        <div className="mt-1.5 space-y-1">
          {sog != null && (
            <div className="flex items-center gap-1.5">
              <Dots n={parseInt(sog)} max={6} icon="⚽" />
              <span className="text-[10px] text-slate-500">{sog} no gol</span>
            </div>
          )}
          {xg != null && (
            <div>
              <div className="text-[10px] text-slate-400 font-semibold">xG <span className="font-black text-white">{parseFloat(xg).toFixed(2)}</span></div>
              <XGBar value={parseFloat(xg)} color={barColor} />
            </div>
          )}
        </div>
      )}

      {/* Passes category */}
      {cat.includes('Passes') && (
        <div className="mt-1.5 space-y-0.5">
          {passes != null && (
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white">{passes}</span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, parseInt(passes) / 100 * 100)}%` }} />
              </div>
            </div>
          )}
          {bcc != null && parseInt(bcc) > 0 && (
            <div className="text-[10px] text-amber-400">{bcc} grande chance criada</div>
          )}
        </div>
      )}

      {/* Defensive category */}
      {cat.includes('Defensiv') && (
        <div className="mt-1.5 space-y-0.5">
          {duel != null && <Dots n={parseInt(duel)} max={5} icon="🛡️" />}
          {tkl != null && parseInt(tkl) > 0 && <div className="text-[10px] text-slate-400">{tkl} roubada{parseInt(tkl) > 1 ? 's' : ''} de bola</div>}
        </div>
      )}

      {/* Saves category */}
      {cat.includes('Defesa') && (
        <div className="mt-1.5 space-y-1">
          {sf != null && (
            <div className="flex items-center gap-1.5">
              <Dots n={parseInt(sf)} max={6} icon="🧤" />
              <span className="text-[10px] text-slate-500">{sf} chutes sofridos</span>
            </div>
          )}
          {xgc != null && (
            <div>
              <div className="text-[10px] text-slate-400 font-semibold">xGC <span className="font-black text-white">{parseFloat(xgc).toFixed(2)}</span>
                <span className="text-slate-600 font-normal"> (pressão sofrida)</span>
              </div>
              <XGBar value={parseFloat(xgc)} color="bg-red-500" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LeadersSection({ home, away, homeName, awayName }: {
  home?: MatchLeader[]
  away?: MatchLeader[]
  homeName: string
  awayName: string
}) {
  const count = Math.max(home?.length ?? 0, away?.length ?? 0)
  if (count === 0) return null
  return (
    <div className="mt-6">
      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
        <span className="text-blue-400">{homeName}</span>
        <span>Destaques individuais</span>
        <span className="text-amber-400">{awayName}</span>
      </div>
      {Array.from({ length: count }).map((_, ci) => {
        const h = home?.[ci]
        const a = away?.[ci]
        const cat = h?.category ?? a?.category ?? ''
        const icon = CAT_ICON[cat] ?? '📊'
        return (
          <div key={ci} className="mb-3 bg-slate-800/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{icon}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{cat}</span>
            </div>
            <div className="flex gap-4">
              {h ? <LeaderSide leader={h} color="blue" /> : <div className="flex-1" />}
              <div className="w-px bg-slate-700 shrink-0 self-stretch" />
              {a ? <LeaderSide leader={a} color="amber" /> : <div className="flex-1" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Form badges ───────────────────────────────────────────────────────────────

function FormBadges({ form }: { form: string }) {
  const { t } = useT()
  const label = (r: string) =>
    r === 'W' ? t.teamDetail.won[0] :
    r === 'L' ? t.teamDetail.lost[0] :
    t.teamDetail.drawn[0]
  return (
    <div className="flex gap-1">
      {[...form].map((r, i) => (
        <span
          key={i}
          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
            r === 'W' ? 'bg-green-500 text-white' :
            r === 'L' ? 'bg-red-500 text-white' :
            'bg-slate-600 text-slate-300'
          }`}
        >
          {label(r)}
        </span>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { timezone } = useSettings()
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('timeline')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wc2026_predictions')
      if (raw) {
        const preds: Record<string, Prediction> = JSON.parse(raw)
        setPrediction(preds[id] ?? null)
      }
    } catch { /* ignore */ }
  }, [id])

  const { data: gamesData, isLoading: gamesLoading } = useSWR<{ games: EnrichedGame[] }>(
    '/api/games', fetcher, { refreshInterval: 30_000 },
  )
  const game = gamesData?.games.find(g => g.id === id)
  const status = game ? getMatchStatus(game) : null

  const { data: detail, isLoading: detailLoading, error: detailError } = useSWR<MatchDetail>(
    id ? `/api/match/${id}` : null,
    fetcher,
    { refreshInterval: status === 'live' ? 15_000 : 0 },
  )

  if (gamesLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-400 py-32">
        <Loader2 size={20} className="animate-spin" /> {t.loading.generic}
      </div>
    )
  }

  if (!game) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 mb-4">{t.matchDetail.notFound}</p>
        <Link href="/" className="text-blue-400 hover:underline">{t.matchDetail.homeLink}</Link>
      </div>
    )
  }

  const homeName = game.homeTeam?.name_en ?? game.home_team_name_en ?? 'TBD'
  const awayName = game.awayTeam?.name_en ?? game.away_team_name_en ?? 'TBD'
  const stageLabel = getStageLabel(game)
  const kickoff = parseMatchDate(game.local_date)

  const homeEvents = detail?.events.filter(e => e.teamId === detail.homeTeamId) ?? []
  const awayEvents = detail?.events.filter(e => e.teamId === detail.awayTeamId) ?? []
  const allEvents = detail?.events ?? []

  const hasFeed = (detail?.commentary?.length ?? 0) > 0
  const kickoffMs = kickoff?.getTime() ?? 0
  // Show feed tab from 5 min before kickoff until ~10 min after the estimated end
  // (kickoff + 140 min covers 45+15+45+35 for a typical match with stoppage)
  const estimatedEndMs = kickoffMs + 140 * 60 * 1000
  const withinMatchWindow = kickoffMs > 0 && Date.now() >= kickoffMs - 5 * 60 * 1000 &&
    Date.now() < estimatedEndMs + 10 * 60 * 1000
  const showFeedTab = (hasFeed || status === 'live') && withinMatchWindow
  const TABS: { key: Tab; label: string; hide?: boolean }[] = [
    { key: 'timeline', label: t.matchDetail.tabTimeline },
    { key: 'feed', label: t.matchDetail.tabFeed, hide: !showFeedTab },
    { key: 'stats', label: t.matchDetail.tabStats },
    { key: 'lineups', label: t.matchDetail.tabLineups },
    { key: 'h2h', label: t.matchDetail.tabH2H },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-6">
        <ArrowLeft size={14} /> {t.matchDetail.back}
      </Link>

      {/* Match header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        {/* Stage + status */}
        <div className="flex items-center justify-between mb-4 text-xs text-slate-500 font-medium uppercase tracking-wide">
          <span>{stageLabel}</span>
          {status === 'live' ? (
            <span className="flex items-center gap-1.5 text-green-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {game.time_elapsed === 'HT' ? t.matchDetail.ht : `${t.match.live} ${game.time_elapsed}'`}
            </span>
          ) : status === 'finished' ? (
            <span>{t.matchDetail.ft}</span>
          ) : kickoff ? (
            <span className="text-blue-400">{formatMatchDateTime(game.local_date, timezone)}</span>
          ) : null}
        </div>

        {/* Teams and score */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            {game.homeTeam?.id ? (
              <Link href={`/teams/${game.homeTeam.id}`} className="flex flex-col items-center gap-2 group">
                <TeamFlag team={game.homeTeam} name={homeName} size="xl" />
                <span className="text-sm font-bold text-white text-center leading-tight group-hover:underline">{homeName}</span>
              </Link>
            ) : (
              <>
                <TeamFlag team={game.homeTeam} name={homeName} size="xl" />
                <span className="text-sm font-bold text-white text-center leading-tight">{homeName}</span>
              </>
            )}
            <span className="text-xs text-slate-500">{game.homeTeam?.fifa_code}</span>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            {status === 'scheduled' ? (
              <span className="text-2xl font-bold text-slate-500">VS</span>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-5xl font-black tabular-nums text-white">{game.home_score}</span>
                <span className="text-2xl text-slate-600">–</span>
                <span className="text-5xl font-black tabular-nums text-white">{game.away_score}</span>
              </div>
            )}
            {/* Prediction */}
            {prediction && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span>🎯</span>
                <span className="text-amber-300/70 font-bold tabular-nums">{prediction.homeScore} – {prediction.awayScore}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            {game.awayTeam?.id ? (
              <Link href={`/teams/${game.awayTeam.id}`} className="flex flex-col items-center gap-2 group">
                <TeamFlag team={game.awayTeam} name={awayName} size="xl" />
                <span className="text-sm font-bold text-white text-center leading-tight group-hover:underline">{awayName}</span>
              </Link>
            ) : (
              <>
                <TeamFlag team={game.awayTeam} name={awayName} size="xl" />
                <span className="text-sm font-bold text-white text-center leading-tight">{awayName}</span>
              </>
            )}
            <span className="text-xs text-slate-500">{game.awayTeam?.fifa_code}</span>
          </div>
        </div>

        {/* Quick event summary under each team (goals & cards) */}
        {allEvents.length > 0 && (
          <div className="flex justify-between mt-4 text-xs text-slate-400 gap-4">
            <div className="flex-1 space-y-0.5">
              {homeEvents.filter(e => e.type !== 'sub').map((e, i) => (
                <div key={i}>{eventIcon(e.type)} {e.minuteDisplay} {e.primaryPlayer}</div>
              ))}
            </div>
            <div className="flex-1 space-y-0.5 text-right">
              {awayEvents.filter(e => e.type !== 'sub').map((e, i) => (
                <div key={i}>{e.primaryPlayer} {e.minuteDisplay} {eventIcon(e.type)}</div>
              ))}
            </div>
          </div>
        )}

        {/* Venue */}
        {game.stadium && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={11} />
            <span>{game.stadium.name_en} · {game.stadium.city_en}</span>
          </div>
        )}

        {/* Referee + attendance */}
        {detail?.referee && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <User size={11} />
            <span>{detail.referee}</span>
            {detail.attendance && (
              <span className="ml-3 flex items-center gap-1">
                <Users size={11} /> {detail.attendance.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Broadcasts — only for Americas timezones */}
        {detail?.broadcasts && detail.broadcasts.length > 0 && (() => {
          const tz = timezone ?? ''
          const isAmericas = tz.startsWith('America/')
          if (!isAmericas) return null
          return (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-slate-600">📺</span>
              <span>{t.matchDetail.watching}:</span>
              <span className="text-slate-400">{detail.broadcasts.join(' · ')}</span>
            </div>
          )
        })()}
      </div>

      {/* Detail tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.filter(tab => !tab.hide).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {detailLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-12">
          <Loader2 size={18} className="animate-spin" /> {t.matchDetail.loadingDetail}
        </div>
      )}

      {!detailLoading && detailError && (
        <div className="text-slate-500 text-center py-10 text-sm">
          {t.matchDetail.detailUnavailable}
        </div>
      )}

      {!detailLoading && detail && (
        <>
          {/* ── Timeline ── */}
          {tab === 'timeline' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {allEvents.length === 0 ? (
                <p className="text-slate-500 text-center py-10 text-sm">{t.matchDetail.noEvents}</p>
              ) : (
                allEvents.map((ev, i) => {
                  const isHome = ev.teamId === detail.homeTeamId
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-2.5 border-t border-slate-800/50 first:border-t-0 ${
                        isHome ? '' : 'flex-row-reverse'
                      }`}
                    >
                      <span className="text-xs text-slate-600 w-10 shrink-0 text-center">
                        {ev.minuteDisplay}
                      </span>
                      <span className="text-base shrink-0">{eventIcon(ev.type)}</span>
                      <span className={`text-sm flex-1 ${isHome ? 'text-left' : 'text-right'} text-slate-200`}>
                        {eventLabel(ev)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── Live Feed ── */}
          {tab === 'feed' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/50">
              {(detail.commentary ?? []).map((c: CommentaryEntry) => (
                <div key={c.sequence} className="flex gap-3 px-4 py-3 text-sm">
                  <span className="text-xs text-slate-500 w-8 shrink-0 pt-0.5 tabular-nums">{c.minute ?? ''}</span>
                  {c.icon && <span className="shrink-0 text-sm">{c.icon}</span>}
                  <span className="text-slate-200 leading-snug flex-1">{c.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Stats ── */}
          {tab === 'stats' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              {(!detail.homeStats && !detail.awayStats) ? (
                <p className="text-slate-500 text-center py-6 text-sm">{t.matchDetail.noStats}</p>
              ) : (
                <>
                  <div className="flex justify-between text-xs font-bold mb-4">
                    <span className="text-blue-400">{homeName}</span>
                    <span className="text-amber-400">{awayName}</span>
                  </div>
                  <StatRow label={t.matchDetail.statPossession} home={detail.homeStats?.possession} away={detail.awayStats?.possession} />
                  <StatRow label={t.matchDetail.statShots} home={detail.homeStats?.shots} away={detail.awayStats?.shots} />
                  <StatRow label={t.matchDetail.statShotsOnTarget} home={detail.homeStats?.shotsOnTarget} away={detail.awayStats?.shotsOnTarget} />
                  <StatRow label={t.matchDetail.statCorners} home={detail.homeStats?.corners} away={detail.awayStats?.corners} />
                  <StatRow label={t.matchDetail.statFouls} home={detail.homeStats?.fouls} away={detail.awayStats?.fouls} />
                  <StatRow label={t.matchDetail.statOffsides} home={detail.homeStats?.offsides} away={detail.awayStats?.offsides} />
                  <StatRow label={t.matchDetail.statSaves} home={detail.homeStats?.saves} away={detail.awayStats?.saves} />
                  {(detail.leaders?.home || detail.leaders?.away) && (
                    <LeadersSection
                      home={detail.leaders.home}
                      away={detail.leaders.away}
                      homeName={homeName}
                      awayName={awayName}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Lineups ── */}
          {tab === 'lineups' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              {(!detail.homeLineup && !detail.awayLineup) ? (
                <p className="text-slate-500 text-center py-6 text-sm">{t.matchDetail.noLineups}</p>
              ) : (
                <>
                  <div className="flex justify-between text-xs font-bold mb-4">
                    <span className="text-blue-400">{homeName}</span>
                    <span className="text-amber-400">{awayName}</span>
                  </div>
                  {(detail.homeLineup || detail.awayLineup) && (
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {detail.homeLineup && <FormationField lineup={detail.homeLineup} />}
                      {detail.awayLineup && <FormationField lineup={detail.awayLineup} mirror />}
                    </div>
                  )}
                  <div className="flex gap-6">
                    {detail.homeLineup && <LineupColumn lineup={detail.homeLineup} color="blue" subsLabel={t.matchDetail.subs} events={homeEvents} />}
                    {detail.awayLineup && (
                      <>
                        <div className="w-px bg-slate-800 shrink-0" />
                        <LineupColumn lineup={detail.awayLineup} color="amber" subsLabel={t.matchDetail.subs} events={awayEvents} />
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Pre-Game (Form + H2H) ── */}
          {tab === 'h2h' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              {/* Form */}
              {(detail.homeForm || detail.awayForm) && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white mb-3">{t.matchDetail.formTitle}</h3>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs text-slate-500 mb-1">{homeName}</span>
                      {detail.homeForm && <FormBadges form={detail.homeForm} />}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-500 mb-1">{awayName}</span>
                      {detail.awayForm && <FormBadges form={detail.awayForm} />}
                    </div>
                  </div>
                </div>
              )}
              <h3 className="text-sm font-bold text-white mb-4">{t.matchDetail.h2hTitle}</h3>
              {(!detail.h2h || detail.h2h.length === 0) ? (
                <p className="text-slate-500 text-center py-6 text-sm">{t.matchDetail.noH2H}</p>
              ) : (
                <div className="space-y-2">
                  {detail.h2h.map((g, i) => {
                    const hScore = parseInt(g.homeScore)
                    const aScore = parseInt(g.awayScore)
                    const homeWon = !isNaN(hScore) && !isNaN(aScore) && hScore > aScore
                    const awayWon = !isNaN(hScore) && !isNaN(aScore) && aScore > hScore
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-slate-800 last:border-b-0">
                        <span className="text-xs text-slate-600 w-20 shrink-0">{g.date}</span>
                        <span className={`flex-1 text-right truncate ${homeWon ? 'text-white font-semibold' : 'text-slate-400'}`}>{g.homeTeam}</span>
                        <span className="text-white font-black tabular-nums shrink-0">{g.homeScore} – {g.awayScore}</span>
                        <span className={`flex-1 truncate ${awayWon ? 'text-white font-semibold' : 'text-slate-400'}`}>{g.awayTeam}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
