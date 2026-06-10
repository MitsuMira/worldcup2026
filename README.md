# WC 2026 Tracker

Live scores, standings, schedule, knockout bracket, and predictions for the **FIFA World Cup 2026** (48 teams, June 11 – July 19, 2026).

## Features

- **Live scores** — real-time match status and elapsed time
- **Group standings** — all 12 groups with goal difference and qualification markers
- **Schedule** — 104 matches with filters (live / today / upcoming / finished / by group)
- **Knockout bracket** — split-bracket view from Round of 32 through the Final, with slot labels showing where each team comes from
- **Team profiles** — fixtures, group standing, stats, and tournament scorers
- **Predictions** — predict match scores locally (stored in browser, scored automatically)
- **Favorite teams** — pin teams to track next/last match and group position
- **Multi-language** — English, Portuguese, Español
- **Light / dark theme**
- **Timezone selection** — match times converted to your timezone
- **Cookieless analytics** via Vercel Analytics

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| Data fetching | SWR |
| Icons | Lucide React |
| Analytics | Vercel Analytics |
| Deployment | Vercel |

## Data source

Match data is fetched from the **ESPN public soccer API**. No API key or account is required.

## Quick start

```bash
git clone https://github.com/redacted/worldcup2026.git
cd worldcup2026
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables are needed.

## Project structure

```
src/
├── app/
│   ├── api/            # API route handlers (ESPN proxy)
│   ├── matches/[id]/   # Match detail page
│   ├── playoffs/       # Knockout bracket & round list
│   ├── predictions/    # Score predictions
│   ├── schedule/       # Full match schedule
│   ├── standings/      # Group standings
│   └── teams/          # Team list & profiles
├── components/         # Shared UI components
├── contexts/           # React contexts (language, settings, favorites)
└── lib/
    ├── bracketStructure.ts  # Knockout bracket positions & slot labels
    ├── espnClient.ts        # ESPN API client & data enrichment
    ├── i18n.ts              # Translations (EN / PT / ES)
    ├── types.ts             # Shared TypeScript types
    └── utils.ts             # Formatting, timezone, status helpers
```

## Deployment

The project is designed for one-click deployment on **Vercel**. No environment variables are required.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/redacted/worldcup2026)

## License

MIT © 2026 [MitsuMira](https://mitsumira.com)
