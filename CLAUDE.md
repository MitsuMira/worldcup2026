# Claude Code Setup

## Session initialization

Run these commands at the start of every session to ensure commits are attributed correctly:

```bash
git config user.email "mitsumira@users.noreply.github.com"
git config user.name "MitsuMira"
cat > .git/commit-template.txt << 'EOF'


Co-authored-by: Claude <claude@anthropic.com>
EOF
git config commit.template .git/commit-template.txt
```

This ensures:
- Commits count toward the GitHub contribution graph
- Every commit shows Claude as co-author (collaboration credit)

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v3 |
| Data fetching | SWR (client) + Next.js `fetch` with `revalidate` (server) |
| Storage | Vercel Redis via `ioredis` (prediction groups only) |
| Real-time | `partysocket` (WebSocket for live score polling) |
| Icons | Lucide React |
| Analytics | Vercel Analytics (cookieless) |
| Deployment | Vercel |

---

## Project structure

```
src/
├── app/
│   ├── api/            # Server-side API route handlers (ESPN proxy, group KV)
│   ├── groups/         # Prediction groups — list, create, join, leaderboard
│   ├── matches/[id]/   # Match detail page
│   ├── path/           # Tournament path explorer (pick team → full bracket path)
│   ├── players/        # All-player stats table (goals, cards, apps, minutes, club)
│   ├── playoffs/       # Knockout bracket & round list
│   ├── predictions/    # Personal score predictions
│   ├── schedule/       # Full 104-match schedule with filters
│   ├── standings/      # Group standings + best-thirds ranking
│   └── teams/          # Team list & individual team profiles with squad section
├── components/         # Shared React components
├── contexts/           # React contexts: LanguageContext, SettingsContext, FavoriteTeamsContext
└── lib/
    ├── bracketStructure.ts      # Knockout bracket slot positions & human-readable slot labels
    ├── espnClient.ts            # ESPN API client — scoreboard fetch, group derivation, FIFA tiebreaker sort
    ├── fifaRanking.ts           # Static FIFA ranking map (team abbreviation → rank number)
    ├── fifaSquads.ts            # Official FIFA WC2026 squad data (48 teams, 1248 players, keyed by FIFA code)
    ├── groupSimulation.ts       # Brute-force mathematical elimination/qualification checker
    ├── i18n.ts                  # Translations: EN / PT / ES
    ├── identity.ts              # Client-side user/group identity helpers (localStorage)
    ├── kv.ts                    # Vercel Redis client & KV data model for prediction groups
    ├── scoring.ts               # Shared prediction scoring logic (points calculation)
    ├── simulateLiveStandings.ts # Live score → simulated standings with position movement arrows
    ├── types.ts                 # Shared TypeScript types (EnrichedGame, EnrichedGroup, Prediction…)
    └── utils.ts                 # Formatting, timezone conversion, match status helpers
```

---

## Key files and patterns

### Data flow
All match data comes from ESPN public APIs — no API key needed. The server-side
`espnClient.ts` fetches scoreboard for June and July 2026 in parallel, then
derives group standings, team-to-group mapping, and FIFA tiebreaker sort server-side
before sending `EnrichedGame[]` / `EnrichedGroup[]` to the client. API routes under
`src/app/api/` act as a thin proxy layer to enable SWR polling from the client.

### Round detection (`espnClient.ts` — `parseRound`)
ESPN's API is inconsistent about labeling knockout rounds. The detection chain is:
1. `competition.notes[].headline` (most reliable)
2. `competition.type.abbreviation`
3. `competition.groups` object (can be misleading — ESPN sometimes attaches a team's
   origin group to R32 games)
4. Fallback: inspect team `displayName` strings for placeholder text like
   "Round of 32 Winner", "Quarterfinal Loser", etc.

### Bracket placeholder names (`bracketStructure.ts`)
ESPN uses placeholder display names for unconfirmed knockout teams (e.g. "Group A Winner",
"Round of 16 Match 3 Winner"). `isEspnPlaceholder()` detects these; `MatchCard` and
`GroupTable` resolve them to friendly slot labels using `BRACKET_POSITIONS` (keyed by
`date_city` string) and `MATCH_LABELS`.

### Mathematical elimination / qualification (`groupSimulation.ts`)
Brute-force: for up to 4 remaining games, enumerate all 3^N score combinations
(win/draw/loss, represented as 1-0 / 0-0 / 0-1) and apply full FIFA tiebreaker ranking.
- `canTeamReachPosition` → team is NOT yet eliminated (there exists a path)
- `isTeamConfirmedInTop` → team is mathematically qualified (all paths lead there)
Max iterations: 3^4 = 81 per group. The FIFA tiebreaker chain: H2H pts → H2H GD →
H2H GF → overall GD → overall GF → conduct score → FIFA ranking.

### Live standings simulation (`simulateLiveStandings.ts`)
During in-progress group-stage games, applies the current live score as if final,
re-sorts the group, and annotates each entry with `_liveMovement` (positive = moved up).
The `GroupTable` component renders ▲/▼ arrows and a "Simulated" badge when active.

