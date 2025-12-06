/**
 * Filter Builder
 * Translates QueryFilters into SQL WHERE clauses
 */

import type { 
  QueryFilters, 
  TimePeriod, 
  DefenseRankFilter, 
  OpponentRankFilter,
  HomeFavDogFilter,
  RankStatType 
} from './types'

// ============================================
// TIME PERIOD HANDLING
// ============================================

/**
 * Get the time constraint SQL for a given time period
 * For "Lx" periods, we need to count games, not use dates
 */
export function getTimePeriodSQL(period: TimePeriod, tableAlias: string = 'g'): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  // NFL season typically starts in September
  const currentSeason = currentMonth >= 9 ? currentYear : currentYear - 1
  
  switch (period) {
    case 'season':
      return `${tableAlias}.season = ${currentSeason}`
    case 'last_season':
      return `${tableAlias}.season = ${currentSeason - 1}`
    case 'L2years':
      return `${tableAlias}.season >= ${currentSeason - 1}`
    case 'L3years':
      return `${tableAlias}.season >= ${currentSeason - 2}`
    case 'since_2023':
      return `${tableAlias}.season >= 2023`
    case 'since_2022':
      return `${tableAlias}.season >= 2022`
    // For L3, L5, etc. - we handle this differently (LIMIT in subquery)
    default:
      return '1=1' // No time filter, will use LIMIT
  }
}

/**
 * Get LIMIT value for "Lx" time periods
 */
export function getTimePeriodLimit(period: TimePeriod): number | null {
  const match = period.match(/^L(\d+)$/)
  if (match) {
    return parseInt(match[1])
  }
  return null // No limit, use time-based filter
}

// ============================================
// FILTER BUILDERS
// ============================================

/**
 * Build location filter (home/away)
 */
export function buildLocationFilter(
  location: string | undefined, 
  tableAlias: string,
  isBoxScore: boolean = false
): string | null {
  if (!location || location === 'any') return null
  
  if (isBoxScore) {
    // For box_scores table, use is_home column
    return location === 'home' 
      ? `${tableAlias}.is_home = 1`
      : `${tableAlias}.is_home = 0`
  } else {
    // For games table, we need to determine based on team perspective
    // This is handled differently based on whether we're looking at home or away team
    return null // Handled in specific query builders
  }
}

/**
 * Build division filter
 */
export function buildDivisionFilter(
  division: string | undefined,
  tableAlias: string
): string | null {
  if (!division || division === 'any') return null
  
  return division === 'division'
    ? `${tableAlias}.is_division_game = 1`
    : `${tableAlias}.is_division_game = 0`
}

/**
 * Build conference filter
 */
export function buildConferenceFilter(
  conference: string | undefined,
  tableAlias: string
): string | null {
  if (!conference || conference === 'any') return null
  
  return conference === 'conference'
    ? `${tableAlias}.is_conference_game = 1`
    : `${tableAlias}.is_conference_game = 0`
}

/**
 * Build playoff filter
 */
export function buildPlayoffFilter(
  playoff: string | undefined,
  tableAlias: string
): string | null {
  if (!playoff || playoff === 'any') return null
  
  return playoff === 'playoff'
    ? `${tableAlias}.is_playoff = 1`
    : `${tableAlias}.is_playoff = 0`
}

/**
 * Build favorite/underdog filter
 * For games table: uses spread_close to determine
 * For box_scores: needs to join with games table
 */
export function buildFavoriteFilter(
  favorite: string | undefined,
  tableAlias: string,
  isHomeTeam: boolean = true
): string | null {
  if (!favorite || favorite === 'any') return null
  
  // Negative spread = home favorite, Positive = home underdog
  if (isHomeTeam) {
    return favorite === 'favorite'
      ? `${tableAlias}.spread_close < 0`
      : `${tableAlias}.spread_close > 0`
  } else {
    return favorite === 'favorite'
      ? `${tableAlias}.spread_close > 0`
      : `${tableAlias}.spread_close < 0`
  }
}

/**
 * Build spread range filter (uses CLOSING line)
 * Supports: min only, max only, or both
 * Examples:
 *   { min: 3 } = underdogs +3 or more
 *   { max: -3 } = favorites -3 or more
 *   { min: 3, max: 7 } = underdogs between +3 and +7
 *   { min: -7, max: -3 } = favorites between -3 and -7
 */
