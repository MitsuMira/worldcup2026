export type Lang = 'en' | 'pt' | 'es'

export interface Translations {
  nav: { home: string; schedule: string; standings: string; playoffs: string; teams: string; players: string; predictions: string }
  countdown: { label: string; days: string; hours: string; min: string; sec: string }
  ceremony: {
    title: string; subtitle: string; countdownLabel: string
    mexico: string; canada: string; usa: string
  }
  home: {
    liveNow: string; today: string; upNext: string; firstMatches: string
    recentResults: string; groupStandings: string; viewAllGroups: string
    upcoming48h: string; noUpcoming48h: string
    tournamentName: string; tournamentDates: string; tournamentHosts: string
  }
  schedule: {
    title: string; subtitle: string
    all: string; live: string; today: string; upcoming: string
    finished: string; groupStage: string; knockout: string
    allGroups: string; match: string; matches: string; noMatches: string
  }
  standings: {
    title: string; subtitle: string; team: string; top2: string
    noData: string; qualTitle: string; qualRules: string[]
    bestThirds: string; bestThirdsDesc: string; qualifiedEliminated: string; bestThirdsNote: string
    liveNote: string
  }
  playoffs: {
    title: string; subtitle: string
    bracket: string; r32: string; r16: string; qf: string; sf: string; third: string; final: string
    tbd: string; noGames: string
  }
  bracket: {
    groupPrefix: string
    groupRank1: string
    groupRank2: string
    bestThird: string
    winner: string
    runnerUp: string
  }
  settings: {
    title: string; language: string; timezone: string; timezoneHint: string; close: string
    theme: string; themeLight: string; themeDark: string
  }
  teams: { title: string; subtitle: string; search: string; all: string; noTeams: string; qualified: string; eliminated: string; knockoutPhase: string; eliminatedGroupStage: string; teamsCount: string; phaseFinal: string; phaseThird: string; phaseSF: string; phaseQF: string; phaseR16: string; phaseR32: string; phaseGroupStage: string }
  players: { title: string; subtitle: string; search: string; allPos: string; noPlayers: string }
  favorites: {
    myTeams: string; noFavorites: string; addFavorites: string
    nextMatch: string; lastMatch: string; groupPos: string
    addToFav: string; removeFromFav: string
  }
  teamDetail: {
    backToTeams: string; allMatches: string; groupStanding: string
    stats: string; played: string; won: string; drawn: string; lost: string
    noMatches: string; upcomingMatches: string; pastMatches: string; scorers: string
    squad: string; headCoach: string
    posGK: string; posDF: string; posMF: string; posFW: string
    ageUnit: string; intlCaps: string; appsShort: string
    yellowCards: string; redCards: string
    notFound: string; eliminated: string; tournamentPath: string; possible: string
  }
  predictions: {
    title: string; subtitle: string; points: string; exactScores: string; pending: string
    predictTab: string; resultsTab: string; save: string; clear: string
    noUpcoming: string; noResults: string; waitingResults: string
    scoringTitle: string; scoringText: string
    resultCorrect: string; resultWinner: string; resultDraw: string; resultWrong: string; resultPending: string
    actual: string; yourPick: string; locked: string; locksIn: string
    ofMax: string; groups: string; cancel: string
  }
  match: {
    live: string; vs: string; predict: string
    stageGroup: string; stageR32: string; stageR16: string
    stageQF: string; stageSF: string; stageThird: string; stageFinal: string
    myPick: string; editPick: string
    aet: string; penalties: string; aetHint: string
  }
  matchDetail: {
    back: string; notFound: string; homeLink: string; ft: string; ht: string
    tabTimeline: string; tabFeed: string; tabStats: string; tabLineups: string; tabH2H: string
    loadingDetail: string; detailUnavailable: string
    noEvents: string; noStats: string; noLineups: string; subs: string
    statPossession: string; statShots: string; statShotsOnTarget: string
    statCorners: string; statFouls: string; statOffsides: string; statSaves: string
    h2hTitle: string; noH2H: string; formTitle: string; watching: string
  }
  group: { top2: string }
  footer: { project: string; dataVia: string; privacy: string; github: string; alsoBy: string }
  loading: { matches: string; schedule: string; standings: string; teams: string; generic: string }
  errors: { games: string; schedule: string; standings: string; teams: string; predictions: string }
}

