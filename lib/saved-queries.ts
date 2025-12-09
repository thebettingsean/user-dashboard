/**
 * Helper functions for serializing and deserializing sports engine query state
 */

export interface SavedQueryConfig {
  // Query type
  queryType: 'prop' | 'team' | 'referee' | 'trend'
  
  // Bet type and side
  betType?: string
  side?: string
  
  // Time period
  timePeriod: string
  
  // Basic filters
  location?: string
  division?: string
  conference?: string
  playoff?: string
  favorite?: string
  homeFavDog?: string
  
  // Subject team's own rankings
  ownDefenseRank?: string
  ownDefenseStat?: string
  ownOffenseRank?: string
  ownOffenseStat?: string
  
  // Opponent rankings
  defenseRank?: string
  defenseStat?: string
  offenseRank?: string
  offenseStat?: string
  
  // Position-specific stat filters
  defenseStatPosition?: string
  offenseStatPosition?: string
  ownDefenseStatPosition?: string
  ownOffenseStatPosition?: string
  
  // Win percentage filters
  teamWinPctMin?: string
  teamWinPctMax?: string
  oppWinPctMin?: string
  oppWinPctMax?: string
  
  // Ranges
  spreadMin?: string
  spreadMax?: string
  totalMin?: string
  totalMax?: string
  mlMin?: string
  mlMax?: string
  
  // Line movement
  spreadMoveMin?: string
  spreadMoveMax?: string
  totalMoveMin?: string
  totalMoveMax?: string
  mlMoveMin?: string
  mlMoveMax?: string
  
  // O/U specific
  homeTeamDefenseRank?: string
  homeTeamDefenseStat?: string
  homeTeamOffenseRank?: string
  homeTeamOffenseStat?: string
  awayTeamDefenseRank?: string
  awayTeamDefenseStat?: string
  awayTeamOffenseRank?: string
  awayTeamOffenseStat?: string
  
  // Momentum
  streak?: string
  prevGameMarginMin?: string
  prevGameMarginMax?: string
  awayStreak?: string
  awayPrevGameMarginMin?: string
  awayPrevGameMarginMax?: string
  
  // Type-specific
  // Team query
  teamId?: number
  teamLocation?: 'any' | 'home' | 'away'
  versusTeamId?: number
  versusTeamName?: string
  versusTeamAbbr?: string
  
  // Referee query
  refereeId?: string
  refereeName?: string
  
  // Prop query
  playerId?: number
  playerName?: string
  playerPosition?: string
  propPosition?: string
  propStat?: string
  propLine?: string
  propLineMode?: 'book' | 'and' | 'any'
  bookLineMin?: string
  bookLineMax?: string
  propVersusTeamId?: number
  propVersusTeamName?: string
  propVersusTeamAbbr?: string
  minTargets?: string
  minCarries?: string
  minPassAttempts?: string
}

/**
 * Serialize current query state into a SavedQueryConfig
 */