export function buildSpreadRangeFilter(
  range: { min?: number; max?: number } | undefined,
  tableAlias: string,
  isHomeTeam: boolean = true
): string | null {
  if (!range) return null
  if (range.min === undefined && range.max === undefined) return null
  
  // For away team perspective, we need to negate the spread values
  // Home spread -3 = Away spread +3
  const adjustedMin = range.min !== undefined 
    ? (isHomeTeam ? range.min : -range.min) 
    : undefined
  const adjustedMax = range.max !== undefined 
    ? (isHomeTeam ? range.max : -range.max) 
    : undefined
  
  // Both min and max provided
  if (adjustedMin !== undefined && adjustedMax !== undefined) {
    const minSpread = Math.min(adjustedMin, adjustedMax)
    const maxSpread = Math.max(adjustedMin, adjustedMax)
    return `${tableAlias}.spread_close BETWEEN ${minSpread} AND ${maxSpread}`
  }
  
  // Only min provided (e.g., +3 means >= +3 for dogs, or -3 means <= -3 for favs)
  if (adjustedMin !== undefined) {
    if (adjustedMin >= 0) {
      // Underdogs: spread >= min (e.g., +3 or more)
      return `${tableAlias}.spread_close >= ${adjustedMin}`
    } else {
      // Favorites: spread <= min (e.g., -3 means -3, -4, -5... more favored)
      return `${tableAlias}.spread_close <= ${adjustedMin}`
    }
  }
  
  // Only max provided
  if (adjustedMax !== undefined) {
    if (adjustedMax >= 0) {
      // Underdogs up to max (e.g., up to +7)
      return `${tableAlias}.spread_close <= ${adjustedMax}`
    } else {
      // Favorites less than max (e.g., less favored than -7)
      return `${tableAlias}.spread_close >= ${adjustedMax}`
    }
  }
  
  return null
}

/**
 * Build total range filter (uses CLOSING line)
 * Supports: min only, max only, or both
 * Examples:
 *   { min: 40 } = totals 40 or higher
 *   { max: 50 } = totals 50 or lower
 *   { min: 40, max: 50 } = totals between 40 and 50
 */
export function buildTotalRangeFilter(
  range: { min?: number; max?: number } | undefined,
  tableAlias: string
): string | null {
  if (!range) return null
  if (range.min === undefined && range.max === undefined) return null
  
  // Both provided
  if (range.min !== undefined && range.max !== undefined) {
    return `${tableAlias}.total_close BETWEEN ${range.min} AND ${range.max}`
  }
  
  // Only min
  if (range.min !== undefined) {
    return `${tableAlias}.total_close >= ${range.min}`
  }
  
  // Only max
  if (range.max !== undefined) {
    return `${tableAlias}.total_close <= ${range.max}`
  }
  
  return null
}

/**
 * Build defense rank filter
 * Uses the opp_def_rank columns in box_scores
 */
export function buildDefenseRankFilter(
  rank: DefenseRankFilter | undefined,
  stat: 'pass' | 'rush' | 'receiving' = 'pass',
  tableAlias: string
): string | null {
  if (!rank || rank === 'any') return null
  
  const column = stat === 'pass' ? 'opp_def_rank_pass_yards'
    : stat === 'rush' ? 'opp_def_rank_rush_yards'
    : 'opp_def_rank_receiving_yards'
  
  switch (rank) {
    case 'top_5':
      return `${tableAlias}.${column} <= 5`
    case 'top_10':
      return `${tableAlias}.${column} <= 10`
    case 'top_15':
      return `${tableAlias}.${column} <= 15`
    case 'bottom_5':
      return `${tableAlias}.${column} >= 28`  // 32 - 5 + 1
    case 'bottom_10':
      return `${tableAlias}.${column} >= 23` // 32 - 10 + 1
    case 'bottom_15':
      return `${tableAlias}.${column} >= 18` // 32 - 15 + 1
    default:
      return null
  }
}

/**
 * Build opponent offense rank filter
 * Uses nfl_team_rankings table for opponent's offensive ranking
 * @param rankingsAlias - alias for opponent's rankings table (e.g., 'opp_rank')
 */
export function buildVsOffenseRankFilter(
  rank: OpponentRankFilter | undefined,
  stat: 'points' | 'total_yards' | 'passing' | 'rushing' | 'overall' = 'overall',
  rankingsAlias: string
): string | null {
  if (!rank || rank === 'any') return null
  
  // Map stat to offensive ranking column
  const column = stat === 'points' ? 'rank_points_per_game'
    : stat === 'passing' ? 'rank_passing_yards_per_game'
    : stat === 'rushing' ? 'rank_rushing_yards_per_game'
    : stat === 'total_yards' ? 'rank_total_yards_per_game'
    : 'rank_total_yards_per_game' // overall defaults to total yards
  
  const fullColumn = `${rankingsAlias}.${column}`
  
  switch (rank) {
    case 'top_5':
      return `${fullColumn} <= 5 AND ${fullColumn} > 0`
    case 'top_10':
      return `${fullColumn} <= 10 AND ${fullColumn} > 0`
    case 'top_15':
      return `${fullColumn} <= 15 AND ${fullColumn} > 0`
    case 'bottom_5':
      return `${fullColumn} >= 28 AND ${fullColumn} <= 32`
    case 'bottom_10':
      return `${fullColumn} >= 23 AND ${fullColumn} <= 32`
    case 'bottom_15':
      return `${fullColumn} >= 18 AND ${fullColumn} <= 32`
    default:
      return null
  }
}

/**
 * Build team result filter (won/lost)
 */
export function buildTeamResultFilter(
  result: string | undefined,
  tableAlias: string,
  isHomeTeam: boolean
): string | null {
  if (!result || result === 'any') return null
  
  if (isHomeTeam) {
    return result === 'won'
      ? `${tableAlias}.home_won = 1`
      : `${tableAlias}.home_won = 0`
  } else {
    return result === 'won'
      ? `${tableAlias}.home_won = 0`
      : `${tableAlias}.home_won = 1`
  }
}