export const en: Translations = {
  nav: { home: 'Home', schedule: 'Schedule', standings: 'Standings', playoffs: 'Playoffs', teams: 'Teams', players: 'Players', predictions: 'Predictions' },
  countdown: { label: 'Kickoff countdown', days: 'Days', hours: 'Hours', min: 'Min', sec: 'Sec' },
  ceremony: {
    title: '🎭 Opening Ceremony',
    subtitle: 'Across all three host nations',
    countdownLabel: 'Ceremony starts in',
    mexico: 'Mexico City · Estadio Azteca',
    canada: 'Toronto · BMO Field',
    usa: 'Los Angeles · SoFi Stadium',
  },
  home: {
    liveNow: '🔴 Live Now', today: '📅 Today', upNext: '⏭ Up Next',
    firstMatches: '🗓 Upcoming Matches', recentResults: '📊 Recent Results',
    groupStandings: '🏆 Group Standings', viewAllGroups: 'View all 12 groups →',
    upcoming48h: '🗓 Next 48 Hours', noUpcoming48h: 'No matches in the next 48 hours.',
    tournamentName: 'FIFA World Cup 2026',
    tournamentDates: 'June 11 – July 19, 2026',
    tournamentHosts: 'United States, Canada & Mexico',
  },
  schedule: {
    title: 'Schedule', subtitle: 'All 104 matches · June 11 – July 19, 2026',
    all: 'All', live: 'Live', today: 'Today', upcoming: 'Upcoming',
    finished: 'Finished', groupStage: 'Group Stage', knockout: 'Knockout',
    allGroups: 'All Groups', match: 'match', matches: 'matches', noMatches: 'No matches for this filter.',
  },
  standings: {
    title: 'Group Standings', subtitle: '12 groups · Top 2 in each group advance',
    team: 'Team', top2: 'Top 2 advance', noData: 'No standings data yet.',
    qualTitle: 'How qualification works',
    qualRules: [
      '48 teams, 12 groups of 4. Top 2 advance; the 8 best third-placed teams also qualify (32 total).',
      'Step 1 — head-to-head mini-table among the tied teams: points → goal diff → goals scored.',
      'Step 2 (still tied) — overall group: goal diff → goals scored → conduct (cards).',
      'Step 3 (still tied) — FIFA ranking.',
      'Best third-placed teams: points → goal diff → goals scored → conduct → FIFA ranking.',
    ],
    bestThirds: 'Best Third-Placed Teams',
    bestThirdsDesc: 'The 8 best from 12 groups advance to the Round of 32 · ranked by Pts → GD → GF → Cards → FIFA Ranking',
    qualifiedEliminated: 'Qualified ↑ · Eliminated ↓',
    bestThirdsNote: 'Final ranking of best thirds will be decided when all group matches are complete.',
    liveNote: 'Standings simulated with current live scores. May change at any moment.',
  },
  playoffs: {
    title: 'Playoffs', subtitle: 'Knockout stage · Round of 32 through Final',
    bracket: 'Bracket', r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: '3rd', final: 'Final',
    tbd: 'TBD', noGames: 'No games for this round yet.',
  },
  settings: {
    title: 'Settings', language: 'Language', timezone: 'Timezone',
    timezoneHint: 'Match times are converted to your selected timezone.',
    close: 'Close',
    theme: 'Theme', themeLight: '☀️ Light', themeDark: '🌙 Dark',
  },
  teams: { title: 'Teams', subtitle: '48 nations competing for the World Cup', search: 'Search teams…', all: 'All', noTeams: 'No teams found.', qualified: 'Qualified', eliminated: 'Eliminated', knockoutPhase: 'Knockout Phase', eliminatedGroupStage: 'Eliminated in Group Stage', teamsCount: 'teams', phaseFinal: 'Final', phaseThird: '3rd Place', phaseSF: 'Semi-Finals', phaseQF: 'Quarter-Finals', phaseR16: 'Round of 16', phaseR32: 'Round of 32', phaseGroupStage: 'Group Stage' },
  players: { title: 'Players', subtitle: 'Tournament stats · All players with appearances', search: 'Search players…', allPos: 'All', noPlayers: 'No players found.' },
  favorites: {
    myTeams: '⭐ My Teams', noFavorites: 'No favorite teams yet.',
    addFavorites: 'Tap the ⭐ on any team to track them here.',
    nextMatch: 'Next', lastMatch: 'Last', groupPos: 'Group',
    addToFav: 'Add to favorites', removeFromFav: 'Remove from favorites',
  },
  teamDetail: {
    backToTeams: '← Teams', allMatches: 'All Matches', groupStanding: 'Group Standing',
    stats: 'Stats', played: 'P', won: 'W', drawn: 'D', lost: 'L',
    noMatches: 'No matches yet.', upcomingMatches: 'Upcoming', pastMatches: 'Results', scorers: 'Tournament Scorers',
    squad: 'Squad', headCoach: 'Head coach',
    posGK: 'Goalkeepers', posDF: 'Defenders', posMF: 'Midfielders', posFW: 'Forwards',
    ageUnit: 'yrs', intlCaps: 'intl. caps', appsShort: 'apps',
    yellowCards: 'yellow cards', redCards: 'red cards',
    notFound: 'Team not found.', eliminated: 'Eliminated', tournamentPath: 'Tournament Path', possible: 'possible',
  },
  predictions: {
    title: 'Predictions', subtitle: 'Predict match scores · Stored locally in your browser',
    points: 'Points', exactScores: 'Exact Scores', pending: 'Pending',
    predictTab: 'Predict', resultsTab: 'Results', save: 'Save', clear: 'Clear prediction',
    noUpcoming: 'No upcoming matches to predict.',
    noResults: 'No predictions yet. Start predicting upcoming matches!',
    waitingResults: 'Waiting for your predicted matches to finish.',
    scoringTitle: 'Scoring', scoringText: 'Group stage: exact score 3 pts · correct winner/draw 1 pt. Knockout: same rule for the phase that decides the match (regulation, extra time, or penalties) — matches decided by penalties are scored in stages (ET score + shootout) for up to 3 pts total.',
    resultCorrect: '✓ Exact score! +3', resultWinner: '~ Correct winner +1', resultDraw: '~ Correct draw +1',
    resultWrong: '✗ Wrong', resultPending: 'Pending', actual: 'Actual', yourPick: 'Your pick', locked: '🔒 Locked', locksIn: 'Locks in',
    ofMax: 'of {n} max', groups: 'Groups', cancel: 'Cancel',
  },
  match: {
    live: 'LIVE', vs: 'vs', predict: '✦ Make a prediction →',
    stageGroup: 'Group', stageR32: 'Round of 32', stageR16: 'Round of 16',
    stageQF: 'Quarter-final', stageSF: 'Semi-final', stageThird: '3rd Place', stageFinal: 'Final',
    myPick: 'My pick', editPick: 'Edit',
    aet: 'AET', penalties: 'Pen.', aetHint: "total after 120' · min.",
  },
  matchDetail: {
    back: '← Back', notFound: 'Match not found.', homeLink: '← Home', ft: 'FT', ht: 'HT',
    tabTimeline: 'Timeline', tabFeed: 'Live Feed', tabStats: 'Stats', tabLineups: 'Lineups', tabH2H: 'Recent Form',
    loadingDetail: 'Loading match data…', detailUnavailable: 'Match details unavailable.',
    noEvents: 'No events yet.', noStats: 'Stats not available yet.', noLineups: 'Lineups not available yet.',
    subs: 'Subs',
    statPossession: 'Possession %', statShots: 'Total Shots', statShotsOnTarget: 'Shots on Target',
    statCorners: 'Corners', statFouls: 'Fouls', statOffsides: 'Offsides', statSaves: 'Saves',
    h2hTitle: 'Head to Head', noH2H: 'No previous meetings found', formTitle: 'Last 5 Matches', watching: 'Watching',
  },
  bracket: {
    groupPrefix: 'Group',
    groupRank1: '1st',
    groupRank2: '2nd',
    bestThird: 'Best 3rd Place',
    winner: 'Winner',
    runnerUp: 'Runner-up',
  },
  group: { top2: 'Top 2 advance' },
  footer: {
    project: 'A MitsuMira project · 3D printing & robotics',
    dataVia: 'Data via ESPN',
    privacy: 'Privacy',
    github: 'GitHub',
    alsoBy: 'Also by MitsuMira:',
  },
  loading: { matches: 'Loading matches…', schedule: 'Loading schedule…', standings: 'Loading standings…', teams: 'Loading teams…', generic: 'Loading…' },
  errors: {
    games: 'Failed to load matches. Check your API credentials.',
    schedule: 'Failed to load schedule.', standings: 'Failed to load standings.',
    teams: 'Failed to load teams.', predictions: 'Failed to load games.',
  },
}

