'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import TeamFlag from './TeamFlag'
import type { EnrichedGame } from '@/lib/types'
import { getMatchStatus, getStatusLabel, getScorers, getTeamName, formatMatchDateTime, getVenueTimezone, parseMatchDate, canPredict, minutesUntilLock, formatLockCountdown } from '@/lib/utils'
import { localStageLabel } from '@/lib/i18n'
import { useT } from '@/contexts/LanguageContext'
import { isEspnPlaceholder, BRACKET_POSITIONS, MATCH_LABELS, formatSlotLabel } from '@/lib/bracketStructure'
import type { Translations } from '@/lib/i18n'
import { useSettings } from '@/contexts/SettingsContext'
import { MapPin, Check, X } from 'lucide-react'

const STORAGE_KEY = 'wc2026_predictions'

function resolveTeamName(game: EnrichedGame, side: 'home' | 'away', t: Translations): string {
  const rawName = getTeamName(game, side)
  if (!isEspnPlaceholder(rawName)) return rawName
  const tz = getVenueTimezone(game)
  const d = parseMatchDate(game.local_date)
  if (!d) return rawName
  const dateStr = d.toLocaleDateString('sv-SE', { timeZone: tz })
  const rawCity = game.stadium?.city_en ?? ''
  const bp =
    BRACKET_POSITIONS.get(`${dateStr}_${rawCity}`) ??
    BRACKET_POSITIONS.get(`${dateStr}_${rawCity.split(',')[0].trim()}`)
  if (!bp) return rawName
  const labels = MATCH_LABELS[bp.matchNum]
  const code = side === 'home' ? labels?.home : labels?.away
  return code ? formatSlotLabel(code, t) : rawName
}

interface Props {
  game: EnrichedGame
  showPredictLink?: boolean
}

