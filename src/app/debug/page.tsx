'use client'

import useSWR from 'swr'
import type { EnrichedGame } from '@/lib/types'
import type { MatchDetail } from '@/lib/types'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Mode = 'parsed' | 'raw' | 'rosters'

export default function DebugPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('parsed')

  const { data: gamesData, isLoading: gamesLoading, error: gamesError } =
    useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { refreshInterval: 30_000 })

  const { data: detail, isLoading: detailLoading } =
    useSWR<MatchDetail>(selectedId && mode === 'parsed' ? `/api/match/${selectedId}` : null, fetcher)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawDetail, isLoading: rawLoading } =
    useSWR<unknown>(selectedId && (mode === 'raw' || mode === 'rosters') ? `/api/debug/raw-summary/${selectedId}` : null, fetcher)

  const games = gamesData?.games ?? []
  const firstLiveOrUpcoming = games.find(g => g.time_elapsed !== 'notstarted' || g.finished === 'FALSE')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-mono text-xs text-slate-300">
      <h1 className="text-lg font-bold text-white mb-1">ESPN API Debug</h1>
      <p className="text-slate-500 mb-6 text-[11px]">This page is not linked anywhere. Raw payloads for debugging.</p>

      {/* Games summary */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-amber-400 mb-2">
          /api/games → {gamesLoading ? 'loading…' : gamesError ? `ERROR: ${String(gamesError)}` : `${games.length} games`}
        </h2>

        {games.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-1 pr-3">id</th>
                  <th className="text-left py-1 pr-3">date</th>
                  <th className="text-left py-1 pr-3">type/group</th>
                  <th className="text-left py-1 pr-3">home</th>
                  <th className="text-left py-1 pr-3">away</th>
                  <th className="text-left py-1 pr-3">score</th>
                  <th className="text-left py-1 pr-3">finished</th>
                  <th className="text-left py-1 pr-3">elapsed</th>
                  <th className="text-left py-1">detail</th>
                </tr>
              </thead>
              <tbody>
                {games.map(g => (
                  <tr key={g.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-1 pr-3 text-slate-500">{g.id}</td>
                    <td className="py-1 pr-3">{g.local_date?.slice(0, 16)}</td>
                    <td className="py-1 pr-3">{g.type}{g.group ? ` ${g.group}` : ''}</td>
                    <td className="py-1 pr-3">{g.home_team_name_en}</td>
                    <td className="py-1 pr-3">{g.away_team_name_en}</td>
                    <td className="py-1 pr-3">{g.home_score}–{g.away_score}</td>
                    <td className="py-1 pr-3">{g.finished}</td>
                    <td className={`py-1 pr-3 ${g.time_elapsed !== 'notstarted' && g.finished === 'FALSE' ? 'text-green-400 font-bold' : ''}`}>{g.time_elapsed}</td>
                    <td className="py-1 flex gap-2">
                      <button
                        onClick={() => { setSelectedId(g.id); setMode('parsed') }}
                        className={`hover:underline ${selectedId === g.id && mode === 'parsed' ? 'text-amber-400' : 'text-blue-400'}`}
                      >
                        parsed
                      </button>
                      <button
                        onClick={() => { setSelectedId(g.id); setMode('raw') }}
                        className={`hover:underline ${selectedId === g.id && mode === 'raw' ? 'text-amber-400' : 'text-green-400'}`}
                      >
                        raw ESPN
                      </button>
                      <button
                        onClick={() => { setSelectedId(g.id); setMode('rosters') }}
                        className={`hover:underline ${selectedId === g.id && mode === 'rosters' ? 'text-amber-400' : 'text-purple-400'}`}
                      >
                        rosters
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Auto-suggest first live/upcoming */}
      {firstLiveOrUpcoming && !selectedId && (
        <div className="mb-4 p-3 bg-slate-800 rounded-lg">
          <span className="text-slate-400">First live/upcoming: </span>
          <button
            onClick={() => setSelectedId(firstLiveOrUpcoming.id)}
            className="text-blue-400 hover:underline"
          >
            {firstLiveOrUpcoming.home_team_name_en} vs {firstLiveOrUpcoming.away_team_name_en} ({firstLiveOrUpcoming.id})
          </button>
        </div>
      )}

      {/* Match detail */}
      {selectedId && (
        <section>
          {mode === 'parsed' && (
            <>
              <h2 className="text-sm font-bold text-amber-400 mb-2">
                /api/match/{selectedId} (parsed) → {detailLoading ? 'loading…' : 'loaded'}
              </h2>
              {detail && (
                <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              )}
            </>
          )}
          {mode === 'raw' && (
            <>
              <h2 className="text-sm font-bold text-green-400 mb-2">
                /api/debug/raw-summary/{selectedId} (raw ESPN) → {rawLoading ? 'loading…' : 'loaded'}
              </h2>
              {rawDetail && (
                <pre className="bg-slate-900 border border-green-900/30 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed">
                  {JSON.stringify(rawDetail, null, 2)}
                </pre>
              )}
            </>
          )}
          {mode === 'rosters' && (
            <>
              <h2 className="text-sm font-bold text-purple-400 mb-2">
                rosters (headshots) for {selectedId} → {rawLoading ? 'loading…' : 'loaded'}
              </h2>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {rawDetail && (() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const d = rawDetail as any
                const rosters: unknown[] = d?.rosters ?? []
                if (!rosters.length) return <p className="text-slate-500">No rosters in payload.</p>
                return rosters.map((r: unknown, ri: number) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const roster = r as any
                  const team = roster?.team?.abbreviation ?? roster?.team?.displayName ?? `Team ${ri}`
                  const players: unknown[] = roster?.roster ?? []
                  return (
                    <div key={ri} className="mb-6">
                      <div className="text-purple-300 font-bold mb-2">{team} — {roster?.formation ?? 'no formation'}</div>
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-700">
                            <th className="text-left py-0.5 pr-2">#</th>
                            <th className="text-left py-0.5 pr-2">name</th>
                            <th className="text-left py-0.5 pr-2">starter</th>
                            <th className="text-left py-0.5 pr-2">cap</th>
                            <th className="text-left py-0.5 pr-2">id</th>
                            <th className="text-left py-0.5 pr-2">headshot.href</th>
                            <th className="text-left py-0.5">preview</th>
                          </tr>
                        </thead>
                        <tbody>
                          {players.map((p: unknown, pi: number) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const pl = p as any
                            const a = pl?.athlete ?? {}
                            const href = a?.headshot?.href ?? ''
                            const fallbackUrl = a?.id ? `https://a.espncdn.com/i/headshots/soccer/players/full/${a.id}.png` : ''
                            return (
                              <tr key={pi} className="border-b border-slate-800/40">
                                <td className="py-0.5 pr-2 text-slate-500">{a?.jersey ?? pl?.jersey ?? '—'}</td>
                                <td className="py-0.5 pr-2">{a?.displayName}</td>
                                <td className="py-0.5 pr-2">{pl?.starter ? '✓' : ''}</td>
                                <td className={`py-0.5 pr-2 font-bold ${pl?.captain ? 'text-amber-400' : 'text-slate-700'}`}>{pl?.captain ? '©' : '—'}</td>
                                <td className="py-0.5 pr-2 text-slate-500">{a?.id}</td>
                                <td className={`py-0.5 pr-2 ${href ? 'text-green-400' : 'text-slate-600'}`}>{href ? '✓ has href' : 'no href'}</td>
                                <td className="py-0.5">
                                  {(href || fallbackUrl) && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={href || fallbackUrl}
                                      alt=""
                                      className="w-6 h-6 rounded-full object-cover bg-slate-700"
                                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                                    />
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })
              })()}
            </>
          )}
        </section>
      )}

      {/* Raw games JSON — filtered to selected game if one is picked */}
      <section className="mt-8">
        <details>
          <summary className="text-sm font-bold text-amber-400 cursor-pointer mb-2">
            {selectedId ? `Raw /api/games → jogo ${selectedId}` : 'Raw /api/games JSON'} (click to expand)
          </summary>
          <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed mt-2">
            {selectedId
              ? JSON.stringify(games.find(g => g.id === selectedId) ?? null, null, 2)
              : JSON.stringify(gamesData, null, 2)}
          </pre>
        </details>
      </section>
    </div>
  )
}