### Predictions (`MatchCard.tsx`, `src/lib/scoring.ts`)
Predictions are stored in `localStorage` under key `wc2026_predictions` as a
`Record<matchId, Prediction>`. For knockout games, if the predicted regulation score
is a draw, the UI progressively reveals ET score inputs; if ET is also a draw, penalty
score inputs appear. Predictions lock when the match starts (`canPredict()` in `utils.ts`).

### Best thirds ranking (`src/app/standings/`)
After group stage, 12 third-placed teams are ranked by FIFA qualification criteria
(pts → GD → GF → conduct → FIFA rank) to determine which 8 advance to the Round of 32.

### Players page (`src/app/players/page.tsx`)
Aggregates stats for all players across all finished matches client-side. Fetches every
`/api/match/[id]` in parallel via `Promise.allSettled`, accumulates per-player
appearances, minutes played, goals, yellow/red cards. Stats key format: `"teamId\x00playerName"`
(null-byte separator prevents same-name cross-team collisions). Event attribution always
uses `event.teamId` directly — never home/away fallback — to avoid assigning goals to the
wrong team's same-named player. Own goals (`event.type === 'owngoal'`) and missed
penalties are excluded. Club and position are resolved by matching ESPN names against
`FIFA_SQUADS_BY_CODE` via a normalised-string fuzzy match (diacritic-stripped, letters only,
checking `lastName` ≥4, `nameOnShirt` ≥4, or exact full name ≥5 chars).

### FIFA squad data (`src/lib/fifaSquads.ts`)
Static data file keyed by FIFA team code (e.g. `"BRA"`, `"ARG"`). Each entry contains
`coach` and `players[]` with `name`, `lastName`, `nameOnShirt`, `pos` (GK/DF/MF/FW),
`club`, `dob` (DD/MM/YYYY), and `caps`. Used in the team detail squad section and the
players page for position/club enrichment.

### Squad section (`src/app/teams/[id]/page.tsx`)
Rendered by a `SquadSection` component (React component so it can call `useT()`).
Groups players by `POS_ORDER` (GK→DF→MF→FW). Merges FIFA static data with live ESPN
match stats via `matchFifaToEspn()` which does the same normalised-string fuzzy match.
Shows age (computed from `dob`), international caps, club, and any tournament stats.

### Group qualification indicators (`src/components/GroupTable.tsx`)
Three distinct visual states for teams in group standings:
- **Green number** (`text-emerald-500`): position is locked (confirmed 1st, or confirmed 2nd
  and mathematically cannot reach 1st)
- **Green dot (●)**: same as above — shown inline after the team name
- **Q badge**: team is mathematically guaranteed to qualify (confirmed top-2) but 1st vs 2nd
  is still undecided
- **✕ badge**: team is mathematically eliminated
- **Red number** (`text-red-500`): team is eliminated from qualifying positions

The legend at the bottom of each card shows only the indicators currently relevant to that group.

### i18n
Three locales: `en`, `pt`, `es`. Language is stored in `localStorage` and provided
via `LanguageContext`. All UI strings go through `useT()` hook. Locale selection is in
the Navbar settings panel. The `players` and `teamDetail` (squad sub-section) namespaces
were added as part of the squad/players features.

---

## Environment variables

| Variable | Purpose |
|---|---|
| `REDIS_URL` | Vercel Redis / Upstash connection string — required only for prediction groups |

Everything else (scores, standings, schedule, bracket, predictions) works without any
environment variables.

---

## Known ESPN API quirks (and fixes in this codebase)

- **Group assigned to knockout games**: ESPN sometimes populates `competition.groups`
  with a team's origin group even for R32 knockout matches. Fixed by checking
  `competition.notes` and `competition.type.abbreviation` first, then inspecting
  team display names, before trusting `competition.groups`.

- **Team leaking into wrong group standings**: When ESPN mis-tags an R32 game with a
  `comp.groups` value from one participant's origin group, `parseRound()` classifies
  the game as a group-stage match and adds both teams to that group. Fixed in
  `fetchEnrichedGroups()` with a `teamGroupAssignment` map that locks each team to its
  first-seen group; any subsequent attempt to add them to a different group is silently
  dropped (along with the stat accumulation, since `teams.get()` returns undefined for
  the wrong group). Example: Canada vs South Africa (R32) was tagged as Group A because
  South Africa is from Group A — Canada is now correctly excluded.

- **Scoreboard group letter missing**: For some games, `parseRound()` cannot extract
  a group letter from the scoreboard response. Fixed by a post-pass that looks up the
  team's group from a separate standings fetch (`fetchTeamGroupMap`), which uses
  `sports.core.api.espn.com` as primary source with a fallback to the older standings
  endpoint.

- **Stoppage time display**: `status.displayClock` can freeze at "45:00" during
  first-half stoppage. Fixed in `computeTimeElapsed` by taking `Math.max` of the
  minutes derived from `status.clock` (continuous seconds counter) and from
  `displayClock` (may freeze).

- **Duplicate scorer events**: ESPN fires both a "Penalty" and a "Goal" detail event
  for the same penalty goal. Fixed in `extractScorers` by deduplicating on the
  composite key `teamId-clockValue-playerId`.

- **Numeric vs abbreviation team IDs**: The scoreboard returns numeric ESPN team IDs
  in competitor objects but the rest of the codebase uses abbreviations (e.g. "BRA").
  Fixed by building a `numericToAbbr` map from the scoreboard response itself, avoiding
  extra API calls.
