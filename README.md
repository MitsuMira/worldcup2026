# WC 2026 Tracker

[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude%20AI-blueviolet?logo=anthropic)](https://claude.ai) [![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com) [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Live scores, standings, schedule, knockout bracket, and predictions for the **FIFA World Cup 2026** (48 teams, June 11 – July 19, 2026).

## Features

- **Live scores** — real-time match status, elapsed time, and goal scorers
- **Group standings** — all 12 groups with mathematical qualification and elimination markers; confirmed-position teams show a green dot, mathematically-guaranteed-but-position-undecided teams show Q, eliminated teams show ✕
- **Live standings simulation** — while a group match is in progress, standings update in real time as if the current score were final, with position-movement arrows (▲▼) and a "Simulated" badge
- **Best thirds table** — ranks all 12 third-placed teams by FIFA criteria (pts → GD → GF → conduct → FIFA rank) to show which 8 advance to the Round of 32
- **Schedule** — 104 matches with filters (live / today / upcoming / finished / by group)
- **Knockout bracket** — split-bracket view from Round of 32 through the Final, with slot labels showing where each team comes from (e.g. "Winner Group A", "Runner-up Group C")
- **Tournament path** — pick any team and finishing position (1st, 2nd, or best third) to see their full path through the bracket with possible opponents at each stage and match date/time
- **Team profiles** — fixtures, group standing, stats, tournament scorers, and full official squad with age, club, international caps, and position
- **Players page** — all-tournament player stats sorted by goals; shows appearances, minutes played, yellow/red cards, club, and position, with filters by position and search
- **Inline prediction editing** — predict match scores directly on match cards (no separate page needed); predictions lock when the match kicks off
- **Knockout ET/penalty prediction flow** — when predicting a knockout draw, ET score inputs appear automatically; if ET is also a draw, penalty score inputs follow
- **Prediction groups** — create or join private leaderboards with friends; tracks points, exact scores, and ranking in real time (requires Redis)
- **Favorite teams** — pin teams to track next/last match and group position
- **Multi-language** — English, Portuguese, Español
- **Dark theme** with system-preference detection
- **Timezone selection** — match times converted to your timezone
- **Cookieless analytics** via Vercel Analytics
- **PWA-ready** — installable on mobile (manifest + apple-touch-icon)

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| Data fetching | SWR |
| Storage | Vercel Redis (prediction groups) |
| Icons | Lucide React |
| Analytics | Vercel Analytics |
| Deployment | Vercel |

## Data source

Match data is fetched from the **ESPN public soccer API**. No API key or account is required.

## Quick start

```bash
git clone https://github.com/MitsuMira/worldcup2026.git
cd worldcup2026
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** Prediction groups require a Redis instance. Set `REDIS_URL` in your environment (or `.env.local`) to enable that feature. Everything else works without any environment variables.

## Project structure

```
src/
├── app/
│   ├── api/            # API route handlers (ESPN proxy + group KV)
│   ├── groups/         # Prediction groups — list, create, join, leaderboard
│   ├── matches/[id]/   # Match detail page
│   ├── path/           # Tournament path for a selected team
│   ├── players/        # All-player tournament stats (goals, cards, apps, minutes)
│   ├── playoffs/       # Knockout bracket & round list
│   ├── predictions/    # Score predictions
│   ├── schedule/       # Full match schedule
│   ├── standings/      # Group standings + best thirds ranking
│   └── teams/          # Team list & profiles with official squad
├── components/         # Shared UI components
├── contexts/           # React contexts (language, settings, favorites)
└── lib/
    ├── bracketStructure.ts      # Knockout bracket positions & slot labels
    ├── espnClient.ts            # ESPN API client & data enrichment
    ├── fifaSquads.ts            # Official WC2026 squad data (48 teams, 1248 players)
    ├── groupSimulation.ts       # Brute-force FIFA H2H elimination checker
    ├── i18n.ts                  # Translations (EN / PT / ES)
    ├── identity.ts              # Client-side user/group identity helpers
    ├── kv.ts                    # Vercel Redis client & KV data model
    ├── scoring.ts               # Shared prediction scoring logic
    ├── simulateLiveStandings.ts # Live score → standings simulation
    ├── types.ts                 # Shared TypeScript types
    └── utils.ts                 # Formatting, timezone, status helpers
```

## Deployment

The project is designed for one-click deployment on **Vercel**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MitsuMira/worldcup2026)

For prediction groups, add a `REDIS_URL` environment variable pointing to a Redis-compatible instance (e.g. Vercel KV, Upstash).

## Built with AI

This project was built with [Claude](https://claude.ai) (vibe coding) — the entire codebase was developed through conversational prompts with no manual coding.

## License

MIT © 2026 [MitsuMira](https://mitsumira.com)
