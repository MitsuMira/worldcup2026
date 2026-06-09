// Raw API types — all numeric/boolean fields come back as strings
export interface ApiGame {
  _id?: string
  id: string
  home_team_id: string
  away_team_id: string
  home_score: string
  away_score: string
  home_scorers: string   // "null" string or comma-separated names
  away_scorers: string
  group: string          // "A"-"L", "R32", "R16", "QF", "SF", "3RD", "FINAL"
  matchday: string       // "1"-"9"
  local_date: string     // "MM/DD/YYYY HH:MM" — venue local time or UTC (TBD via /api/game-debug)
  persian_date: string   // same moment in Jalali calendar + Tehran time (IRDT = UTC+4:30 in summer)
  // Potential additional UTC fields from the API (captured if present)
  utc_date?: string
  datetime_utc?: string
  date_utc?: string
  stadium_id: string
  finished: string       // "TRUE" | "FALSE"
  time_elapsed: string   // "notstarted" | minute as string, e.g. "45"
  type: string           // "group"|"r32"|"r16"|"qf"|"sf"|"third"|"final"
  home_team_name_en?: string
  home_team_name_fa?: string
  away_team_name_en?: string
  away_team_name_fa?: string
  home_team_label?: string
  away_team_label?: string
}

export interface ApiTeam {
  id: string
  name_en: string
  name_fa: string
  fifa_code: string
  groups: string   // group letter A-L
  flag: string     // URL to flag image
}

export interface ApiGroupStanding {
  team_id: string
  pts: string
  gf: string
  ga: string
}

export interface ApiGroup {
  group: string   // "A"-"L"
  teams: ApiGroupStanding[]
}

export interface ApiStadium {
  id: string
  name_en: string
  name_fa: string
  fifa_name: string
  city_en: string
  country_en: string
  capacity: number
}

// Enriched game (team data joined in)
export interface EnrichedGame extends ApiGame {
  homeTeam?: ApiTeam
  awayTeam?: ApiTeam
  stadium?: ApiStadium
}

// Enriched group (team data joined in)
export interface EnrichedGroup {
  group: string
  standings: Array<ApiGroupStanding & { team?: ApiTeam; gd: number }>
}

// Prediction stored in localStorage
export interface Prediction {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  homeTeamFlag: string
  awayTeamFlag: string
  homeScore: number
  awayScore: number
  createdAt: string
}

export type PredictionResult = 'correct' | 'correct-winner' | 'wrong' | 'pending'
