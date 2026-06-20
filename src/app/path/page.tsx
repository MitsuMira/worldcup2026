'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TeamFlag from '@/components/TeamFlag'
import { MATCH_LABELS, BRACKET_POSITIONS, isEspnPlaceholder } from '@/lib/bracketStructure'
import { getVenueTimezone, parseMatchDate } from '@/lib/utils'
import type { ApiTeam, EnrichedGroup, EnrichedGame } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatMatchDate(game: EnrichedGame): string {
  const tz = getVenueTimezone(game)
  const d = parseMatchDate(game.local_date)
  if (!d) return ''
  const date = d.toLocaleDateString('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

// ── Bracket lookup tables ────────────────────────────────────────────────────

const SLOT_TO_R32: Record<string, number> = {
  '1A':79,'1B':85,'1C':76,'1D':81,'1E':74,'1F':75,
  '1G':82,'1H':84,'1I':77,'1J':86,'1K':87,'1L':80,
  '2A':73,'2B':73,'2C':75,'2D':88,'2E':78,'2F':76,
  '2G':88,'2H':86,'2I':78,'2J':84,'2K':83,'2L':83,
}

const R32_TO_R16: Record<number,number> = {
  73:90,74:89,75:90,76:91,77:89,78:91,79:92,80:92,
  81:94,82:94,83:93,84:93,85:96,86:95,87:96,88:95,
}

const R16_TO_QF: Record<number,number> = {
  89:97,90:97,91:99,92:99,93:98,94:98,95:100,96:100,
}

const QF_TO_SF: Record<number,number> = {
  97:101,98:101,99:102,100:102,
}

const BEST3_GROUPS: Record<number,string[]> = {
  74:['A','B','C','D','F'],
  77:['C','D','F','G','H'],
  79:['C','E','F','H','I'],
  80:['E','H','I','J','K'],
  81:['B','E','F','I','J'],
  82:['A','E','H','I','J'],
  85:['E','F','G','I','J'],
  87:['D','E','I','J','L'],
}

// ── Core logic ───────────────────────────────────────────────────────────────

function getLeafSlots(matchNum: number, matchLabels: Record<number,{home:string,away:string}>): string[] {
  const m = matchLabels[matchNum]
  if (!m) return []
  const expand = (slot: string): string[] => {
    if (/^[12][A-L]$/.test(slot) || slot === 'Best 3rd') return [slot]
    const wm = slot.match(/^W M(\d+)$/)
    if (wm) return getLeafSlots(Number(wm[1]), matchLabels)
    return []
  }
  return [...expand(m.home), ...expand(m.away)]
}

interface RoundStep {
  round: string
  label: string
  myMatch: number
  oppSlots: string[]
}

function buildPath(mySlot: string): RoundStep[] {
  const r32 = SLOT_TO_R32[mySlot]
  if (!r32) return []
  const r32Labels = MATCH_LABELS[r32]
  if (!r32Labels) return []
  const oppR32Slot = r32Labels.home === mySlot ? r32Labels.away : r32Labels.home

  const r16 = R32_TO_R16[r32]
  const oppR32MatchEntry = Object.entries(R32_TO_R16).find(([m, r]) => r === r16 && Number(m) !== r32)
  const oppR16Slots = oppR32MatchEntry ? getLeafSlots(Number(oppR32MatchEntry[0]), MATCH_LABELS) : []

  const qf = R16_TO_QF[r16]
  const oppR16MatchEntry = Object.entries(R16_TO_QF).find(([m, q]) => q === qf && Number(m) !== r16)
  const oppQFSlots = oppR16MatchEntry ? getLeafSlots(Number(oppR16MatchEntry[0]), MATCH_LABELS) : []

  const sf = QF_TO_SF[qf]
  const oppQFMatchEntry = Object.entries(QF_TO_SF).find(([m, s]) => s === sf && Number(m) !== qf)
  const oppSFSlots = oppQFMatchEntry ? getLeafSlots(Number(oppQFMatchEntry[0]), MATCH_LABELS) : []

  const oppSFMatch = [101,102].find(m => m !== sf)!
  const oppFinalSlots = getLeafSlots(oppSFMatch, MATCH_LABELS)

  return [
    { round:'r32',   label:'Fase de 32',       myMatch:r32, oppSlots:[oppR32Slot] },
    { round:'r16',   label:'Oitavas de Final',  myMatch:r16, oppSlots:oppR16Slots },
    { round:'qf',    label:'Quartas de Final',  myMatch:qf,  oppSlots:oppQFSlots },
    { round:'sf',    label:'Semifinal',         myMatch:sf,  oppSlots:oppSFSlots },
    { round:'final', label:'Final',             myMatch:103, oppSlots:oppFinalSlots },
  ]
}

function buildPathFromR32(r32: number): RoundStep[] {
  const r32Labels = MATCH_LABELS[r32]
  if (!r32Labels) return []
  // Opponent in R32: whichever slot is not Best 3rd
  const oppR32Slot = r32Labels.home === 'Best 3rd' ? r32Labels.away : r32Labels.home

  const r16 = R32_TO_R16[r32]
  const oppR32MatchEntry = Object.entries(R32_TO_R16).find(([m, r]) => r === r16 && Number(m) !== r32)
  const oppR16Slots = oppR32MatchEntry ? getLeafSlots(Number(oppR32MatchEntry[0]), MATCH_LABELS) : []

  const qf = R16_TO_QF[r16]
  const oppR16MatchEntry = Object.entries(R16_TO_QF).find(([m, q]) => q === qf && Number(m) !== r16)
  const oppQFSlots = oppR16MatchEntry ? getLeafSlots(Number(oppR16MatchEntry[0]), MATCH_LABELS) : []

  const sf = QF_TO_SF[qf]
  const oppQFMatchEntry = Object.entries(QF_TO_SF).find(([m, s]) => s === sf && Number(m) !== qf)
  const oppSFSlots = oppQFMatchEntry ? getLeafSlots(Number(oppQFMatchEntry[0]), MATCH_LABELS) : []

  const oppSFMatch = [101,102].find(m => m !== sf)!
  const oppFinalSlots = getLeafSlots(oppSFMatch, MATCH_LABELS)

  return [
    { round:'r32',   label:'Fase de 32',       myMatch:r32, oppSlots:[oppR32Slot] },
    { round:'r16',   label:'Oitavas de Final',  myMatch:r16, oppSlots:oppR16Slots },
    { round:'qf',    label:'Quartas de Final',  myMatch:qf,  oppSlots:oppQFSlots },
    { round:'sf',    label:'Semifinal',         myMatch:sf,  oppSlots:oppSFSlots },
    { round:'final', label:'Final',             myMatch:103, oppSlots:oppFinalSlots },
  ]
}

// Can a team at standings index `idx` mathematically reach `targetPos` (0-based)?
// Simple check: remaining games give 3 pts each; if team can reach or surpass target's current pts.
function canReachPosition(group: EnrichedGroup, idx: number, targetPos: number): boolean {
  if (idx === targetPos) return true
  if (idx < targetPos) return true // already above target
  const standings = group.standings
  if (!standings || standings.length < 4) return true // no data yet, assume possible
  const team = standings[idx]
  const target = standings[targetPos]
  if (!team || !target) return true
  const played = team.played ?? 0
  const remaining = 3 - played // group stage = 3 games
  const maxPossible = (team.pts ?? 0) + remaining * 3
  return maxPossible >= (target.pts ?? 0)
}



interface GroupMiniTableProps {
  groupLetter: string
  groups: EnrichedGroup[]
  targetPos: number   // 0-based position we care about (0=1st, 1=2nd, 2=3rd)
}

function GroupMiniTable({ groupLetter, groups, targetPos }: GroupMiniTableProps) {
  const group = groups.find(g => g.group === groupLetter)
  if (!group) return (
    <div className="text-slate-600 text-xs px-3 py-2">Grupo {groupLetter} — sem dados</div>
  )

  const standings = group.standings ?? []

  return (
    <div className="mb-2">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 mb-0.5">
        Grupo {groupLetter}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-slate-600 border-b border-slate-800">
          <span className="w-4">#</span>
          <span className="flex-1">Seleção</span>
          <span className="w-6 text-right">Pts</span>
          <span className="w-8 text-right">SG</span>
        </div>
        {standings.map((s, i) => {
          const isTarget = i === targetPos
          const couldReach = !isTarget && canReachPosition(group, i, targetPos)
          const dimmed = !isTarget && !couldReach
          return (
            <div
              key={s.team_id ?? i}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs border-t border-slate-800/50 first:border-t-0 transition-colors
                ${isTarget ? 'bg-amber-500/15 border-l-2 border-l-amber-400' : ''}
                ${couldReach ? 'bg-amber-500/5 border-l-2 border-l-amber-900' : ''}
                ${dimmed ? 'opacity-35' : ''}
              `}
            >
              <span className={`w-4 shrink-0 text-right ${isTarget ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-600'}`}>{i + 1}º</span>
              {s.team ? (
                <>
                  <TeamFlag team={s.team} size="sm" />
                  <span className={`flex-1 font-medium truncate ${isTarget ? 'text-amber-900 dark:text-amber-100' : couldReach ? 'text-slate-300' : 'text-slate-500'}`}>
                    {s.team.name_en}
                  </span>
                </>
              ) : (
                <span className="flex-1 text-slate-500 italic">TBD</span>
              )}
              <span className={`font-bold w-6 text-right ${isTarget ? 'text-amber-700 dark:text-amber-300' : 'text-blue-400'}`}>{s.pts ?? '—'}</span>
              <span className="text-slate-500 w-8 text-right">
                {s.gd !== undefined ? (s.gd > 0 ? `+${s.gd}` : s.gd) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PathPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [finishPos, setFinishPos] = useState<'1st' | '2nd' | '3rd'>('1st')

  const { data: teamsData } = useSWR<{ teams: ApiTeam[] }>('/api/teams', fetcher, { revalidateOnFocus: false })
  const { data: groupsData } = useSWR<{ groups: EnrichedGroup[] }>('/api/groups', fetcher, { refreshInterval: 60_000 })
  const { data: gamesData } = useSWR<{ games: EnrichedGame[] }>('/api/games', fetcher, { revalidateOnFocus: false })

  const teams = teamsData?.teams ?? []
  const groups = groupsData?.groups ?? []

  // Group teams by group letter for the dropdown — exclude ESPN placeholders
  const teamsByGroup = useMemo(() => {
    const map = new Map<string, ApiTeam[]>()
    const realTeams = teams.filter(t =>
      t.fifa_code && t.fifa_code.length >= 2 &&
      !isEspnPlaceholder(t.name_en)
    )
    const sorted = [...realTeams].sort((a, b) => a.groups.localeCompare(b.groups) || a.name_en.localeCompare(b.name_en))
    for (const team of sorted) {
      const g = team.groups
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(team)
    }
    return map
  }, [teams])

  // Build matchNum → EnrichedGame lookup for playoff games
  const gameByMatchNum = useMemo(() => {
    const map = new Map<number, EnrichedGame>()
    for (const game of (gamesData?.games ?? [])) {
      const tz = getVenueTimezone(game)
      const d = parseMatchDate(game.local_date)
      if (!d) continue
      const dateStr = d.toLocaleDateString('sv-SE', { timeZone: tz })
      const rawCity = game.stadium?.city_en ?? ''
      const bp = BRACKET_POSITIONS.get(`${dateStr}_${rawCity}`) ??
                 BRACKET_POSITIONS.get(`${dateStr}_${rawCity.split(',')[0].trim()}`)
      if (bp?.matchNum) map.set(bp.matchNum, game)
    }
    return map
  }, [gamesData])

  const selectedTeam = teams.find(t => t.id === selectedTeamId)

  // Determine the slot key: '1X' or '2X' based on finishPos and team's group
  const mySlot = selectedTeam && finishPos !== '3rd'
    ? `${finishPos === '1st' ? '1' : '2'}${selectedTeam.groups}`
    : ''

  const path = mySlot ? buildPath(mySlot) : []

  // Best 3rd: multiple scenarios — one per R32 match where this group is eligible
  const best3rdScenarios = useMemo(() => {
    if (!selectedTeam || finishPos !== '3rd') return []
    return Object.entries(BEST3_GROUPS)
      .filter(([, gs]) => gs.includes(selectedTeam.groups))
      .map(([m]) => ({ r32: Number(m), path: buildPathFromR32(Number(m)) }))
      .sort((a, b) => a.r32 - b.r32)
  }, [selectedTeam, finishPos])

  // Helper: render opponent slots for a round step
  function renderOppSlots(step: RoundStep) {
    const { oppSlots, myMatch } = step

    // Collect unique groups referenced by slots
    const groupSlots = oppSlots.filter(s => /^[12][A-L]$/.test(s))
    const hasBest3rd = oppSlots.includes('Best 3rd')

    // Group by letter, collecting positions
    const groupMap = new Map<string, number[]>()  // letter -> positions (0-based)
    for (const slot of groupSlots) {
      const letter = slot[1]
      const pos = slot[0] === '1' ? 0 : 1
      if (!groupMap.has(letter)) groupMap.set(letter, [])
      groupMap.get(letter)!.push(pos)
    }

    const elements: React.ReactNode[] = []

    // Render group mini-tables for named slots (all 4 teams, highlight target position)
    for (const [letter, positions] of Array.from(groupMap.entries()).sort()) {
      const targetPos = positions.length === 1 ? positions[0] : 0
      elements.push(
        <GroupMiniTable key={letter} groupLetter={letter} groups={groups} targetPos={targetPos} />
      )
    }

    // Render Best 3rd tables
    if (hasBest3rd) {
      const best3rdGroups = BEST3_GROUPS[myMatch] ?? []
      elements.push(
        <div key="best3rd" className="mb-2">
          <div className="text-xs font-bold text-amber-500/70 uppercase tracking-wider px-1 py-1">
            Melhor 3º Lugar (grupos {best3rdGroups.join(', ')})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {best3rdGroups.map(letter => (
              <GroupMiniTable key={letter} groupLetter={letter} groups={groups} targetPos={2} />
            ))}
          </div>
        </div>
      )
    }

    return elements.length > 0 ? elements : (
      <div className="text-slate-600 text-xs px-1 py-2">Sem dados de adversários</div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Caminho no Torneio</h1>
            <p className="text-slate-500 text-sm mt-0.5">Veja os possíveis adversários de cada fase</p>
          </div>
        </div>

        {/* Team selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Selecionar Seleção
          </label>
          <select
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
          >
            <option value="">— Escolha uma seleção —</option>
            {Array.from(teamsByGroup.entries()).map(([groupLetter, groupTeams]) => (
              <optgroup key={groupLetter} label={`Grupo ${groupLetter}`}>
                {groupTeams.map(team => (
                  <option key={team.id} value={team.id}>{team.name_en}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Position toggle */}
          {selectedTeam && (
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Terminar o grupo como
              </label>
              <div className="flex gap-2">
                {(['1st', '2nd', '3rd'] as const).map(pos => (
                  <button
                    key={pos}
                    onClick={() => setFinishPos(pos)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${
                      finishPos === pos
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {pos === '1st' ? '1º Lugar' : pos === '2nd' ? '2º Lugar' : '3º (Melhor 3º)'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected team header */}
        {selectedTeam && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-6">
            <TeamFlag team={selectedTeam} size="md" />
            <div>
              <div className="text-white font-bold">{selectedTeam.name_en}</div>
              <div className="text-slate-500 text-xs">
                Grupo {selectedTeam.groups} · {finishPos === '1st' ? '1º Lugar' : finishPos === '2nd' ? '2º Lugar' : '3º Lugar (Melhor 3º)'}
                {mySlot ? ` → slot ${mySlot}` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Path rounds */}
        {path.length > 0 && (
          <div className="space-y-4">
            {path.map(step => {
              const stepGame = gameByMatchNum.get(step.myMatch)
              const stepDate = stepGame ? formatMatchDate(stepGame) : null
              return (
              <div key={step.round} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Round header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
                  <div>
                    <span className="font-bold text-white">{step.label}</span>
                    {stepDate && <span className="text-slate-300 text-xs ml-2">{stepDate}</span>}
                  </div>
                  <span className="text-amber-400 text-sm font-mono font-bold">M{step.myMatch}</span>
                </div>

                {/* Opponents */}
                <div className="p-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    Possíveis Adversários
                  </div>
                  {renderOppSlots(step)}
                </div>
              </div>
            )})}

          </div>
        )}

        {/* Best 3rd: multiple scenarios */}
        {finishPos === '3rd' && best3rdScenarios.length > 0 && (
          <div className="space-y-8">
            {best3rdScenarios.map(({ r32, path: scenPath }) => (
              <div key={r32}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Cenário</span>
                  <span className="text-white font-bold text-sm">se classificar para M{r32}</span>
                  <span className="text-slate-600 text-xs">
                    (grupos elegíveis: {BEST3_GROUPS[r32]?.join(', ')})
                  </span>
                </div>
                <div className="space-y-4">
                  {scenPath.map(step => {
                    const stepGame = gameByMatchNum.get(step.myMatch)
                    const stepDate = stepGame ? formatMatchDate(stepGame) : null
                    return (
                    <div key={step.round} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
                        <div>
                          <span className="font-bold text-white">{step.label}</span>
                          {stepDate && <span className="text-slate-300 text-xs ml-2">{stepDate}</span>}
                        </div>
                        <span className="text-amber-400 text-sm font-mono font-bold">M{step.myMatch}</span>
                      </div>
                      <div className="p-3">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                          Possíveis Adversários
                        </div>
                        {renderOppSlots(step)}
                      </div>
                    </div>
                  )})}

                </div>
              </div>
            ))}
          </div>
        )}

        {finishPos === '3rd' && selectedTeam && best3rdScenarios.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-sm">
            Grupo {selectedTeam.groups} não tem cenários de Melhor 3º Lugar mapeados.
          </div>
        )}

        {/* Empty state */}
        {!selectedTeam && (
          <div className="text-center py-20 text-slate-600">
            <div className="text-4xl mb-3">🗺️</div>
            <div className="text-sm">Selecione uma seleção para ver o caminho possível até a final</div>
          </div>
        )}
      </div>
    </div>
  )
}