export const pt: Translations = {
  nav: { home: 'Início', schedule: 'Calendário', standings: 'Classificação', playoffs: 'Playoffs', teams: 'Seleções', players: 'Jogadores', predictions: 'Palpites' },
  countdown: { label: 'Contagem regressiva', days: 'Dias', hours: 'Horas', min: 'Min', sec: 'Seg' },
  ceremony: {
    title: '🎭 Cerimônia de Abertura',
    subtitle: 'Nos três países anfitriões',
    countdownLabel: 'Cerimônia começa em',
    mexico: 'Cidade do México · Estadio Azteca',
    canada: 'Toronto · BMO Field',
    usa: 'Los Angeles · SoFi Stadium',
  },
  home: {
    liveNow: '🔴 Ao Vivo', today: '📅 Hoje', upNext: '⏭ A Seguir',
    firstMatches: '🗓 Próximas Partidas', recentResults: '📊 Resultados Recentes',
    groupStandings: '🏆 Classificação dos Grupos', viewAllGroups: 'Ver todos os 12 grupos →',
    upcoming48h: '🗓 Próximas 48 Horas', noUpcoming48h: 'Nenhuma partida nas próximas 48 horas.',
    tournamentName: 'Copa do Mundo FIFA 2026',
    tournamentDates: '11 Jun – 19 Jul, 2026',
    tournamentHosts: 'Estados Unidos, Canadá e México',
  },
  schedule: {
    title: 'Calendário', subtitle: 'Todos os 104 jogos · 11 Jun – 19 Jul, 2026',
    all: 'Todos', live: 'Ao Vivo', today: 'Hoje', upcoming: 'Próximos',
    finished: 'Finalizados', groupStage: 'Fase de Grupos', knockout: 'Eliminatórias',
    allGroups: 'Todos os Grupos', match: 'jogo', matches: 'jogos', noMatches: 'Nenhum jogo para este filtro.',
  },
  standings: {
    title: 'Classificação', subtitle: '12 grupos · Os 2 primeiros de cada grupo avançam',
    team: 'Seleção', top2: 'Top 2 avançam', noData: 'Nenhum dado de classificação ainda.',
    qualTitle: 'Como funciona a classificação',
    qualRules: [
      '48 seleções, 12 grupos de 4. Os 2 primeiros avançam; os 8 melhores 3ºs também (32 no total).',
      'Passo 1 — mini-tabela só entre os empatados: pontos → saldo de gols → gols marcados.',
      'Passo 2 (ainda empatados) — geral: saldo de gols → gols marcados → fair play (cartões).',
      'Passo 3 (ainda empatados) — Ranking FIFA.',
      'Melhores 3ºs: pontos → saldo de gols → gols marcados → fair play → Ranking FIFA.',
    ],
    bestThirds: 'Melhores 3ºs Colocados',
    bestThirdsDesc: 'Os 8 melhores de 12 grupos avançam para a Fase de 32 · ordenados por Pts → SG → GP → Cartões → Ranking FIFA',
    qualifiedEliminated: 'Classificados ↑ · Eliminados ↓',
    bestThirdsNote: 'A classificação final dos melhores 3ºs será definida ao término de todos os jogos da fase de grupos.',
    liveNote: 'Classificação simulada com o placar atual dos jogos ao vivo. Pode mudar a qualquer momento.',
  },
  playoffs: {
    title: 'Playoffs', subtitle: 'Fase eliminatória · Da fase de 32 à Final',
    bracket: 'Chaveamento', r32: 'F32', r16: 'Oitavas', qf: 'Quartas', sf: 'Semi', third: '3º', final: 'Final',
    tbd: 'A definir', noGames: 'Nenhum jogo para esta rodada ainda.',
  },
  settings: {
    title: 'Configurações', language: 'Idioma', timezone: 'Fuso horário',
    timezoneHint: 'Os horários das partidas são convertidos para o fuso selecionado.',
    close: 'Fechar',
    theme: 'Tema', themeLight: '☀️ Claro', themeDark: '🌙 Escuro',
  },
  teams: { title: 'Seleções', subtitle: '48 nações disputando a Copa do Mundo', search: 'Buscar seleções…', all: 'Todas', noTeams: 'Nenhuma seleção encontrada.', qualified: 'Classificado', eliminated: 'Eliminado', knockoutPhase: 'Fase Eliminatória', eliminatedGroupStage: 'Eliminados na Fase de Grupos', teamsCount: 'seleções', phaseFinal: 'Final', phaseThird: '3º Lugar', phaseSF: 'Semifinais', phaseQF: 'Quartas de Final', phaseR16: 'Oitavas de Final', phaseR32: 'Rodada de 32', phaseGroupStage: 'Fase de Grupos' },
  players: { title: 'Jogadores', subtitle: 'Estatísticas do torneio · Todos com minutagem', search: 'Buscar jogadores…', allPos: 'Todos', noPlayers: 'Nenhum jogador encontrado.' },
  favorites: {
    myTeams: '⭐ Meus Times', noFavorites: 'Nenhum time favorito ainda.',
    addFavorites: 'Toque em ⭐ em qualquer seleção para acompanhá-la aqui.',
    nextMatch: 'Próx.', lastMatch: 'Últ.', groupPos: 'Grupo',
    addToFav: 'Adicionar aos favoritos', removeFromFav: 'Remover dos favoritos',
  },
  teamDetail: {
    backToTeams: '← Seleções', allMatches: 'Todas as Partidas', groupStanding: 'Classificação do Grupo',
    stats: 'Estatísticas', played: 'J', won: 'V', drawn: 'E', lost: 'D',
    noMatches: 'Nenhuma partida ainda.', upcomingMatches: 'Próximas', pastMatches: 'Resultados', scorers: 'Artilheiros',
    squad: 'Elenco', headCoach: 'Técnico',
    posGK: 'Goleiros', posDF: 'Defensores', posMF: 'Meias', posFW: 'Atacantes',
    ageUnit: 'anos', intlCaps: 'caps internacionais', appsShort: 'jgs',
    yellowCards: 'cartões amarelos', redCards: 'cartões vermelhos',
    notFound: 'Seleção não encontrada.', eliminated: 'Eliminado', tournamentPath: 'Caminho no Torneio', possible: 'possíveis',
  },
  predictions: {
    title: 'Palpites', subtitle: 'Preveja os placares · Salvo localmente no seu navegador',
    points: 'Pontos', exactScores: 'Placar Exato', pending: 'Pendente',
    predictTab: 'Prever', resultsTab: 'Resultados', save: 'Salvar', clear: 'Limpar previsão',
    noUpcoming: 'Nenhuma partida futura para prever.',
    noResults: 'Nenhuma previsão feita ainda. Comece a prever as próximas partidas!',
    waitingResults: 'Aguardando o término das partidas previstas.',
    scoringTitle: 'Pontuação', scoringText: 'Fase de grupos: placar exato 3 pts · vencedor/empate correto 1 pt. Mata-mata: mesma regra na etapa que decide a partida (tempo normal, prorrogação ou pênaltis) — partidas decididas nos pênaltis pontuam por etapas (placar da prorrogação + disputa), até 3 pts no total.',
    resultCorrect: '✓ Placar exato! +3', resultWinner: '~ Vencedor correto +1', resultDraw: '~ Empate correto +1',
    resultWrong: '✗ Errado', resultPending: 'Pendente', actual: 'Real', yourPick: 'Seu palpite', locked: '🔒 Bloqueado', locksIn: 'Bloqueia em',
    ofMax: 'de {n} máx.', groups: 'Grupos', cancel: 'Cancelar',
  },
  match: {
    live: 'AO VIVO', vs: 'vs', predict: '✦ Fazer previsão →',
    stageGroup: 'Grupo', stageR32: 'Fase de 32', stageR16: 'Oitavas de Final',
    stageQF: 'Quartas de Final', stageSF: 'Semifinal', stageThird: 'Disputa do 3º Lugar', stageFinal: 'Final',
    myPick: 'Meu palpite', editPick: 'Editar',
    aet: 'Prórr.', penalties: 'Pên.', aetHint: "total após 120' · mín.",
  },
  matchDetail: {
    back: '← Voltar', notFound: 'Partida não encontrada.', homeLink: '← Início', ft: 'FT', ht: 'HT',
    tabTimeline: 'Linha do Tempo', tabFeed: 'Ao Vivo', tabStats: 'Estatísticas', tabLineups: 'Escalações', tabH2H: 'Últimas Partidas',
    loadingDetail: 'Carregando dados da partida…', detailUnavailable: 'Detalhes da partida indisponíveis.',
    noEvents: 'Nenhum evento ainda.', noStats: 'Estatísticas ainda não disponíveis.', noLineups: 'Escalações ainda não disponíveis.',
    subs: 'Reservas',
    statPossession: 'Posse de Bola %', statShots: 'Chutes Totais', statShotsOnTarget: 'Chutes no Alvo',
    statCorners: 'Escanteios', statFouls: 'Faltas', statOffsides: 'Impedimentos', statSaves: 'Defesas',
    h2hTitle: 'Confronto Direto', noH2H: 'Nenhum confronto anterior encontrado', formTitle: 'Últimos 5 Jogos', watching: 'Onde assistir',
  },
  bracket: {
    groupPrefix: 'Grupo',
    groupRank1: '1º',
    groupRank2: '2º',
    bestThird: 'Melhor 3º Lugar',
    winner: 'Vencedor',
    runnerUp: 'Vice',
  },
  group: { top2: 'Top 2 avançam' },
  footer: {
    project: 'Um projeto MitsuMira · Impressão 3D & robótica',
    dataVia: 'Dados via ESPN',
    privacy: 'Privacidade',
    github: 'GitHub',
    alsoBy: 'Também da MitsuMira:',
  },
  loading: { matches: 'Carregando partidas…', schedule: 'Carregando calendário…', standings: 'Carregando classificação…', teams: 'Carregando seleções…', generic: 'Carregando…' },
  errors: {
    games: 'Falha ao carregar partidas. Verifique suas credenciais de API.',
    schedule: 'Falha ao carregar calendário.', standings: 'Falha ao carregar classificação.',
    teams: 'Falha ao carregar seleções.', predictions: 'Falha ao carregar partidas.',
  },
}