export function serializeQueryState(state: any): SavedQueryConfig {
  const config: SavedQueryConfig = {
    queryType: state.queryType,
    timePeriod: state.timePeriod || 'since_2022',
  }

  // Bet type and side
  if (state.betType) config.betType = state.betType
  if (state.side) config.side = state.side

  // Basic filters
  if (state.location && state.location !== 'any') config.location = state.location
  if (state.division && state.division !== 'any') config.division = state.division
  if (state.conference && state.conference !== 'any') config.conference = state.conference
  if (state.playoff && state.playoff !== 'any') config.playoff = state.playoff
  if (state.favorite && state.favorite !== 'any') config.favorite = state.favorite
  if (state.homeFavDog && state.homeFavDog !== 'any') config.homeFavDog = state.homeFavDog

  // Subject team's own rankings
  if (state.ownDefenseRank && state.ownDefenseRank !== 'any') {
    config.ownDefenseRank = state.ownDefenseRank
    if (state.ownDefenseStat) config.ownDefenseStat = state.ownDefenseStat
    if (state.ownDefenseStatPosition) config.ownDefenseStatPosition = state.ownDefenseStatPosition
  }
  if (state.ownOffenseRank && state.ownOffenseRank !== 'any') {
    config.ownOffenseRank = state.ownOffenseRank
    if (state.ownOffenseStat) config.ownOffenseStat = state.ownOffenseStat
    if (state.ownOffenseStatPosition) config.ownOffenseStatPosition = state.ownOffenseStatPosition
  }

  // Opponent rankings
  if (state.defenseRank && state.defenseRank !== 'any') {
    config.defenseRank = state.defenseRank
    if (state.defenseStat) config.defenseStat = state.defenseStat
    if (state.defenseStatPosition) config.defenseStatPosition = state.defenseStatPosition
  }
  if (state.offenseRank && state.offenseRank !== 'any') {
    config.offenseRank = state.offenseRank
    if (state.offenseStat) config.offenseStat = state.offenseStat
    if (state.offenseStatPosition) config.offenseStatPosition = state.offenseStatPosition
  }

  // Win percentages
  if (state.teamWinPctMin) config.teamWinPctMin = state.teamWinPctMin
  if (state.teamWinPctMax) config.teamWinPctMax = state.teamWinPctMax
  if (state.oppWinPctMin) config.oppWinPctMin = state.oppWinPctMin
  if (state.oppWinPctMax) config.oppWinPctMax = state.oppWinPctMax

  // Ranges
  if (state.spreadMin) config.spreadMin = state.spreadMin
  if (state.spreadMax) config.spreadMax = state.spreadMax
  if (state.totalMin) config.totalMin = state.totalMin
  if (state.totalMax) config.totalMax = state.totalMax
  if (state.mlMin) config.mlMin = state.mlMin
  if (state.mlMax) config.mlMax = state.mlMax

  // Line movement
  if (state.spreadMoveMin) config.spreadMoveMin = state.spreadMoveMin
  if (state.spreadMoveMax) config.spreadMoveMax = state.spreadMoveMax
  if (state.totalMoveMin) config.totalMoveMin = state.totalMoveMin
  if (state.totalMoveMax) config.totalMoveMax = state.totalMoveMax
  if (state.mlMoveMin) config.mlMoveMin = state.mlMoveMin
  if (state.mlMoveMax) config.mlMoveMax = state.mlMoveMax

  // O/U specific
  if (state.homeTeamDefenseRank && state.homeTeamDefenseRank !== 'any') {
    config.homeTeamDefenseRank = state.homeTeamDefenseRank
    if (state.homeTeamDefenseStat) config.homeTeamDefenseStat = state.homeTeamDefenseStat
  }
  if (state.homeTeamOffenseRank && state.homeTeamOffenseRank !== 'any') {
    config.homeTeamOffenseRank = state.homeTeamOffenseRank
    if (state.homeTeamOffenseStat) config.homeTeamOffenseStat = state.homeTeamOffenseStat
  }
  if (state.awayTeamDefenseRank && state.awayTeamDefenseRank !== 'any') {
    config.awayTeamDefenseRank = state.awayTeamDefenseRank
    if (state.awayTeamDefenseStat) config.awayTeamDefenseStat = state.awayTeamDefenseStat
  }
  if (state.awayTeamOffenseRank && state.awayTeamOffenseRank !== 'any') {
    config.awayTeamOffenseRank = state.awayTeamOffenseRank
    if (state.awayTeamOffenseStat) config.awayTeamOffenseStat = state.awayTeamOffenseStat
  }

  // Momentum
  if (state.streak) config.streak = state.streak
  if (state.prevGameMarginMin) config.prevGameMarginMin = state.prevGameMarginMin
  if (state.prevGameMarginMax) config.prevGameMarginMax = state.prevGameMarginMax
  if (state.awayStreak) config.awayStreak = state.awayStreak
  if (state.awayPrevGameMarginMin) config.awayPrevGameMarginMin = state.awayPrevGameMarginMin
  if (state.awayPrevGameMarginMax) config.awayPrevGameMarginMax = state.awayPrevGameMarginMax

  // Type-specific
  if (state.queryType === 'team') {
    if (state.teamId) config.teamId = state.teamId
    if (state.teamLocation) config.teamLocation = state.teamLocation
    if (state.selectedVersusTeam) {
      config.versusTeamId = state.selectedVersusTeam.id
      config.versusTeamName = state.selectedVersusTeam.name
      config.versusTeamAbbr = state.selectedVersusTeam.abbr
    }
  }

  if (state.queryType === 'referee') {
    if (state.refereeId) config.refereeId = state.refereeId
    if (state.selectedReferee) {
      config.refereeName = state.selectedReferee.referee_name
    }
  }

  if (state.queryType === 'prop') {
    if (state.selectedPlayer) {
      config.playerId = state.selectedPlayer.espn_player_id
      config.playerName = state.selectedPlayer.name
      config.playerPosition = state.selectedPlayer.position
    }
    if (state.propPosition && state.propPosition !== 'any') {
      config.propPosition = state.propPosition
    }
    if (state.propStat) config.propStat = state.propStat
    if (state.propLine) config.propLine = state.propLine
    if (state.propLineMode) config.propLineMode = state.propLineMode
    if (state.bookLineMin) config.bookLineMin = state.bookLineMin
    if (state.bookLineMax) config.bookLineMax = state.bookLineMax
    if (state.selectedPropVersusTeam) {
      config.propVersusTeamId = state.selectedPropVersusTeam.id
      config.propVersusTeamName = state.selectedPropVersusTeam.name
      config.propVersusTeamAbbr = state.selectedPropVersusTeam.abbr
    }
    if (state.minTargets) config.minTargets = state.minTargets
    if (state.minCarries) config.minCarries = state.minCarries
    if (state.minPassAttempts) config.minPassAttempts = state.minPassAttempts
  }

  return config
}

