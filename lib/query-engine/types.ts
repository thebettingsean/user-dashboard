/**
 * Query Engine Types
 * Universal types for the prop analytics query engine
 */

// ============================================
// FILTER TYPES
// ============================================

export type TimePeriod = 
  | 'L3' | 'L5' | 'L10' | 'L15' | 'L20' | 'L30'
  | 'season' | 'last_season' | 'L2years' | 'L3years' | 'since_2022'

export type Location = 'home' | 'away' | 'any'

export type DivisionFilter = 'division' | 'non_division' | 'any'

export type ConferenceFilter = 'conference' | 'non_conference' | 'any'

export type FavoriteFilter = 'favorite' | 'underdog' | 'any'

// For O/U - describes the game situation (home team's status)
export type HomeFavDogFilter = 'home_fav' | 'home_dog' | 'any'

export type DefenseRankFilter = 'top_5' | 'top_10' | 'top_15' | 'bottom_5' | 'bottom_10' | 'bottom_15' | 'any'

export type PlayoffFilter = 'playoff' | 'regular' | 'any'

export type TeamResultFilter = 'won' | 'lost' | 'any'

export type LineMovementFilter = 'positive' | 'negative' | 'any'

// Range for spread/total filtering (min and/or max can be set)
export interface Range {
  min?: number
  max?: number
}

// Opponent ranking filter (1-32)
export type OpponentRankFilter = 'top_5' | 'top_10' | 'top_15' | 'bottom_5' | 'bottom_10' | 'bottom_15' | 'any'

// Stat type for team rankings
export type RankStatType = 'overall' | 'pass' | 'rush' | 'total_yards' | 'points'

// Team perspective for O/U queries
export type TeamSide = 'home' | 'away'

// All possible filters
export interface QueryFilters {
  time_period?: TimePeriod
  location?: Location
  is_division?: DivisionFilter
  is_conference?: ConferenceFilter
  is_playoff?: PlayoffFilter
  is_favorite?: FavoriteFilter
  team_result?: TeamResultFilter
  spread_range?: Range        // e.g., { min: -7, max: -3 } for favorites -3 to -7
  total_range?: Range         // e.g., { min: 45, max: 50 }
  
  // Opponent team filter (for props - versus team)
  opponent_id?: number        // ESPN team ID for opponent filtering
  
  // Subject team's OWN rankings (Team Defense/Offense)
  own_defense_rank?: DefenseRankFilter  // Team's own defense ranking
  own_defense_stat?: RankStatType       // which stat for own defense ranking
  own_offense_rank?: OpponentRankFilter // Team's own offense ranking  
  own_offense_stat?: RankStatType       // which stat for own offense ranking
  
  // Opponent's rankings (vs Defense/Offense)
  vs_defense_rank?: DefenseRankFilter  // vs top/bottom X defense
  defense_stat?: 'pass' | 'rush' | 'receiving'  // which stat to use for defense ranking
  
  // Offense ranking filters (opponent's offensive rank)
  vs_offense_rank?: OpponentRankFilter  // vs top/bottom X offense
  offense_stat?: 'points' | 'total_yards' | 'passing' | 'rushing'  // which stat to use
  
  // ============================================
  // O/U SPECIFIC FILTERS
  // ============================================
  
  // For O/U: Neutral site filter (replaces home/away location)
  neutral_site?: boolean      // true = only neutral site games
  
  // For O/U: Home team status (instead of fav/dog perspective)
  home_fav_dog?: HomeFavDogFilter  // 'home_fav' | 'home_dog' | 'any'
  
  // For O/U: Four-way team stats (both teams' rankings matter)
  // Home team defense rank at time of game
  home_team_defense_rank?: OpponentRankFilter
  home_team_defense_stat?: RankStatType
  
  // Home team offense rank at time of game
  home_team_offense_rank?: OpponentRankFilter
  home_team_offense_stat?: RankStatType
  
  // Away team defense rank at time of game
  away_team_defense_rank?: OpponentRankFilter
  away_team_defense_stat?: RankStatType
  
  // Away team offense rank at time of game
  away_team_offense_rank?: OpponentRankFilter
  away_team_offense_stat?: RankStatType
  
  // ============================================
  // MOMENTUM FILTERS (works for all bet types)
  // ============================================
  
  // Previous game result for home team (O/U) or subject team (spread/ML)
  prev_game_result?: TeamResultFilter   // 'won' | 'lost' | 'any'
  
  // Previous game margin (positive = won by X, negative = lost by X)
  // e.g., { min: 1, max: 10 } = won by 1-10 points
  // e.g., { min: -10, max: -1 } = lost by 1-10 points
  prev_game_margin?: Range
  
  // Winning/losing streak (number of consecutive W/L)
  // For O/U: applies to home team
  // For spread/ML: applies to subject team
  winning_streak?: number     // e.g., 3 = won last 3 games
  losing_streak?: number      // e.g., 3 = lost last 3 games
  
