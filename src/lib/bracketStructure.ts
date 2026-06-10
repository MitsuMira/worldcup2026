/**
 * WC 2026 official knockout bracket positions.
 *
 * Key: `"YYYY-MM-DD_cityName"` using the LOCAL calendar date at the venue
 * (not UTC), so late kickoffs don't shift to the next day.
 *
 * half 0 = left bracket  → feeds SF M101 (Dallas, Jul 14)
 * half 1 = right bracket → feeds SF M102 (Atlanta, Jul 15)
 *
 * pos = 0-based position within the half (0 = top card, 7 = bottom).
 * Consecutive even/odd pairs feed the same R16 game:
 *   pos 0 & 1 → R16[0],  pos 2 & 3 → R16[1],  etc.
 *
 * Sources: Wikipedia "2026 FIFA World Cup knockout stage", FIFA.com,
 * and the official match schedule (matches 73-104).
 */

export interface BracketPos {
  round: 'r32' | 'r16' | 'qf' | 'sf'
  half:  0 | 1
  pos:   number
  matchNum: number
}

// Ordered pairs: [key, BracketPos]
// Multiple city-name variants handle ESPN's inconsistent venue.city_en spellings.
const ENTRIES: [string, BracketPos][] = [

  // ── Round of 32  (Jun 28 – Jul 3) ────────────────────────────────────────
  // LEFT HALF  →  QF1-M97 (Boston) via R16 M89 (Philadelphia) and M90 (Houston)

  // M74  1E vs Best-3rd[A/B/C/D/F]  →  R16-M89 top
  ['2026-06-29_Foxborough',                      { round: 'r32', half: 0, pos: 0, matchNum: 74 }],
  ['2026-06-29_Boston',                          { round: 'r32', half: 0, pos: 0, matchNum: 74 }],
  // M77  1I vs Best-3rd[C/D/F/G/H]  →  R16-M89 bottom
  ['2026-06-30_East Rutherford',                 { round: 'r32', half: 0, pos: 1, matchNum: 77 }],
  ['2026-06-30_New York',                        { round: 'r32', half: 0, pos: 1, matchNum: 77 }],
  ['2026-06-30_New York/New Jersey (East Rutherford)', { round: 'r32', half: 0, pos: 1, matchNum: 77 }],
  // M73  2A vs 2B  →  R16-M90 top
  ['2026-06-28_Inglewood',                       { round: 'r32', half: 0, pos: 2, matchNum: 73 }],
  ['2026-06-28_Los Angeles',                     { round: 'r32', half: 0, pos: 2, matchNum: 73 }],
  ['2026-06-28_Los Angeles (Inglewood)',          { round: 'r32', half: 0, pos: 2, matchNum: 73 }],
  // M75  1F vs 2C  →  R16-M90 bottom
  ['2026-06-29_Monterrey',                       { round: 'r32', half: 0, pos: 3, matchNum: 75 }],

  // LEFT HALF  →  QF2-M98 (LA) via R16 M93 (Dallas) and M94 (Seattle)

  // M83  2K vs 2L  →  R16-M93 top
  ['2026-07-02_Toronto',                         { round: 'r32', half: 0, pos: 4, matchNum: 83 }],
  // M84  1H vs 2J  →  R16-M93 bottom
  ['2026-07-02_Inglewood',                       { round: 'r32', half: 0, pos: 5, matchNum: 84 }],
  ['2026-07-02_Los Angeles',                     { round: 'r32', half: 0, pos: 5, matchNum: 84 }],
  ['2026-07-02_Los Angeles (Inglewood)',          { round: 'r32', half: 0, pos: 5, matchNum: 84 }],
  // M81  1D vs Best-3rd[B/E/F/I/J]  →  R16-M94 top
  ['2026-07-01_Santa Clara',                     { round: 'r32', half: 0, pos: 6, matchNum: 81 }],
  ['2026-07-01_San Francisco',                   { round: 'r32', half: 0, pos: 6, matchNum: 81 }],
  ['2026-07-01_San Francisco (Santa Clara)',      { round: 'r32', half: 0, pos: 6, matchNum: 81 }],
  ['2026-07-01_San Francisco Bay Area',           { round: 'r32', half: 0, pos: 6, matchNum: 81 }],
  // M82  1G vs Best-3rd[A/E/H/I/J]  →  R16-M94 bottom
  ['2026-07-01_Seattle',                         { round: 'r32', half: 0, pos: 7, matchNum: 82 }],

  // RIGHT HALF  →  QF3-M99 (Miami) via R16 M91 (NY/NJ) and M92 (Mexico City)

  // M76  1C vs 2F  →  R16-M91 top
  ['2026-06-29_Houston',                         { round: 'r32', half: 1, pos: 0, matchNum: 76 }],
  // M78  2E vs 2I  →  R16-M91 bottom
  ['2026-06-30_Arlington',                       { round: 'r32', half: 1, pos: 1, matchNum: 78 }],
  ['2026-06-30_Dallas',                          { round: 'r32', half: 1, pos: 1, matchNum: 78 }],
  ['2026-06-30_Dallas (Arlington)',               { round: 'r32', half: 1, pos: 1, matchNum: 78 }],
  // M79  1A vs Best-3rd[C/E/F/H/I]  →  R16-M92 top
  ['2026-06-30_Mexico City',                     { round: 'r32', half: 1, pos: 2, matchNum: 79 }],
  // M80  1L vs Best-3rd[E/H/I/J/K]  →  R16-M92 bottom
  ['2026-07-01_Atlanta',                         { round: 'r32', half: 1, pos: 3, matchNum: 80 }],

  // RIGHT HALF  →  QF4-M100 (KC) via R16 M95 (Atlanta) and M96 (Vancouver)

  // M86  1J vs 2H  →  R16-M95 top
  ['2026-07-03_Miami Gardens',                   { round: 'r32', half: 1, pos: 4, matchNum: 86 }],
  ['2026-07-03_Miami',                           { round: 'r32', half: 1, pos: 4, matchNum: 86 }],
  ['2026-07-03_Miami (Miami Gardens)',            { round: 'r32', half: 1, pos: 4, matchNum: 86 }],
  // M88  2D vs 2G  →  R16-M95 bottom
  ['2026-07-03_Arlington',                       { round: 'r32', half: 1, pos: 5, matchNum: 88 }],
  ['2026-07-03_Dallas',                          { round: 'r32', half: 1, pos: 5, matchNum: 88 }],
  ['2026-07-03_Dallas (Arlington)',               { round: 'r32', half: 1, pos: 5, matchNum: 88 }],
  // M85  1B vs Best-3rd[E/F/G/I/J]  →  R16-M96 top
  ['2026-07-02_Vancouver',                       { round: 'r32', half: 1, pos: 6, matchNum: 85 }],
  // M87  1K vs Best-3rd[D/E/I/J/L]  →  R16-M96 bottom
  ['2026-07-03_Kansas City',                     { round: 'r32', half: 1, pos: 7, matchNum: 87 }],

  // ── Round of 16  (Jul 4–7) ──────────────────────────────────────────────────
  // Left half
  ['2026-07-04_Philadelphia',                    { round: 'r16', half: 0, pos: 0, matchNum: 89 }],
  ['2026-07-04_Houston',                         { round: 'r16', half: 0, pos: 1, matchNum: 90 }],
  ['2026-07-06_Arlington',                       { round: 'r16', half: 0, pos: 2, matchNum: 93 }],
  ['2026-07-06_Dallas',                          { round: 'r16', half: 0, pos: 2, matchNum: 93 }],
  ['2026-07-06_Dallas (Arlington)',               { round: 'r16', half: 0, pos: 2, matchNum: 93 }],
  ['2026-07-06_Seattle',                         { round: 'r16', half: 0, pos: 3, matchNum: 94 }],
  // Right half
  ['2026-07-05_East Rutherford',                 { round: 'r16', half: 1, pos: 0, matchNum: 91 }],
  ['2026-07-05_New York',                        { round: 'r16', half: 1, pos: 0, matchNum: 91 }],
  ['2026-07-05_New York/New Jersey (East Rutherford)', { round: 'r16', half: 1, pos: 0, matchNum: 91 }],
  ['2026-07-05_Mexico City',                     { round: 'r16', half: 1, pos: 1, matchNum: 92 }],
  ['2026-07-07_Atlanta',                         { round: 'r16', half: 1, pos: 2, matchNum: 95 }],
  ['2026-07-07_Vancouver',                       { round: 'r16', half: 1, pos: 3, matchNum: 96 }],

  // ── Quarter-finals  (Jul 9–11) ──────────────────────────────────────────────
  ['2026-07-09_Foxborough',                      { round: 'qf', half: 0, pos: 0, matchNum: 97 }],
  ['2026-07-09_Boston',                          { round: 'qf', half: 0, pos: 0, matchNum: 97 }],
  ['2026-07-10_Inglewood',                       { round: 'qf', half: 0, pos: 1, matchNum: 98 }],
  ['2026-07-10_Los Angeles',                     { round: 'qf', half: 0, pos: 1, matchNum: 98 }],
  ['2026-07-10_Los Angeles (Inglewood)',          { round: 'qf', half: 0, pos: 1, matchNum: 98 }],
  ['2026-07-11_Miami Gardens',                   { round: 'qf', half: 1, pos: 0, matchNum: 99 }],
  ['2026-07-11_Miami',                           { round: 'qf', half: 1, pos: 0, matchNum: 99 }],
  ['2026-07-11_Miami (Miami Gardens)',            { round: 'qf', half: 1, pos: 0, matchNum: 99 }],
  ['2026-07-11_Kansas City',                     { round: 'qf', half: 1, pos: 1, matchNum: 100 }],

  // ── Semi-finals  (Jul 14–15) ────────────────────────────────────────────────
  ['2026-07-14_Arlington',                       { round: 'sf', half: 0, pos: 0, matchNum: 101 }],
  ['2026-07-14_Dallas',                          { round: 'sf', half: 0, pos: 0, matchNum: 101 }],
  ['2026-07-14_Dallas (Arlington)',               { round: 'sf', half: 0, pos: 0, matchNum: 101 }],
  ['2026-07-15_Atlanta',                         { round: 'sf', half: 1, pos: 0, matchNum: 102 }],
]

export const BRACKET_POSITIONS: ReadonlyMap<string, BracketPos> =
  new Map(ENTRIES)
