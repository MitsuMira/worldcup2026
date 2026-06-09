import 'server-only'
import type { ApiGame, ApiTeam, ApiGroup, ApiStadium, EnrichedGame, EnrichedGroup } from './types'

const BASE = process.env.WORLDCUP_API_BASE_URL ?? 'https://worldcup26.ir'

let _token: string | null = process.env.WORLDCUP_API_TOKEN ?? null

async function acquireToken(): Promise<string> {
  if (_token) return _token

  const email = process.env.WORLDCUP_API_EMAIL
  const password = process.env.WORLDCUP_API_PASSWORD
  if (!email || !password) {
    throw new Error('Set WORLDCUP_API_TOKEN (or WORLDCUP_API_EMAIL + WORLDCUP_API_PASSWORD) in env vars')
  }

  // Try login first, then register
  for (const url of [`${BASE}/auth/authenticate`, `${BASE}/auth/register`]) {
    const body = url.includes('register')
      ? { name: 'wc2026-tracker', email, password }
      : { email, password }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        const tok: string = data.token ?? data.access_token ?? data.accessToken ?? data.jwt
        if (tok) {
          _token = tok
          return _token
        }
      }
    } catch {}
  }
  throw new Error('Failed to obtain API token')
}

async function apiFetch<T>(path: string, revalidate = 30): Promise<T> {
  const token = await acquireToken()
  const opts: RequestInit = {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate },
  }
  const res = await fetch(`${BASE}${path}`, opts)
  if (res.status === 401) {
    _token = null
    const fresh = await acquireToken()
    const retry = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${fresh}` },
      next: { revalidate },
    })
    if (!retry.ok) throw new Error(`API ${path}: ${retry.status}`)
    return retry.json()
  }
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`)
  return res.json()
}

// Raw fetchers
export async function fetchGames(): Promise<ApiGame[]> {
  const d = await apiFetch<{ games: ApiGame[] }>('/get/games', 30)
  return d.games ?? []
}

export async function fetchTeams(): Promise<ApiTeam[]> {
  const d = await apiFetch<{ teams: ApiTeam[] }>('/get/teams', 3600)
  return d.teams ?? []
}

export async function fetchGroups(): Promise<ApiGroup[]> {
  const d = await apiFetch<{ groups: ApiGroup[] }>('/get/groups', 60)
  return d.groups ?? []
}

export async function fetchStadiums(): Promise<ApiStadium[]> {
  const d = await apiFetch<{ stadiums: ApiStadium[] }>('/get/stadiums', 3600)
  return d.stadiums ?? []
}

// Enriched fetchers (join data server-side)
export async function fetchEnrichedGames(): Promise<EnrichedGame[]> {
  const [games, teams, stadiums] = await Promise.all([
    fetchGames(),
    fetchTeams(),
    fetchStadiums(),
  ])
  const teamMap = new Map(teams.map((t) => [t.id, t]))
  const stadiumMap = new Map(stadiums.map((s) => [s.id, s]))
  return games.map((g) => ({
    ...g,
    homeTeam: teamMap.get(g.home_team_id),
    awayTeam: teamMap.get(g.away_team_id),
    stadium: stadiumMap.get(g.stadium_id),
  }))
}

export async function fetchEnrichedGroups(): Promise<EnrichedGroup[]> {
  const [groups, teams] = await Promise.all([fetchGroups(), fetchTeams()])
  const teamMap = new Map(teams.map((t) => [t.id, t]))
  return groups.map((g) => ({
    group: g.group,
    standings: (g.teams ?? [])
      .map((s) => ({
        ...s,
        team: teamMap.get(s.team_id),
        gd: parseInt(s.gf) - parseInt(s.ga),
      }))
      .sort((a, b) => {
        const ptsDiff = parseInt(b.pts) - parseInt(a.pts)
        if (ptsDiff !== 0) return ptsDiff
        const gdDiff = b.gd - a.gd
        if (gdDiff !== 0) return gdDiff
        return parseInt(b.gf) - parseInt(a.gf)
      }),
  }))
}