export const es: Translations = {
  nav: { home: 'Inicio', schedule: 'Calendario', standings: 'Clasificación', playoffs: 'Playoffs', teams: 'Selecciones', players: 'Jugadores', predictions: 'Predicciones' },
  countdown: { label: 'Cuenta regresiva', days: 'Días', hours: 'Horas', min: 'Min', sec: 'Seg' },
  ceremony: {
    title: '🎭 Ceremonia de Inauguración',
    subtitle: 'En los tres países anfitriones',
    countdownLabel: 'La ceremonia comienza en',
    mexico: 'Ciudad de México · Estadio Azteca',
    canada: 'Toronto · BMO Field',
    usa: 'Los Ángeles · SoFi Stadium',
  },
  home: {
    liveNow: '🔴 En Vivo', today: '📅 Hoy', upNext: '⏭ Próximos',
    firstMatches: '🗓 Próximos Partidos', recentResults: '📊 Resultados Recientes',
    groupStandings: '🏆 Clasificación de Grupos', viewAllGroups: 'Ver los 12 grupos →',
    upcoming48h: '🗓 Próximas 48 Horas', noUpcoming48h: 'No hay partidos en las próximas 48 horas.',
    tournamentName: 'Copa Mundial de la FIFA 2026',
    tournamentDates: '11 Jun – 19 Jul, 2026',
    tournamentHosts: 'Estados Unidos, Canadá y México',
  },
  schedule: {
    title: 'Calendario', subtitle: 'Los 104 partidos · 11 Jun – 19 Jul, 2026',
    all: 'Todos', live: 'En Vivo', today: 'Hoy', upcoming: 'Próximos',
    finished: 'Finalizados', groupStage: 'Fase de Grupos', knockout: 'Eliminatorias',
    allGroups: 'Todos los Grupos', match: 'partido', matches: 'partidos', noMatches: 'No hay partidos para este filtro.',
  },
  standings: {
    title: 'Clasificación', subtitle: '12 grupos · Los 2 primeros de cada grupo avanzan',
    team: 'Selección', top2: 'Top 2 avanzan', noData: 'Sin datos de clasificación aún.',
    qualTitle: 'Cómo funciona la clasificación',
    qualRules: [
      '48 selecciones, 12 grupos de 4. Los 2 primeros avanzan; los 8 mejores terceros también (32 en total).',
      'Paso 1 — minitabla entre los equipos empatados: puntos → diferencia de goles → goles marcados.',
      'Paso 2 (aún empatados) — general: diferencia de goles → goles marcados → fair play (tarjetas).',
      'Paso 3 (aún empatados) — Ranking FIFA.',
      'Mejores terceros: puntos → diferencia de goles → goles marcados → fair play → Ranking FIFA.',
    ],
    bestThirds: 'Mejores Terceros',
    bestThirdsDesc: 'Los 8 mejores de 12 grupos avanzan a los 32avos · ordenados por Pts → GD → GF → Tarjetas → Ranking FIFA',
    qualifiedEliminated: 'Clasificados ↑ · Eliminados ↓',
    bestThirdsNote: 'La clasificación final de los mejores terceros se definirá al término de todos los partidos de la fase de grupos.',
    liveNote: 'Clasificación simulada con el marcador actual de los partidos en vivo. Puede cambiar en cualquier momento.',
  },
  playoffs: {
    title: 'Playoffs', subtitle: 'Fase eliminatoria · De los 32avos a la Final',
    bracket: 'Cuadro', r32: '32vos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semi', third: '3er', final: 'Final',
    tbd: 'Por definir', noGames: 'Aún no hay partidos para esta ronda.',
  },
  settings: {
    title: 'Configuración', language: 'Idioma', timezone: 'Zona horaria',
    timezoneHint: 'Los horarios de los partidos se convierten a la zona horaria seleccionada.',
    close: 'Cerrar',
    theme: 'Tema', themeLight: '☀️ Claro', themeDark: '🌙 Oscuro',
  },
  teams: { title: 'Selecciones', subtitle: '48 naciones compitiendo por el Mundial', search: 'Buscar selecciones…', all: 'Todas', noTeams: 'No se encontraron selecciones.', qualified: 'Clasificado', eliminated: 'Eliminado', knockoutPhase: 'Fase Eliminatoria', eliminatedGroupStage: 'Eliminados en Fase de Grupos', teamsCount: 'selecciones', phaseFinal: 'Final', phaseThird: '3er Lugar', phaseSF: 'Semifinales', phaseQF: 'Cuartos de Final', phaseR16: 'Octavos de Final', phaseR32: 'Ronda de 32', phaseGroupStage: 'Fase de Grupos' },
  players: { title: 'Jugadores', subtitle: 'Estadísticas del torneo · Todos con minutos jugados', search: 'Buscar jugadores…', allPos: 'Todos', noPlayers: 'No se encontraron jugadores.' },
  favorites: {
    myTeams: '⭐ Mis Equipos', noFavorites: 'Aún no tienes equipos favoritos.',
    addFavorites: 'Toca ⭐ en cualquier selección para seguirla aquí.',
    nextMatch: 'Próx.', lastMatch: 'Últ.', groupPos: 'Grupo',
    addToFav: 'Agregar a favoritos', removeFromFav: 'Quitar de favoritos',
  },
  teamDetail: {
    backToTeams: '← Selecciones', allMatches: 'Todos los Partidos', groupStanding: 'Clasificación del Grupo',
    stats: 'Estadísticas', played: 'PJ', won: 'G', drawn: 'E', lost: 'P',
    noMatches: 'Sin partidos aún.', upcomingMatches: 'Próximos', pastMatches: 'Resultados', scorers: 'Goleadores',
    squad: 'Plantilla', headCoach: 'Entrenador',
    posGK: 'Porteros', posDF: 'Defensores', posMF: 'Centrocampistas', posFW: 'Delanteros',
    ageUnit: 'años', intlCaps: 'caps internacionales', appsShort: 'pj',
    yellowCards: 'tarjetas amarillas', redCards: 'tarjetas rojas',
    notFound: 'Selección no encontrada.', eliminated: 'Eliminado', tournamentPath: 'Camino en el Torneo', possible: 'posibles',
  },
  predictions: {
    title: 'Predicciones', subtitle: 'Predice los marcadores · Guardado localmente en tu navegador',
    points: 'Puntos', exactScores: 'Resultado Exacto', pending: 'Pendiente',
    predictTab: 'Predecir', resultsTab: 'Resultados', save: 'Guardar', clear: 'Eliminar predicción',
    noUpcoming: 'No hay partidos próximos para predecir.',
    noResults: '¡Sin predicciones aún. Comienza a predecir los próximos partidos!',
    waitingResults: 'Esperando que terminen tus partidos predichos.',
    scoringTitle: 'Puntuación', scoringText: 'Fase de grupos: resultado exacto 3 pts · ganador/empate correcto 1 pt. Eliminatorias: misma regla en la etapa que decide el partido (tiempo reglamentario, prórroga o penales) — los partidos decididos en penales puntúan por etapas (marcador de la prórroga + tanda), hasta 3 pts en total.',
    resultCorrect: '✓ ¡Resultado exacto! +3', resultWinner: '~ Ganador correcto +1', resultDraw: '~ Empate correcto +1',
    resultWrong: '✗ Incorrecto', resultPending: 'Pendiente', actual: 'Real', yourPick: 'Tu pronóstico', locked: '🔒 Bloqueado', locksIn: 'Se bloquea en',
    ofMax: 'de {n} máx.', groups: 'Grupos', cancel: 'Cancelar',
  },
  match: {
    live: 'EN VIVO', vs: 'vs', predict: '✦ Hacer predicción →',
    stageGroup: 'Grupo', stageR32: 'Dieciseisavos', stageR16: 'Octavos de Final',
    stageQF: 'Cuartos de Final', stageSF: 'Semifinal', stageThird: 'Tercer Puesto', stageFinal: 'Final',
    myPick: 'Mi pronóstico', editPick: 'Editar',
    aet: 'Prórr.', penalties: 'Pen.', aetHint: "total tras 120' · mín.",
  },
  matchDetail: {
    back: '← Volver', notFound: 'Partido no encontrado.', homeLink: '← Inicio', ft: 'FT', ht: 'HT',
    tabTimeline: 'Cronología', tabFeed: 'En Vivo', tabStats: 'Estadísticas', tabLineups: 'Alineaciones', tabH2H: 'Últimos Partidos',
    loadingDetail: 'Cargando datos del partido…', detailUnavailable: 'Detalles del partido no disponibles.',
    noEvents: 'Sin eventos aún.', noStats: 'Estadísticas aún no disponibles.', noLineups: 'Alineaciones aún no disponibles.',
    subs: 'Suplentes',
    statPossession: 'Posesión %', statShots: 'Tiros Totales', statShotsOnTarget: 'Tiros a Puerta',
    statCorners: 'Córneres', statFouls: 'Faltas', statOffsides: 'Fueras de Juego', statSaves: 'Paradas',
    h2hTitle: 'Historial', noH2H: 'Sin encuentros anteriores', formTitle: 'Últimos 5 Partidos', watching: 'Dónde ver',
  },
  bracket: {
    groupPrefix: 'Grupo',
    groupRank1: '1°',
    groupRank2: '2°',
    bestThird: 'Mejor 3er Lugar',
    winner: 'Ganador',
    runnerUp: 'Finalista',
  },
  group: { top2: 'Top 2 avanzan' },
  footer: {
    project: 'Un proyecto MitsuMira · Impresión 3D & robótica',
    dataVia: 'Datos via ESPN',
    privacy: 'Privacidad',
    github: 'GitHub',
    alsoBy: 'También de MitsuMira:',
  },
  loading: { matches: 'Cargando partidos…', schedule: 'Cargando calendario…', standings: 'Cargando clasificación…', teams: 'Cargando selecciones…', generic: 'Cargando…' },
  errors: {
    games: 'Error al cargar partidos. Verifica tus credenciales de API.',
    schedule: 'Error al cargar el calendario.', standings: 'Error al cargar la clasificación.',
    teams: 'Error al cargar selecciones.', predictions: 'Error al cargar partidos.',
  },
}

export const translations: Record<Lang, Translations> = { en, pt, es }

export function localStageLabel(type: string, group: string, t: Translations): string {
  if (type === 'group') return `${t.match.stageGroup} ${group}`
  const map: Record<string, keyof Translations['match']> = {
    r32: 'stageR32', r16: 'stageR16', qf: 'stageQF',
    sf: 'stageSF', third: 'stageThird', final: 'stageFinal',
  }
  const key = map[type]
  return key ? (t.match[key] as string) : type.toUpperCase()
}