/**
 * Deserialize SavedQueryConfig back into state setters
 * Returns an object with all the state values that need to be set
 */
export function deserializeQueryConfig(config: SavedQueryConfig): any {
  const state: any = {}

  // Query type
  if (config.queryType) state.queryType = config.queryType

  // Bet type and side
  if (config.betType) state.betType = config.betType
  if (config.side) state.side = config.side

  // Time period
  if (config.timePeriod) state.timePeriod = config.timePeriod

  // Basic filters
  if (config.location) state.location = config.location
  if (config.division) state.division = config.division
  if (config.conference) state.conference = config.conference
  if (config.playoff) state.playoff = config.playoff
  if (config.favorite) state.favorite = config.favorite
  if (config.homeFavDog) state.homeFavDog = config.homeFavDog

  // Subject team's own rankings
  if (config.ownDefenseRank) {
    state.ownDefenseRank = config.ownDefenseRank
    if (config.ownDefenseStat) state.ownDefenseStat = config.ownDefenseStat
    if (config.ownDefenseStatPosition) state.ownDefenseStatPosition = config.ownDefenseStatPosition
  }
  if (config.ownOffenseRank) {
    state.ownOffenseRank = config.ownOffenseRank
    if (config.ownOffenseStat) state.ownOffenseStat = config.ownOffenseStat
    if (config.ownOffenseStatPosition) state.ownOffenseStatPosition = config.ownOffenseStatPosition
  }

  // Opponent rankings
  if (config.defenseRank) {
    state.defenseRank = config.defenseRank
    if (config.defenseStat) state.defenseStat = config.defenseStat
    if (config.defenseStatPosition) state.defenseStatPosition = config.defenseStatPosition
  }
  if (config.offenseRank) {
    state.offenseRank = config.offenseRank
    if (config.offenseStat) state.offenseStat = config.offenseStat
    if (config.offenseStatPosition) state.offenseStatPosition = config.offenseStatPosition
  }

  // Win percentages
  if (config.teamWinPctMin) state.teamWinPctMin = config.teamWinPctMin
  if (config.teamWinPctMax) state.teamWinPctMax = config.teamWinPctMax
  if (config.oppWinPctMin) state.oppWinPctMin = config.oppWinPctMin
  if (config.oppWinPctMax) state.oppWinPctMax = config.oppWinPctMax

  // Ranges
  if (config.spreadMin) state.spreadMin = config.spreadMin
  if (config.spreadMax) state.spreadMax = config.spreadMax
  if (config.totalMin) state.totalMin = config.totalMin
  if (config.totalMax) state.totalMax = config.totalMax
  if (config.mlMin) state.mlMin = config.mlMin
  if (config.mlMax) state.mlMax = config.mlMax

  // Line movement
  if (config.spreadMoveMin) state.spreadMoveMin = config.spreadMoveMin
  if (config.spreadMoveMax) state.spreadMoveMax = config.spreadMoveMax
  if (config.totalMoveMin) state.totalMoveMin = config.totalMoveMin
  if (config.totalMoveMax) state.totalMoveMax = config.totalMoveMax
  if (config.mlMoveMin) state.mlMoveMin = config.mlMoveMin
  if (config.mlMoveMax) state.mlMoveMax = config.mlMoveMax

  // O/U specific
  if (config.homeTeamDefenseRank) {
    state.homeTeamDefenseRank = config.homeTeamDefenseRank
    if (config.homeTeamDefenseStat) state.homeTeamDefenseStat = config.homeTeamDefenseStat
  }
  if (config.homeTeamOffenseRank) {
    state.homeTeamOffenseRank = config.homeTeamOffenseRank
    if (config.homeTeamOffenseStat) state.homeTeamOffenseStat = config.homeTeamOffenseStat
  }
  if (config.awayTeamDefenseRank) {
    state.awayTeamDefenseRank = config.awayTeamDefenseRank
    if (config.awayTeamDefenseStat) state.awayTeamDefenseStat = config.awayTeamDefenseStat
  }
  if (config.awayTeamOffenseRank) {
    state.awayTeamOffenseRank = config.awayTeamOffenseRank
    if (config.awayTeamOffenseStat) state.awayTeamOffenseStat = config.awayTeamOffenseStat
  }

  // Momentum
  if (config.streak) state.streak = config.streak
  if (config.prevGameMarginMin) state.prevGameMarginMin = config.prevGameMarginMin
  if (config.prevGameMarginMax) state.prevGameMarginMax = config.prevGameMarginMax
  if (config.awayStreak) state.awayStreak = config.awayStreak
  if (config.awayPrevGameMarginMin) state.awayPrevGameMarginMin = config.awayPrevGameMarginMin
  if (config.awayPrevGameMarginMax) state.awayPrevGameMarginMax = config.awayPrevGameMarginMax

  // Type-specific
  if (config.queryType === 'team') {
    if (config.teamId) state.teamId = config.teamId
    if (config.teamLocation) state.teamLocation = config.teamLocation
    if (config.versusTeamId) {
      state.selectedVersusTeam = {
        id: config.versusTeamId,
        name: config.versusTeamName || '',
        abbr: config.versusTeamAbbr || ''
      }
    }
  }

  if (config.queryType === 'referee') {
    if (config.refereeId) state.refereeId = config.refereeId
    if (config.refereeName) {
      state.selectedReferee = {
        referee_name: config.refereeName,
        game_count: 0
      }
    }
  }

  if (config.queryType === 'prop') {
    if (config.playerId) {
      state.selectedPlayer = {
        espn_player_id: config.playerId,
        name: config.playerName || '',
        position: config.playerPosition || ''
      }
    }
    if (config.propPosition) state.propPosition = config.propPosition
    if (config.propStat) state.propStat = config.propStat
    if (config.propLine) state.propLine = config.propLine
    if (config.propLineMode) state.propLineMode = config.propLineMode
    if (config.bookLineMin) state.bookLineMin = config.bookLineMin
    if (config.bookLineMax) state.bookLineMax = config.bookLineMax
    if (config.propVersusTeamId) {
      state.selectedPropVersusTeam = {
        id: config.propVersusTeamId,
        name: config.propVersusTeamName || '',
        abbr: config.propVersusTeamAbbr || ''
      }
    }
    if (config.minTargets) state.minTargets = config.minTargets
    if (config.minCarries) state.minCarries = config.minCarries
    if (config.minPassAttempts) state.minPassAttempts = config.minPassAttempts
  }

  return state
}