export default function MatchCard({ game, showPredictLink = false }: Props) {
  const { t } = useT()
  const { timezone } = useSettings()
  const status = getMatchStatus(game)
  const statusLabel = getStatusLabel(game, timezone)
  const homeScorers = getScorers(game.home_scorers)
  const awayScorers = getScorers(game.away_scorers)
  const homeName = resolveTeamName(game, 'home', t)
  const awayName = resolveTeamName(game, 'away', t)
  const stageLabel = localStageLabel(game.type, game.group, t)

  const [prediction, setPrediction] = useState<import('@/lib/types').Prediction | null>(null)
  const [editing, setEditing] = useState(false)
  const [homeInput, setHomeInput] = useState('')
  const [awayInput, setAwayInput] = useState('')
  const [etHomeInput, setEtHomeInput] = useState('')
  const [etAwayInput, setEtAwayInput] = useState('')
  const [penHomeInput, setPenHomeInput] = useState('')
  const [penAwayInput, setPenAwayInput] = useState('')
  const homeRef = useRef<HTMLInputElement>(null)
  const isKnockout = game.type !== 'group'

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const preds: Record<string, import('@/lib/types').Prediction> = JSON.parse(raw)
        setPrediction(preds[game.id] ?? null)
      }
    } catch { /* ignore */ }
  }, [game.id])

  const startEdit = () => {
    const h = prediction ? String(prediction.homeScore) : ''
    const a = prediction ? String(prediction.awayScore) : ''
    setHomeInput(h)
    setAwayInput(a)
    const isRegDraw = isKnockout && h !== '' && a !== '' && h === a
    setEtHomeInput(prediction?.etHomeScore !== undefined ? String(prediction.etHomeScore) : isRegDraw ? h : '')
    setEtAwayInput(prediction?.etAwayScore !== undefined ? String(prediction.etAwayScore) : isRegDraw ? a : '')
    setPenHomeInput(prediction?.penHomeScore !== undefined ? String(prediction.penHomeScore) : '')
    setPenAwayInput(prediction?.penAwayScore !== undefined ? String(prediction.penAwayScore) : '')
    setEditing(true)
    setTimeout(() => homeRef.current?.focus(), 0)
  }

  const savePrediction = () => {
    const h = parseInt(homeInput)
    const a = parseInt(awayInput)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    // For knockout draws, require ET inputs
    const isDrawReg = isKnockout && homeInput !== '' && awayInput !== '' && homeInput === awayInput
    if (isDrawReg && (etHomeInput === '' || etAwayInput === '')) return
    const etH = etHomeInput !== '' ? parseInt(etHomeInput) : undefined
    const etA = etAwayInput !== '' ? parseInt(etAwayInput) : undefined
    if (isDrawReg && etH !== undefined && etA !== undefined && (etH < h || etA < a)) return
    const isDrawET = isKnockout && isDrawReg && etHomeInput !== '' && etAwayInput !== '' && etHomeInput === etAwayInput
    if (isDrawET && (penHomeInput === '' || penAwayInput === '')) return
    const penH = penHomeInput !== '' ? parseInt(penHomeInput) : undefined
    const penA = penAwayInput !== '' ? parseInt(penAwayInput) : undefined
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const preds: Record<string, import('@/lib/types').Prediction> = raw ? JSON.parse(raw) : {}
      const existing = preds[game.id]
      preds[game.id] = {
        matchId: game.id,
        homeTeamName: existing?.homeTeamName ?? homeName,
        awayTeamName: existing?.awayTeamName ?? awayName,
        homeTeamFlag: existing?.homeTeamFlag ?? (game.homeTeam?.flag ?? ''),
        awayTeamFlag: existing?.awayTeamFlag ?? (game.awayTeam?.flag ?? ''),
        homeScore: h,
        awayScore: a,
        ...(isKnockout && etH !== undefined && etA !== undefined ? { etHomeScore: etH, etAwayScore: etA } : {}),
        ...(isKnockout && penH !== undefined && penA !== undefined ? { penHomeScore: penH, penAwayScore: penA } : {}),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preds))
      setPrediction(preds[game.id])
    } catch { /* ignore */ }
    setEditing(false)
  }

  const cancelEdit = () => setEditing(false)

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
            {game.time_elapsed === 'HT' ? 'HT' : game.time_elapsed === 'PEN' ? `${t.match.live} · PEN` : `${t.match.live} ${game.time_elapsed}${game.time_elapsed?.endsWith('+') ? '' : "'"}`}
          </span>
        ) : status === 'finished' ? (
          <span className="text-xs text-slate-600 font-medium">
            FT · {formatMatchDateTime(game.local_date, timezone).split(',').slice(0, 2).join(',')}
          </span>
        ) : (
          <span className="text-xs text-blue-400 font-medium">
            {formatMatchDateTime(game.local_date, timezone)}
          </span>
        )}
      </div>

      {/* Teams and score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1 w-24 sm:w-32">
          {game.homeTeam?.id ? (
            <Link href={`/teams/${game.homeTeam.id}`} className="flex flex-col items-center gap-1 group">
              <TeamFlag team={game.homeTeam} name={homeName} size="lg" />
              <span className="text-xs sm:text-sm text-white font-semibold text-center leading-tight mt-1 group-hover:underline">
                {homeName}
              </span>
            </Link>
          ) : (
            <>
              <TeamFlag team={game.homeTeam} name={homeName} size="lg" />
              <span className="text-xs sm:text-sm text-white font-semibold text-center leading-tight mt-1">{homeName}</span>
            </>
          )}
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
          {/* Penalty shootout score */}
          {(game.decidedBy === 'penalties' || game.time_elapsed === 'PEN') && (game.pen_home_score != null || game.pen_away_score != null) && (
            <span className="text-[10px] text-slate-400">
              Pen. <span className="font-bold text-white">{game.pen_home_score ?? '?'}–{game.pen_away_score ?? '?'}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 w-24 sm:w-32">
          {game.awayTeam?.id ? (
            <Link href={`/teams/${game.awayTeam.id}`} className="flex flex-col items-center gap-1 group">
              <TeamFlag team={game.awayTeam} name={awayName} size="lg" />
              <span className="text-xs sm:text-sm text-white font-semibold text-center leading-tight mt-1 group-hover:underline">
                {awayName}
              </span>
            </Link>
          ) : (
            <>
              <TeamFlag team={game.awayTeam} name={awayName} size="lg" />
              <span className="text-xs sm:text-sm text-white font-semibold text-center leading-tight mt-1">{awayName}</span>
            </>
          )}
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

      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        {/* Prediction section */}
        {showPredictLink && (() => {
          if (canPredict(game)) {
            const minsLeft = minutesUntilLock(game)
            const lockLabel = minsLeft !== null && minsLeft > 0
              ? `⏳ ${formatLockCountdown(minsLeft)}`
              : null

            if (editing) {
              const isDrawReg = isKnockout && homeInput !== '' && awayInput !== '' && homeInput === awayInput
              const isDrawET = isDrawReg && etHomeInput !== '' && etAwayInput !== '' && etHomeInput === etAwayInput
              const canSave = homeInput !== '' && awayInput !== '' &&
                (!isDrawReg || (etHomeInput !== '' && etAwayInput !== '')) &&
                (!isDrawET || (penHomeInput !== '' && penAwayInput !== ''))
              return (
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">🎯</span>
                    <input
                      ref={homeRef}
                      type="number" min="0" max="20"
                      value={homeInput}
                      onChange={e => {
                        const v = e.target.value
                        setHomeInput(v)
                        if (isKnockout && v !== '' && v === awayInput) {
                          if (!etHomeInput) setEtHomeInput(v)
                          if (!etAwayInput) setEtAwayInput(awayInput)
                        }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') savePrediction(); if (e.key === 'Escape') cancelEdit() }}
                      className="w-9 text-center bg-slate-800 border border-slate-600 rounded text-white text-sm font-bold tabular-nums focus:outline-none focus:border-amber-500 py-0.5"
                    />
                    <span className="text-slate-500 text-sm">–</span>
                    <input
                      type="number" min="0" max="20"
                      value={awayInput}
                      onChange={e => {
                        const v = e.target.value
                        setAwayInput(v)
                        if (isKnockout && v !== '' && homeInput === v) {
                          if (!etHomeInput) setEtHomeInput(homeInput)
                          if (!etAwayInput) setEtAwayInput(v)
                        }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') savePrediction(); if (e.key === 'Escape') cancelEdit() }}
                      className="w-9 text-center bg-slate-800 border border-slate-600 rounded text-white text-sm font-bold tabular-nums focus:outline-none focus:border-amber-500 py-0.5"
                    />
                    <button
                      onClick={savePrediction}
                      disabled={!canSave}
                      className="p-1 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 transition-colors"
                    >
                      <Check size={13} />
                    </button>
                    <button onClick={cancelEdit} className="p-1 rounded text-slate-500 hover:text-white transition-colors">
                      <X size={13} />
                    </button>
                    {lockLabel && <span className="text-xs text-orange-400 font-medium ml-1">{lockLabel}</span>}
                  </div>
                  {isDrawReg && (
                    <div className="flex flex-col gap-0.5 ml-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-amber-400/70 uppercase w-12">{t.match.aet}</span>
                        <input
                          type="number" min={parseInt(homeInput) || 0} max="20"
                          value={etHomeInput}
                          onChange={e => {
                            const v = e.target.value, min = parseInt(homeInput) || 0, n = parseInt(v)
                            setEtHomeInput(v !== '' && !isNaN(n) && n < min ? String(min) : v)
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') savePrediction(); if (e.key === 'Escape') cancelEdit() }}
                          className="w-9 text-center bg-slate-800 border border-slate-600 rounded text-white text-sm font-bold tabular-nums focus:outline-none focus:border-amber-500 py-0.5"
                        />
                        <span className="text-slate-500 text-sm">–</span>
                        <input
                          type="number" min={parseInt(awayInput) || 0} max="20"
                          value={etAwayInput}
                          onChange={e => {
                            const v = e.target.value, min = parseInt(awayInput) || 0, n = parseInt(v)
                            setEtAwayInput(v !== '' && !isNaN(n) && n < min ? String(min) : v)
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') savePrediction(); if (e.key === 'Escape') cancelEdit() }}
                          className="w-9 text-center bg-slate-800 border border-slate-600 rounded text-white text-sm font-bold tabular-nums focus:outline-none focus:border-amber-500 py-0.5"
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 ml-14">{t.match.aetHint} {homeInput}–{awayInput}</span>
                    </div>
                  )}
                  {isDrawET && (
                    <div className="flex items-center gap-1.5 ml-4">
                      <span className="text-[10px] text-slate-400 uppercase w-12">{t.match.penalties}</span>
                      <input
                        type="number" min="0" max="20"
                        value={penHomeInput}
                        onChange={e => setPenHomeInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') savePrediction(); if (e.key === 'Escape') cancelEdit() }}
                        className="w-9 text-center bg-slate-800 border border-slate-600 rounded text-white text-sm font-bold tabular-nums focus:outline-none focus:border-amber-500 py-0.5"
                      />
                      <span className="text-slate-500 text-sm">–</span>
                      <input
                        type="number" min="0" max="20"
                        value={penAwayInput}
                        onChange={e => setPenAwayInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') savePrediction(); if (e.key === 'Escape') cancelEdit() }}
                        className="w-9 text-center bg-slate-800 border border-slate-600 rounded text-white text-sm font-bold tabular-nums focus:outline-none focus:border-amber-500 py-0.5"
                      />
                    </div>
                  )}
                </div>
              )
            }

            return prediction ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">🎯 {t.match.myPick}:</span>
                <span className="text-sm font-black text-amber-300 tabular-nums">
                  {prediction.homeScore} – {prediction.awayScore}
                  {prediction.etHomeScore !== undefined && prediction.etAwayScore !== undefined && (
                    <span className="text-amber-300/70"> → {prediction.etHomeScore}–{prediction.etAwayScore} ET</span>
                  )}
                  {prediction.penHomeScore !== undefined && prediction.penAwayScore !== undefined && (
                    <span className="text-amber-300/70"> → {prediction.penHomeScore}–{prediction.penAwayScore} PEN</span>
                  )}
                </span>
                <button onClick={startEdit} className="text-xs text-slate-500 hover:text-amber-400 transition-colors">
                  {t.match.editPick}
                </button>
                {lockLabel && <span className="text-xs text-orange-400 font-medium">{lockLabel}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={startEdit} className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
                  {t.match.predict}
                </button>
                {lockLabel && <span className="text-xs text-orange-400 font-medium">{lockLabel}</span>}
              </div>
            )
          }
          // Game started/finished — show prediction read-only if exists
          if (prediction) {
            return (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">🎯 {t.match.myPick}:</span>
                <span className="text-sm font-black text-amber-300/70 tabular-nums">
                  {prediction.homeScore} – {prediction.awayScore}
                  {prediction.etHomeScore !== undefined && prediction.etAwayScore !== undefined && (
                    <span> → {prediction.etHomeScore}–{prediction.etAwayScore} ET</span>
                  )}
                  {prediction.penHomeScore !== undefined && prediction.penAwayScore !== undefined && (
                    <span> → {prediction.penHomeScore}–{prediction.penAwayScore} PEN</span>
                  )}
                </span>
              </div>
            )
          }
          return <span />
        })()}
        {!showPredictLink && <span />}
        {/* Match detail link */}
        <Link
          href={`/matches/${game.id}`}
          className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0"
        >
          Details →
        </Link>
      </div>
    </div>
  )
}
