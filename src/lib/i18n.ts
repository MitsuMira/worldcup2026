export type Lang = 'en' | 'pt' | 'es'

export interface Translations {
  nav: { home: string; schedule: string; standings: string; playoffs: string; teams: string; predictions: string }
  countdown: { label: string; days: string; hours: string; min: string; sec: string }
  home: {
    liveNow: string; today: string; upNext: string; firstMatches: string
    recentResults: string; groupStandings: string; viewAllGroups: string
    upcoming48h: string; noUpcoming48h: string
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
  }
  playoffs: {
    title: string; subtitle: string
    bracket: string; r32: string; r16: string; qf: string; sf: string; third: string; final: string
    tbd: string; noGames: string
  }
  settings: {
    title: string; language: string; timezone: string; timezoneHint: string; close: string
  }
  teams: { title: string; subtitle: string; search: string; all: string; noTeams: string }
  favorites: {
    myTeams: string; noFavorites: string; addFavorites: string
    nextMatch: string; lastMatch: string; groupPos: string
    addToFav: string; removeFromFav: string
  }
  teamDetail: {
    backToTeams: string; allMatches: string; groupStanding: string
    stats: string; played: string; won: string; drawn: string; lost: string
    noMatches: string; upcomingMatches: string; pastMatches: string
  }
  predictions: {
    title: string; subtitle: string; points: string; exactScores: string; pending: string
    predictTab: string; resultsTab: string; save: string; clear: string
    noUpcoming: string; noResults: string; waitingResults: string
    scoringTitle: string; scoringText: string
    resultCorrect: string; resultWinner: string; resultWrong: string; resultPending: string
    actual: string; yourPick: string
  }
  match: {
    live: string; vs: string; predict: string
    stageGroup: string; stageR32: string; stageR16: string
    stageQF: string; stageSF: string; stageThird: string; stageFinal: string
  }
  group: { top2: string }
  footer: { dataVia: string; madeWith: string; madeByName: string; madeByUrl: string }
  loading: { matches: string; schedule: string; standings: string; teams: string; generic: string }
  errors: { games: string; schedule: string; standings: string; teams: string; predictions: string }
}

export const en: Translations = {
  nav: { home: 'Home', schedule: 'Schedule', standings: 'Standings', playoffs: 'Playoffs', teams: 'Teams', predictions: 'Predictions' },
  countdown: { label: 'Kickoff countdown', days: 'Days', hours: 'Hours', min: 'Min', sec: 'Sec' },
  home: {
    liveNow: '🔴 Live Now', today: '📅 Today', upNext: '⏭ Up Next',
    firstMatches: '🗓 First Matches', recentResults: '📊 Recent Results',
    groupStandings: '🏆 Group Standings', viewAllGroups: 'View all 12 groups →',
    upcoming48h: '🗓 Next 48 Hours', noUpcoming48h: 'No matches in the next 48 hours.',
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
      '48 teams in 12 groups of 4',
      'Top 2 from each group advance to the Round of 32',
      '8 best third-place teams also advance (total: 32 teams)',
      'Tiebreaker: Points → Goal difference → Goals scored → Head-to-head',
    ],
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
  },
  teams: { title: 'Teams', subtitle: '48 nations competing for the World Cup', search: 'Search teams…', all: 'All', noTeams: 'No teams found.' },
  favorites: {
    myTeams: '⭐ My Teams', noFavorites: 'No favorite teams yet.',
    addFavorites: 'Tap the ⭐ on any team to track them here.',
    nextMatch: 'Next', lastMatch: 'Last', groupPos: 'Group',
    addToFav: 'Add to favorites', removeFromFav: 'Remove from favorites',
  },
  teamDetail: {
    backToTeams: '← Teams', allMatches: 'All Matches', groupStanding: 'Group Standing',
    stats: 'Stats', played: 'P', won: 'W', drawn: 'D', lost: 'L',
    noMatches: 'No matches yet.', upcomingMatches: 'Upcoming', pastMatches: 'Results',
  },
  predictions: {
    title: 'Predictions', subtitle: 'Predict match scores · Stored locally in your browser',
    points: 'Points', exactScores: 'Exact Scores', pending: 'Pending',
    predictTab: 'Predict', resultsTab: 'Results', save: 'Save', clear: 'Clear prediction',
    noUpcoming: 'No upcoming matches to predict.',
    noResults: 'No predictions yet. Start predicting upcoming matches!',
    waitingResults: 'Waiting for your predicted matches to finish.',
    scoringTitle: 'Scoring', scoringText: 'Exact score: 3 pts · Correct winner/draw: 1 pt · Wrong: 0 pts',
    resultCorrect: '✓ Exact score! +3', resultWinner: '~ Correct winner +1',
    resultWrong: '✗ Wrong', resultPending: 'Pending', actual: 'Actual', yourPick: 'Your pick',
  },
  match: {
    live: 'LIVE', vs: 'vs', predict: '✦ Make a prediction →',
    stageGroup: 'Group', stageR32: 'Round of 32', stageR16: 'Round of 16',
    stageQF: 'Quarter-final', stageSF: 'Semi-final', stageThird: '3rd Place', stageFinal: 'Final',
  },
  group: { top2: 'Top 2 advance' },
  footer: { dataVia: 'Data via', madeWith: 'Made with ❤️ by', madeByName: 'MitsuMira', madeByUrl: 'https://mitsumira.com' },
  loading: { matches: 'Loading matches…', schedule: 'Loading schedule…', standings: 'Loading standings…', teams: 'Loading teams…', generic: 'Loading…' },
  errors: {
    games: 'Failed to load matches. Check your API credentials.',
    schedule: 'Failed to load schedule.', standings: 'Failed to load standings.',
    teams: 'Failed to load teams.', predictions: 'Failed to load games.',
  },
}