/**
 * Build line movement filter
 */
export function buildLineMovementFilter(
  movement: string | undefined,
  betType: 'spread' | 'total' = 'spread',
  tableAlias: string
): string | null {
  if (!movement || movement === 'any') return null
  
  const column = betType === 'spread' ? 'spread_movement' : 'total_movement'
  
  return movement === 'positive'
    ? `${tableAlias}.${column} > 0`
    : `${tableAlias}.${column} < 0`
}

/**
 * Build spread movement range filter
 * Supports min-only, max-only, or both
 */
export function buildSpreadMovementFilter(
  range: { min?: number; max?: number } | undefined,
  tableAlias: string
): string | null {
  if (!range) return null
  if (range.min !== undefined && range.max !== undefined) {
    return `${tableAlias}.spread_movement BETWEEN ${range.min} AND ${range.max}`
  } else if (range.min !== undefined) {
    return `${tableAlias}.spread_movement >= ${range.min}`
  } else if (range.max !== undefined) {
    return `${tableAlias}.spread_movement <= ${range.max}`
  }
  return null
}

/**
 * Build total movement range filter
 * Supports min-only, max-only, or both
 */
export function buildTotalMovementFilter(
  range: { min?: number; max?: number } | undefined,
  tableAlias: string
): string | null {
  if (!range) return null
  if (range.min !== undefined && range.max !== undefined) {
    return `${tableAlias}.total_movement BETWEEN ${range.min} AND ${range.max}`
  } else if (range.min !== undefined) {
    return `${tableAlias}.total_movement >= ${range.min}`
  } else if (range.max !== undefined) {
    return `${tableAlias}.total_movement <= ${range.max}`
  }
  return null
}

/**
 * Build ML movement range filter
 * Supports min-only, max-only, or both
 */
export function buildMLMovementFilter(
  range: { min?: number; max?: number } | undefined,
  tableAlias: string
): string | null {
  if (!range) return null
  if (range.min !== undefined && range.max !== undefined) {
    return `${tableAlias}.home_ml_movement BETWEEN ${range.min} AND ${range.max}`
  } else if (range.min !== undefined) {
    return `${tableAlias}.home_ml_movement >= ${range.min}`
  } else if (range.max !== undefined) {
    return `${tableAlias}.home_ml_movement <= ${range.max}`
  }
  return null
}

/**
 * Build referee filter
 */
export function buildRefereeFilter(
  refereeId: string | undefined,
  tableAlias: string
): string | null {
  if (!refereeId) return null
  
  return `${tableAlias}.referee_name = '${refereeId.replace(/'/g, "''")}'`
}

// ============================================
// O/U SPECIFIC FILTERS
// ============================================

/**
 * Build neutral site filter (for O/U)
 * Note: We may need to store this in the database - for now, use venue name check
 */
export function buildNeutralSiteFilter(
  neutral: boolean | undefined,
  tableAlias: string
): string | null {
  if (neutral === undefined) return null
  
  // For now, assume playoff/championship games might be neutral
  // A proper implementation would need a 'is_neutral' column in nfl_games
  return neutral 
    ? `${tableAlias}.venue_name LIKE '%Stadium%' AND ${tableAlias}.is_playoff = 1` 
    : '1=1' // No filter for non-neutral
}

/**
 * Build home fav/dog filter (for O/U)
 * home_fav = home team is favored (spread < 0)
 * home_dog = home team is underdog (spread > 0)
 */
export function buildHomeFavDogFilter(
  homeFavDog: HomeFavDogFilter | undefined,
  tableAlias: string
): string | null {
  if (!homeFavDog || homeFavDog === 'any') return null
  
  return homeFavDog === 'home_fav'
    ? `${tableAlias}.spread_close < 0`
    : `${tableAlias}.spread_close > 0`
}

/**
 * Get the ranking column name based on stat type and side (offense/defense)
 */
function getRankingColumn(
  side: 'offense' | 'defense',
  stat: RankStatType = 'overall'
): string {
  if (side === 'defense') {
    switch (stat) {
      case 'pass': return 'rank_passing_yards_allowed_per_game'
      case 'rush': return 'rank_rushing_yards_allowed_per_game'
      case 'total_yards': return 'rank_total_yards_allowed_per_game'
      case 'points': return 'rank_points_allowed_per_game'
      default: return 'rank_total_yards_allowed_per_game' // overall = total yards
    }
  } else {
    // offense
    switch (stat) {
      case 'pass': return 'rank_passing_yards_per_game'
      case 'rush': return 'rank_rushing_yards_per_game'
      case 'total_yards': return 'rank_total_yards_per_game'
      case 'points': return 'rank_points_per_game'
      default: return 'rank_total_yards_per_game' // overall = total yards
    }
  }
}

/**
 * Build rank range SQL based on rank filter type
 */