  // For O/U: Away team momentum filters
  away_prev_game_result?: TeamResultFilter
  away_prev_game_margin?: Range
  away_winning_streak?: number
  away_losing_streak?: number
  
  // ============================================
  // LINE MOVEMENT FILTERS
  // ============================================
  line_movement?: LineMovementFilter
  spread_movement_range?: Range    // e.g., { min: -2, max: 0 } for line moved toward favorite
  total_movement_range?: Range     // e.g., { min: -3, max: 3 }
  ml_movement_range?: Range        // e.g., { min: -50, max: 50 }
  
  referee_id?: string         // specific referee
}

// ============================================
// QUERY TYPES
// ============================================

export type QueryType = 'prop' | 'team' | 'referee' | 'trend'

// Prop stat types
export type PropStatType = 
  | 'pass_yards' | 'pass_tds' | 'pass_attempts' | 'pass_completions' | 'interceptions'
  | 'rush_yards' | 'rush_tds' | 'rush_attempts' | 'rush_long' | 'yards_per_carry'
  | 'receiving_yards' | 'receptions' | 'receiving_tds' | 'receiving_long' | 'targets'
  | 'fantasy_points' | 'completions_plus_rush_yards'  // combo stats

// Team bet types
export type TeamBetType = 'spread' | 'total' | 'moneyline'

// ============================================
// REQUEST TYPES
// ============================================

export interface PropQueryRequest {
  type: 'prop'
  player_id?: number           // ESPN player ID (optional if position is set)
  position?: string            // Position filter (e.g., 'QB', 'WR') - queries all players of position
  stat: PropStatType           // What stat to measure
  line: number                 // Threshold (e.g., 250 for O250)
  filters: QueryFilters
}

export interface TeamQueryRequest {
  type: 'team'
  team_id?: number             // Optional - specific team, or all teams
  bet_type: TeamBetType        // spread, total, or ML
  side?: 'over' | 'under' | 'home' | 'away' | 'favorite' | 'underdog'
  filters: QueryFilters
}

export interface RefereeQueryRequest {
  type: 'referee'
  referee_id?: string          // Optional - specific ref, or all refs
  bet_type: TeamBetType
  side?: 'over' | 'under' | 'home' | 'away'
  filters: QueryFilters
}

export interface TrendQueryRequest {
  type: 'trend'
  bet_type: TeamBetType
  side: 'over' | 'under' | 'home' | 'away' | 'favorite' | 'underdog'
  filters: QueryFilters
}

export type QueryRequest = PropQueryRequest | TeamQueryRequest | RefereeQueryRequest | TrendQueryRequest

// ============================================
// RESPONSE TYPES
// ============================================

export interface GameDetail {
  game_id: number
  game_date: string
  opponent?: string
  opponent_id?: number
  location?: 'home' | 'away' | 'neutral'
  actual_value: number
  line?: number
  hit: boolean
  differential: number        // actual - line (cover margin)
  spread?: number             // from subject team's perspective
  total?: number
  team_won?: boolean
  home_score?: number
  away_score?: number
  // Player info (for prop queries)
  player_id?: number
  player_name?: string
  player_position?: string
  player_headshot?: string
  // Team info (for team/trend queries)
  subject_team_id?: number
  opponent_team_id?: number
  // For O/U display - both teams
  home_team_id?: number
  away_team_id?: number
  home_abbr?: string
  away_abbr?: string
  // Full box score stats (for prop queries expanded view)
  pass_attempts?: number
  pass_completions?: number
  pass_yards?: number
  pass_tds?: number
  interceptions?: number
  sacks?: number
  qb_rating?: number
  rush_attempts?: number
  rush_yards?: number
  rush_tds?: number
  rush_long?: number
  yards_per_carry?: number
  receptions?: number
  receiving_yards?: number
  receiving_tds?: number
  receiving_long?: number
  targets?: number
  yards_per_reception?: number
}

export interface QueryResult {
  // Core stats
  hits: number
  misses: number
  pushes: number
  total_games: number
  hit_rate: number            // percentage
  
  // Value stats
  avg_value: number
  avg_differential: number    // avg above/below line
  min_value: number
  max_value: number
  
  // Streak tracking
  current_streak: number      // positive = hit streak, negative = miss streak
  longest_hit_streak: number
  longest_miss_streak: number
  
  // Game-by-game breakdown
  games: GameDetail[]
  
  // Query metadata
  query_time_ms: number
  filters_applied: string[]
}

// ============================================
// PLAYER INFO
// ============================================

export interface PlayerInfo {
  player_id: number
  name: string
  team_id: number
  team_name?: string
  position: string
  headshot_url?: string
}

// ============================================
// TEAM INFO
// ============================================

export interface TeamInfo {
  team_id: number
  name: string
  abbreviation: string
  division: string
  conference: string
  logo_url?: string
}