export const pt: Translations = {
  nav: { home: 'Início', schedule: 'Calendário', standings: 'Classificação', playoffs: 'Playoffs', teams: 'Seleções', predictions: 'Previsões' },
  countdown: { label: 'Contagem regressiva', days: 'Dias', hours: 'Horas', min: 'Min', sec: 'Seg' },
  home: {
    liveNow: '🔴 Ao Vivo', today: '📅 Hoje', upNext: '⏭ A Seguir',
    firstMatches: '🗓 Primeiras Partidas', recentResults: '📊 Resultados Recentes',
    groupStandings: '🏆 Classificação dos Grupos', viewAllGroups: 'Ver todos os 12 grupos →',
    upcoming48h: '🗓 Próximas 48 Horas', noUpcoming48h: 'Nenhuma partida nas próximas 48 horas.',
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
      '48 seleções em 12 grupos de 4',
      'Os 2 primeiros de cada grupo avançam para as oitavas',
      'Os 8 melhores terceiros colocados também avançam (total: 32 seleções)',
      'Desempate: Pontos → Saldo de gols → Gols marcados → Confronto direto',
    ],
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
  },
  teams: { title: 'Seleções', subtitle: '48 nações disputando a Copa do Mundo', search: 'Buscar seleções…', all: 'Todas', noTeams: 'Nenhuma seleção encontrada.' },
  favorites: {
    myTeams: '⭐ Meus Times', noFavorites: 'Nenhum time favorito ainda.',
    addFavorites: 'Toque em ⭐ em qualquer seleção para acompanhá-la aqui.',
    nextMatch: 'Próx.', lastMatch: 'Últ.', groupPos: 'Grupo',
    addToFav: 'Adicionar aos favoritos', removeFromFav: 'Remover dos favoritos',
  },
  teamDetail: {
    backToTeams: '← Seleções', allMatches: 'Todas as Partidas', groupStanding: 'Classificação do Grupo',
    stats: 'Estatísticas', played: 'J', won: 'V', drawn: 'E', lost: 'D',
    noMatches: 'Nenhuma partida ainda.', upcomingMatches: 'Próximas', pastMatches: 'Resultados',
  },
  predictions: {
    title: 'Previsões', subtitle: 'Preveja os placares · Salvo localmente no seu navegador',
    points: 'Pontos', exactScores: 'Placar Exato', pending: 'Pendente',
    predictTab: 'Prever', resultsTab: 'Resultados', save: 'Salvar', clear: 'Limpar previsão',
    noUpcoming: 'Nenhuma partida futura para prever.',
    noResults: 'Nenhuma previsão feita ainda. Comece a prever as próximas partidas!',
    waitingResults: 'Aguardando o término das partidas previstas.',
    scoringTitle: 'Pontuação', scoringText: 'Placar exato: 3 pts · Vencedor correto/empate: 1 pt · Errado: 0 pts',
    resultCorrect: '✓ Placar exato! +3', resultWinner: '~ Vencedor correto +1',
    resultWrong: '✗ Errado', resultPending: 'Pendente', actual: 'Real', yourPick: 'Seu palpite',
  },
  match: {
    live: 'AO VIVO', vs: 'vs', predict: '✦ Fazer previsão →',
    stageGroup: 'Grupo', stageR32: 'Fase de 32', stageR16: 'Oitavas de Final',
    stageQF: 'Quartas de Final', stageSF: 'Semifinal', stageThird: 'Disputa do 3º Lugar', stageFinal: 'Final',
  },
  group: { top2: 'Top 2 avançam' },
  footer: { dataVia: 'Dados via', madeWith: 'Feito com ❤️ por', madeByName: 'MitsuMira', madeByUrl: 'https://mitsumira.com' },
  loading: { matches: 'Carregando partidas…', schedule: 'Carregando calendário…', standings: 'Carregando classificação…', teams: 'Carregando seleções…', generic: 'Carregando…' },
  errors: {
    games: 'Falha ao carregar partidas. Verifique suas credenciais de API.',
    schedule: 'Falha ao carregar calendário.', standings: 'Falha ao carregar classificação.',
    teams: 'Falha ao carregar seleções.', predictions: 'Falha ao carregar partidas.',
  },
}