function buildRankRangeSQL(
  rank: OpponentRankFilter | undefined,
  column: string
): string | null {
  if (!rank || rank === 'any') return null
  
  switch (rank) {
    case 'top_5': return `${column} <= 5 AND ${column} > 0`
    case 'top_10': return `${column} <= 10 AND ${column} > 0`
    case 'top_15': return `${column} <= 15 AND ${column} > 0`
    case 'bottom_5': return `${column} >= 28 AND ${column} <= 32`
    case 'bottom_10': return `${column} >= 23 AND ${column} <= 32`
    case 'bottom_15': return `${column} >= 18 AND ${column} <= 32`
    default: return null
  }
}

/**
 * Build team ranking filter for O/U (four-way: home/away × offense/defense)
 * Requires joining to nfl_team_rankings table
 * tableAlias should be the rankings table alias (e.g., 'hr' for home rankings, 'ar' for away)
 */
export function buildTeamRankingFilter(
  rank: OpponentRankFilter | undefined,
  stat: RankStatType = 'overall',
  side: 'offense' | 'defense',
  tableAlias: string
): string | null {
  if (!rank || rank === 'any') return null
  
  const column = `${tableAlias}.${getRankingColumn(side, stat)}`
  return buildRankRangeSQL(rank, column)
}

/**
 * Build previous game result filter
 * Requires a subquery or window function to look up the previous game
 * This returns a subquery condition
 */
export function buildPrevGameResultSQL(
  result: 'won' | 'lost' | 'any' | undefined,
  teamIdColumn: string, // e.g., 'g.home_team_id'
  seasonColumn: string, // e.g., 'g.season'
  gameIdColumn: string, // e.g., 'g.game_id'
  gameDateColumn: string // e.g., 'g.game_date'
): string | null {
  if (!result || result === 'any') return null
  
  // This creates a correlated subquery to find the previous game result
  // The subquery finds the most recent game before this one for the same team
  const wonCondition = result === 'won' 
    ? `(prev.home_team_id = ${teamIdColumn} AND prev.home_won = 1) OR (prev.away_team_id = ${teamIdColumn} AND prev.home_won = 0)`
    : `(prev.home_team_id = ${teamIdColumn} AND prev.home_won = 0) OR (prev.away_team_id = ${teamIdColumn} AND prev.home_won = 1)`
  
  return `EXISTS (
    SELECT 1 FROM nfl_games prev 
    WHERE (prev.home_team_id = ${teamIdColumn} OR prev.away_team_id = ${teamIdColumn})
      AND prev.game_date < ${gameDateColumn}
      AND prev.season = ${seasonColumn}
      AND (prev.home_score > 0 OR prev.away_score > 0)
      AND (${wonCondition})
    ORDER BY prev.game_date DESC
    LIMIT 1
  )`
}

/**
 * Build streak filter using pre-computed columns
 * streakValue: positive = win streak, negative = loss streak
 * Example: 2 = won last 2 games, -2 = lost last 2 games
 */
export function buildStreakFilter(
  streakValue: number | undefined,
  isHomeTeam: boolean,
  tableAlias: string
): string | null {
  if (streakValue === undefined || streakValue === 0) return null
  
  const streakCol = isHomeTeam ? `${tableAlias}.home_streak` : `${tableAlias}.away_streak`
  
  if (streakValue > 0) {
    // Win streak: home_streak >= N
    return `${streakCol} >= ${streakValue}`
  } else {
    // Loss streak: home_streak <= N (negative)
    return `${streakCol} <= ${streakValue}`
  }
}

/**
 * Build previous game margin filter using pre-computed columns
 * margin.min to margin.max where positive = won by, negative = lost by
 * Example: { min: -10, max: -1 } = lost by 1-10 points
 * Example: { min: 1, max: 10 } = won by 1-10 points
 */
export function buildPrevMarginFilter(
  margin: { min?: number; max?: number } | undefined,
  isHomeTeam: boolean,
  tableAlias: string
): string | null {
  if (!margin || (margin.min === undefined && margin.max === undefined)) return null
  
  const marginCol = isHomeTeam ? `${tableAlias}.home_prev_margin` : `${tableAlias}.away_prev_margin`
  
  const conditions: string[] = []
  
  if (margin.min !== undefined) {
    conditions.push(`${marginCol} >= ${margin.min}`)
  }
  if (margin.max !== undefined) {
    conditions.push(`${marginCol} <= ${margin.max}`)
  }
  
  return conditions.join(' AND ')
}

// Legacy function names for backwards compatibility
export function buildStreakFilterSQL(
  streakCount: number | undefined,
  streakType: 'winning' | 'losing',
  teamIdColumn: string,
  seasonColumn: string,
  gameDateColumn: string
): string | null {
  // This is now deprecated - use buildStreakFilter instead
  // Keeping for backwards compatibility, but returns null
  return null
}

export function buildPrevGameMarginSQL(
  margin: { min?: number; max?: number } | undefined,
  teamIdColumn: string,
  seasonColumn: string,
  gameDateColumn: string
): string | null {
  // This is now deprecated - use buildPrevMarginFilter instead
  // Keeping for backwards compatibility, but returns null
  return null
}

// ============================================
// MAIN FILTER BUILDER
// ============================================

export interface FilterBuildOptions {
  tableAlias?: string
  isBoxScore?: boolean
  isHomeTeam?: boolean
  defenseStat?: 'pass' | 'rush' | 'receiving'
  betType?: 'spread' | 'total' | 'moneyline'
  // For O/U queries, we need to join team rankings tables
  homeRankingsAlias?: string  // e.g., 'hr' for home team rankings
  awayRankingsAlias?: string  // e.g., 'ar' for away team rankings
}

/**
 * Build all WHERE clause conditions from filters
 */
export function buildFilterConditions(
  filters: QueryFilters,
  options: FilterBuildOptions = {}
): { conditions: string[], appliedFilters: string[], limit: number | null, requiresRankingsJoin: boolean } {
  const {
    tableAlias = 'g',
    isBoxScore = false,
    isHomeTeam = true,
    defenseStat = 'pass',
    betType = 'spread',
    homeRankingsAlias = 'hr',
    awayRankingsAlias = 'ar'
  } = options
  
  const conditions: string[] = []
  const appliedFilters: string[] = []
  let limit: number | null = null
  let requiresRankingsJoin = false
  
  const isOUQuery = betType === 'total'
  
  // Time period
  if (filters.time_period) {
    const timeLimit = getTimePeriodLimit(filters.time_period)
    if (timeLimit) {
      limit = timeLimit
      appliedFilters.push(`Last ${timeLimit} games`)
    } else {
      const timeSql = getTimePeriodSQL(filters.time_period, tableAlias)
      if (timeSql !== '1=1') {
        conditions.push(timeSql)
        appliedFilters.push(filters.time_period)
      }
    }
  }
  
  // Location - for non-O/U queries
  if (!isOUQuery && filters.location && filters.location !== 'any') {
    const locationFilter = buildLocationFilter(filters.location, tableAlias, isBoxScore)
    if (locationFilter) {
      conditions.push(locationFilter)
      appliedFilters.push(filters.location === 'home' ? 'Home' : 'Away')
    }
  }
  
  // Neutral site - for O/U queries
  if (isOUQuery && filters.neutral_site !== undefined) {
    const neutralFilter = buildNeutralSiteFilter(filters.neutral_site, tableAlias)
    if (neutralFilter && neutralFilter !== '1=1') {
      conditions.push(neutralFilter)
      appliedFilters.push('Neutral site')
    }
  }
  
  // Division
  if (filters.is_division && filters.is_division !== 'any') {
    const divFilter = buildDivisionFilter(filters.is_division, tableAlias)
    if (divFilter) {
      conditions.push(divFilter)
      appliedFilters.push(filters.is_division === 'division' ? 'Division Game' : 'Non-Division')
    }
  }
  
  // Conference
  if (filters.is_conference && filters.is_conference !== 'any') {
    const confFilter = buildConferenceFilter(filters.is_conference, tableAlias)
    if (confFilter) {
      conditions.push(confFilter)
      appliedFilters.push(filters.is_conference === 'conference' ? 'Conference Game' : 'Non-Conference')
    }
  }
  
  // Playoff
  if (filters.is_playoff && filters.is_playoff !== 'any') {
    const playoffFilter = buildPlayoffFilter(filters.is_playoff, tableAlias)
    if (playoffFilter) {
      conditions.push(playoffFilter)
      appliedFilters.push(filters.is_playoff === 'playoff' ? 'Playoff' : 'Regular Season')
    }
  }
  
  // Favorite/Underdog - for non-O/U queries
  if (!isOUQuery && filters.is_favorite && filters.is_favorite !== 'any') {
    const favFilter = buildFavoriteFilter(filters.is_favorite, tableAlias, isHomeTeam)
    if (favFilter) {
      conditions.push(favFilter)
      appliedFilters.push(filters.is_favorite === 'favorite' ? 'Favorite' : 'Underdog')
    }
  }
  
  // Home Fav/Dog - for O/U queries
  if (isOUQuery && filters.home_fav_dog && filters.home_fav_dog !== 'any') {
    const homeFavDogFilter = buildHomeFavDogFilter(filters.home_fav_dog, tableAlias)
    if (homeFavDogFilter) {
      conditions.push(homeFavDogFilter)
      appliedFilters.push(filters.home_fav_dog === 'home_fav' ? 'Home Favorite' : 'Home Underdog')
    }
  }
  
  // Spread range - for O/U queries, this applies to home team's spread
  if (filters.spread_range) {
    const spreadFilter = buildSpreadRangeFilter(filters.spread_range, tableAlias, isHomeTeam)
    if (spreadFilter) {
      conditions.push(spreadFilter)
      const { min, max } = filters.spread_range
      let desc = isOUQuery ? 'Home Spread ' : 'Spread '
      if (min !== undefined && max !== undefined) {
        desc += `${min > 0 ? '+' : ''}${min} to ${max > 0 ? '+' : ''}${max}`
      } else if (min !== undefined) {
        desc += min >= 0 ? `+${min} or more` : `${min} or more`
      } else if (max !== undefined) {
        desc += max >= 0 ? `+${max} or less` : `${max} or less`
      }
      appliedFilters.push(desc)
    }
  }
  
  // Total range
  if (filters.total_range) {
    const totalFilter = buildTotalRangeFilter(filters.total_range, tableAlias)
    if (totalFilter) {
      conditions.push(totalFilter)
      const { min, max } = filters.total_range
      let desc = 'Total '
      if (min !== undefined && max !== undefined) {
        desc += `${min}-${max}`
      } else if (min !== undefined) {
        desc += `${min}+`
      } else if (max !== undefined) {
        desc += `≤${max}`
      }
      appliedFilters.push(desc)
    }
  }
  
  // Subject team's OWN defense rank (Team Defense)
  if (!isOUQuery && filters.own_defense_rank && filters.own_defense_rank !== 'any') {
    requiresRankingsJoin = true
    // The subject team's defense ranking - use home_rankings if filtering for home, away_rankings for away
    // For general trends (no location), this applies to the favored or perspective team
    const rankingsAlias = isHomeTeam !== false ? homeRankingsAlias : awayRankingsAlias
    const rankFilter = buildTeamRankingFilter(
      filters.own_defense_rank,
      filters.own_defense_stat || 'overall',
      'defense',
      rankingsAlias
    )
    if (rankFilter) {
      conditions.push(rankFilter)
      const statLabel = filters.own_defense_stat && filters.own_defense_stat !== 'overall' 
        ? ` (${filters.own_defense_stat})` : ''
      appliedFilters.push(`Team ${filters.own_defense_rank.replace('_', ' ')} Defense${statLabel}`)
    }
  }
  
  // Subject team's OWN offense rank (Team Offense)
  if (!isOUQuery && filters.own_offense_rank && filters.own_offense_rank !== 'any') {
    requiresRankingsJoin = true
    const rankingsAlias = isHomeTeam !== false ? homeRankingsAlias : awayRankingsAlias
    const rankFilter = buildTeamRankingFilter(
      filters.own_offense_rank,
      filters.own_offense_stat || 'overall',
      'offense',
      rankingsAlias
    )
    if (rankFilter) {
      conditions.push(rankFilter)
      const statLabel = filters.own_offense_stat && filters.own_offense_stat !== 'overall' 
        ? ` (${filters.own_offense_stat})` : ''
      appliedFilters.push(`Team ${filters.own_offense_rank.replace('_', ' ')} Offense${statLabel}`)
    }
  }
  
  // Opponent's defense rank (vs Defense) - requires opponent rankings join
  if (!isOUQuery && filters.vs_defense_rank && filters.vs_defense_rank !== 'any') {
    requiresRankingsJoin = true
    // Use opponent's rankings - away_rankings when subject is home, home_rankings when subject is away
    const oppRankingsAlias = isHomeTeam !== false ? awayRankingsAlias : homeRankingsAlias
    const defFilter = buildTeamRankingFilter(
      filters.vs_defense_rank,
      filters.defense_stat || defenseStat || 'overall',
      'defense',
      oppRankingsAlias
    )
    if (defFilter) {
      conditions.push(defFilter)
      const statLabel = filters.defense_stat && filters.defense_stat !== 'overall' 
        ? ` (${filters.defense_stat})` : ''
      appliedFilters.push(`vs ${filters.vs_defense_rank.replace('_', ' ')} Defense${statLabel}`)
    }
  }
  
  // Opponent's offense rank (vs Offense) - requires opponent rankings join
  if (!isOUQuery && filters.vs_offense_rank && filters.vs_offense_rank !== 'any') {
    requiresRankingsJoin = true
    // Use away rankings alias for opponent (when subject is home) or home rankings (when subject is away)
    // For general trends, use the opposite of the subject team
    const oppRankingsAlias = isHomeTeam !== false ? awayRankingsAlias : homeRankingsAlias
    const offFilter = buildVsOffenseRankFilter(
      filters.vs_offense_rank,
      (filters.offense_stat as 'points' | 'total_yards' | 'passing' | 'rushing' | 'overall') || 'overall',
      oppRankingsAlias
    )
    if (offFilter) {
      conditions.push(offFilter)
      const statLabel = filters.offense_stat && filters.offense_stat !== 'overall' 
        ? ` (${filters.offense_stat})` : ''
      appliedFilters.push(`vs ${filters.vs_offense_rank.replace('_', ' ')} Offense${statLabel}`)
    }
  }
  
  // ============================================
  // O/U TEAM RANKING FILTERS (Four-Way)
  // ============================================
  
  // Home Team Defense Rank
  if (isOUQuery && filters.home_team_defense_rank && filters.home_team_defense_rank !== 'any') {
    requiresRankingsJoin = true
    const rankFilter = buildTeamRankingFilter(
      filters.home_team_defense_rank,
      filters.home_team_defense_stat || 'overall',
      'defense',
      homeRankingsAlias
    )
    if (rankFilter) {
      conditions.push(rankFilter)
      const statLabel = filters.home_team_defense_stat && filters.home_team_defense_stat !== 'overall' 
        ? ` (${filters.home_team_defense_stat})` : ''
      appliedFilters.push(`Home Team ${filters.home_team_defense_rank.replace('_', ' ')} Defense${statLabel}`)
    }
  }
  
  // Home Team Offense Rank
  if (isOUQuery && filters.home_team_offense_rank && filters.home_team_offense_rank !== 'any') {
    requiresRankingsJoin = true
    const rankFilter = buildTeamRankingFilter(
      filters.home_team_offense_rank,
      filters.home_team_offense_stat || 'overall',
      'offense',
      homeRankingsAlias
    )
    if (rankFilter) {
      conditions.push(rankFilter)
      const statLabel = filters.home_team_offense_stat && filters.home_team_offense_stat !== 'overall' 
        ? ` (${filters.home_team_offense_stat})` : ''
      appliedFilters.push(`Home Team ${filters.home_team_offense_rank.replace('_', ' ')} Offense${statLabel}`)
    }
  }
  
  // Away Team Defense Rank
  if (isOUQuery && filters.away_team_defense_rank && filters.away_team_defense_rank !== 'any') {
    requiresRankingsJoin = true
    const rankFilter = buildTeamRankingFilter(
      filters.away_team_defense_rank,
      filters.away_team_defense_stat || 'overall',
      'defense',
      awayRankingsAlias
    )
    if (rankFilter) {
      conditions.push(rankFilter)
      const statLabel = filters.away_team_defense_stat && filters.away_team_defense_stat !== 'overall' 
        ? ` (${filters.away_team_defense_stat})` : ''
      appliedFilters.push(`Away Team ${filters.away_team_defense_rank.replace('_', ' ')} Defense${statLabel}`)
    }
  }
  
  // Away Team Offense Rank
  if (isOUQuery && filters.away_team_offense_rank && filters.away_team_offense_rank !== 'any') {
    requiresRankingsJoin = true
    const rankFilter = buildTeamRankingFilter(
      filters.away_team_offense_rank,
      filters.away_team_offense_stat || 'overall',
      'offense',
      awayRankingsAlias
    )
    if (rankFilter) {
      conditions.push(rankFilter)
      const statLabel = filters.away_team_offense_stat && filters.away_team_offense_stat !== 'overall' 
        ? ` (${filters.away_team_offense_stat})` : ''
      appliedFilters.push(`Away Team ${filters.away_team_offense_rank.replace('_', ' ')} Offense${statLabel}`)
    }
  }
  
  // ============================================
  // MOMENTUM FILTERS
  // ============================================
  
  // Previous game result (home team for O/U, subject team otherwise)
  if (filters.prev_game_result && filters.prev_game_result !== 'any') {
    const teamCol = isOUQuery ? `${tableAlias}.home_team_id` : (isHomeTeam ? `${tableAlias}.home_team_id` : `${tableAlias}.away_team_id`)
    const prevResultFilter = buildPrevGameResultSQL(
      filters.prev_game_result,
      teamCol,
      `${tableAlias}.season`,
      `${tableAlias}.game_id`,
      `${tableAlias}.game_date`
    )
    if (prevResultFilter) {
      conditions.push(prevResultFilter)
      const teamLabel = isOUQuery ? 'Home Team' : 'Team'
      appliedFilters.push(`${teamLabel} Coming Off ${filters.prev_game_result === 'won' ? 'Win' : 'Loss'}`)
    }
  }
  
  // Previous game margin - using pre-computed columns
  if (filters.prev_game_margin && (filters.prev_game_margin.min !== undefined || filters.prev_game_margin.max !== undefined)) {
    // For O/U: use home team, otherwise use home/away based on isHomeTeam
    const useHomeTeam = isOUQuery || isHomeTeam
    const marginFilter = buildPrevMarginFilter(filters.prev_game_margin, useHomeTeam, tableAlias)
    if (marginFilter) {
      conditions.push(marginFilter)
      const { min, max } = filters.prev_game_margin
      const teamLabel = isOUQuery ? 'Home Team' : 'Team'
      let desc = `${teamLabel} Prev Margin `
      if (min !== undefined && max !== undefined) {
        desc += `${min > 0 ? '+' : ''}${min} to ${max > 0 ? '+' : ''}${max}`
      } else if (min !== undefined) {
        desc += `${min > 0 ? '+' : ''}${min}+`
      } else if (max !== undefined) {
        desc += `≤${max > 0 ? '+' : ''}${max}`
      }
      appliedFilters.push(desc)
    }
  }
  
  // Winning streak - using pre-computed columns
  if (filters.winning_streak && filters.winning_streak > 0) {
    const useHomeTeam = isOUQuery || isHomeTeam
    const streakFilter = buildStreakFilter(filters.winning_streak, useHomeTeam, tableAlias)
    if (streakFilter) {
      conditions.push(streakFilter)
      const teamLabel = isOUQuery ? 'Home Team' : 'Team'
      appliedFilters.push(`${teamLabel} ${filters.winning_streak}W Streak`)
    }
  }
  
  // Losing streak - using pre-computed columns
  if (filters.losing_streak && filters.losing_streak > 0) {
    const useHomeTeam = isOUQuery || isHomeTeam
    // Losing streak is represented as negative in the column
    const streakFilter = buildStreakFilter(-filters.losing_streak, useHomeTeam, tableAlias)
    if (streakFilter) {
      conditions.push(streakFilter)
      const teamLabel = isOUQuery ? 'Home Team' : 'Team'
      appliedFilters.push(`${teamLabel} ${filters.losing_streak}L Streak`)
    }
  }
  
  // ============================================
  // O/U SPECIFIC: AWAY TEAM MOMENTUM
  // ============================================
  
  if (isOUQuery) {
    // Away team previous game result - using pre-computed column
    if (filters.away_prev_game_result && filters.away_prev_game_result !== 'any') {
      // Check away_prev_margin > 0 for win, < 0 for loss
      if (filters.away_prev_game_result === 'won') {
        conditions.push(`${tableAlias}.away_prev_margin > 0`)
        appliedFilters.push('Away Team Coming Off Win')
      } else {
        conditions.push(`${tableAlias}.away_prev_margin < 0`)
        appliedFilters.push('Away Team Coming Off Loss')
      }
    }
    
    // Away team previous game margin - using pre-computed column
    if (filters.away_prev_game_margin && (filters.away_prev_game_margin.min !== undefined || filters.away_prev_game_margin.max !== undefined)) {
      const marginFilter = buildPrevMarginFilter(filters.away_prev_game_margin, false, tableAlias)
      if (marginFilter) {
        conditions.push(marginFilter)
        const { min, max } = filters.away_prev_game_margin
        let desc = 'Away Prev Margin '
        if (min !== undefined && max !== undefined) {
          desc += `${min > 0 ? '+' : ''}${min} to ${max > 0 ? '+' : ''}${max}`
        } else if (min !== undefined) {
          desc += `${min > 0 ? '+' : ''}${min}+`
        } else if (max !== undefined) {
          desc += `≤${max > 0 ? '+' : ''}${max}`
        }
        appliedFilters.push(desc)
      }
    }
    
    // Away team winning streak - using pre-computed column
    if (filters.away_winning_streak && filters.away_winning_streak > 0) {
      const streakFilter = buildStreakFilter(filters.away_winning_streak, false, tableAlias)
      if (streakFilter) {
        conditions.push(streakFilter)
        appliedFilters.push(`Away ${filters.away_winning_streak}W Streak`)
      }
    }
    
    // Away team losing streak - using pre-computed column
    if (filters.away_losing_streak && filters.away_losing_streak > 0) {
      const streakFilter = buildStreakFilter(-filters.away_losing_streak, false, tableAlias)
      if (streakFilter) {
        conditions.push(streakFilter)
        appliedFilters.push(`Away ${filters.away_losing_streak}L Streak`)
      }
    }
  }
  
  // ============================================
  // LINE MOVEMENT FILTERS
  // ============================================
  
  // Team result
  if (filters.team_result && filters.team_result !== 'any') {
    const resultFilter = buildTeamResultFilter(filters.team_result, tableAlias, isHomeTeam)
    if (resultFilter) {
      conditions.push(resultFilter)
      appliedFilters.push(filters.team_result === 'won' ? 'Team won' : 'Team lost')
    }
  }
  
  // Line movement (simple positive/negative)
  if (filters.line_movement && filters.line_movement !== 'any') {
    const moveFilter = buildLineMovementFilter(filters.line_movement, betType === 'total' ? 'total' : 'spread', tableAlias)
    if (moveFilter) {
      conditions.push(moveFilter)
      appliedFilters.push(filters.line_movement === 'positive' ? 'Line moved up' : 'Line moved down')
    }
  }
  
  // Spread movement range
  if (filters.spread_movement_range) {
    const spreadMoveFilter = buildSpreadMovementFilter(filters.spread_movement_range, tableAlias)
    if (spreadMoveFilter) {
      conditions.push(spreadMoveFilter)
      appliedFilters.push(`Spread moved ${filters.spread_movement_range.min} to ${filters.spread_movement_range.max}`)
    }
  }
  
  // Total movement range
  if (filters.total_movement_range) {
    const totalMoveFilter = buildTotalMovementFilter(filters.total_movement_range, tableAlias)
    if (totalMoveFilter) {
      conditions.push(totalMoveFilter)
      appliedFilters.push(`Total moved ${filters.total_movement_range.min} to ${filters.total_movement_range.max}`)
    }
  }
  
  // ML movement range
  if (filters.ml_movement_range) {
    const mlMoveFilter = buildMLMovementFilter(filters.ml_movement_range, tableAlias)
    if (mlMoveFilter) {
      conditions.push(mlMoveFilter)
      appliedFilters.push(`ML moved ${filters.ml_movement_range.min} to ${filters.ml_movement_range.max}`)
    }
  }
  
  // Referee
  if (filters.referee_id) {
    const refFilter = buildRefereeFilter(filters.referee_id, tableAlias)
    if (refFilter) {
      conditions.push(refFilter)
      appliedFilters.push(`Referee: ${filters.referee_id}`)
    }
  }
  
  return { conditions, appliedFilters, limit, requiresRankingsJoin }
}

/**
 * Build the WHERE clause string
 */
export function buildWhereClause(conditions: string[]): string {
  if (conditions.length === 0) return ''
  return 'WHERE ' + conditions.join(' AND ')
}