export const es: Translations = {
  nav: { home: 'Inicio', schedule: 'Calendario', standings: 'Clasificación', playoffs: 'Playoffs', teams: 'Selecciones', predictions: 'Predicciones' },
  countdown: { label: 'Cuenta regresiva', days: 'Días', hours: 'Horas', min: 'Min', sec: 'Seg' },
  home: {
    liveNow: '🔴 En Vivo', today: '📅 Hoy', upNext: '⏭ Próximos',
    firstMatches: '🗓 Primeros Partidos', recentResults: '📊 Resultados Recientes',
    groupStandings: '🏆 Clasificación de Grupos', viewAllGroups: 'Ver los 12 grupos →',
    upcoming48h: '🗓 Próximas 48 Horas', noUpcoming48h: 'No hay partidos en las próximas 48 horas.',
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
      '48 selecciones en 12 grupos de 4',
      'Los 2 primeros de cada grupo avanzan a los dieciseisavos',
      'Los 8 mejores terceros también avanzan (total: 32 selecciones)',
      'Desempate: Puntos → Diferencia de goles → Goles marcados → Enfrentamiento directo',
    ],
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
  },
  teams: { title: 'Selecciones', subtitle: '48 naciones compitiendo por el Mundial', search: 'Buscar selecciones…', all: 'Todas', noTeams: 'No se encontraron selecciones.' },
  favorites: {
    myTeams: '⭐ Mis Equipos', noFavorites: 'Aún no tienes equipos favoritos.',
    addFavorites: 'Toca ⭐ en cualquier selección para seguirla aquí.',
    nextMatch: 'Próx.', lastMatch: 'Últ.', groupPos: 'Grupo',
    addToFav: 'Agregar a favoritos', removeFromFav: 'Quitar de favoritos',
  },
  teamDetail: {
    backToTeams: '← Selecciones', allMatches: 'Todos los Partidos', groupStanding: 'Clasificación del Grupo',
    stats: 'Estadísticas', played: 'PJ', won: 'G', drawn: 'E', lost: 'P',
    noMatches: 'Sin partidos aún.', upcomingMatches: 'Próximos', pastMatches: 'Resultados',
  },
  predictions: {
    title: 'Predicciones', subtitle: 'Predice los marcadores · Guardado localmente en tu navegador',
    points: 'Puntos', exactScores: 'Resultado Exacto', pending: 'Pendiente',
    predictTab: 'Predecir', resultsTab: 'Resultados', save: 'Guardar', clear: 'Eliminar predicción',
    noUpcoming: 'No hay partidos próximos para predecir.',
    noResults: '¡Sin predicciones aún. Comienza a predecir los próximos partidos!',
    waitingResults: 'Esperando que terminen tus partidos predichos.',
    scoringTitle: 'Puntuación', scoringText: 'Resultado exacto: 3 pts · Ganador correcto/empate: 1 pt · Incorrecto: 0 pts',
    resultCorrect: '✓ ¡Resultado exacto! +3', resultWinner: '~ Ganador correcto +1',
    resultWrong: '✗ Incorrecto', resultPending: 'Pendiente', actual: 'Real', yourPick: 'Tu pronóstico',
  },
  match: {
    live: 'EN VIVO', vs: 'vs', predict: '✦ Hacer predicción →',
    stageGroup: 'Grupo', stageR32: 'Dieciseisavos', stageR16: 'Octavos de Final',
    stageQF: 'Cuartos de Final', stageSF: 'Semifinal', stageThird: 'Tercer Puesto', stageFinal: 'Final',
  },
  group: { top2: 'Top 2 avanzan' },
  footer: { dataVia: 'Datos via', madeWith: 'Hecho con ❤️ por', madeByName: 'MitsuMira', madeByUrl: 'https://mitsumira.com' },
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
