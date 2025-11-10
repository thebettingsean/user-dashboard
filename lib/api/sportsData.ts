// lib/api/sportsData.ts
const API_BASE_URL = 'https://api.trendlinelabs.ai'
const API_KEY = process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'

const FETCH_TIMEOUT_MS = 30000
const FETCH_RETRIES = 2

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

export type League = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'cfb'

export interface PlayerProp {
  player_name: string
  player_id: number
  team_id?: string // Full team name from API (e.g., "Toronto Raptors")
  prop_type: 'over' | 'under' | 'yes' | 'no'
  opening_line: number
  record: {
    hit: number
    miss: number
    total: number
    roi: number
  }
  best_line: {
    bookmaker: string
    opening_odds: number
    opening_line: string
    implied_probability: number
  }
}

export interface PropCategory {
  prop_key: string
  title: string
  players: PlayerProp[]
}

export interface Game {
  game_id: string
  name: string
  game_date: string
  away_team: string
  home_team: string
  away_team_logo: string
  home_team_logo: string
  public_money_url: string
  referee_stats_url: string
  referee_name: string | null
  referee_id: number | null
  odds: {
    over_under: number
    spread: number
    away_team_odds: {
      moneyline: number
      spread_odds: number
    }
    home_team_odds: {
      moneyline: number
      spread_odds: number
    }
  }
}

interface GamesResponse {
  statusCode: number
  games: Game[]
  league: string
}

// The actual API response structure - includes current data at top level + historical array
interface PublicMoneyAPIResponse {
  public_money_ml_away_bets_pct: number
  public_money_ml_away_stake_pct: number
  public_money_ml_home_bets_pct: number
  public_money_ml_home_stake_pct: number
  public_money_spread_away_bets_pct: number
  public_money_spread_away_stake_pct: number
  public_money_spread_home_bets_pct: number
  public_money_spread_home_stake_pct: number
  public_money_over_bets_pct: number
  public_money_over_stake_pct: number
  public_money_under_bets_pct: number
  public_money_under_stake_pct: number
  pregame_odds?: Array<any> // Large historical array we ignore
  sharp_money_stats?: Array<any>
  rlm_stats?: Array<any>
}

// The simplified data we extract and use
export interface PublicMoneyData {
  public_money_ml_away_bets_pct: number
  public_money_ml_away_stake_pct: number
  public_money_ml_home_bets_pct: number
  public_money_ml_home_stake_pct: number
  public_money_spread_away_bets_pct: number
  public_money_spread_away_stake_pct: number
  public_money_spread_home_bets_pct: number
  public_money_spread_home_stake_pct: number
  public_money_over_bets_pct: number
  public_money_over_stake_pct: number
  public_money_under_bets_pct: number
  public_money_under_stake_pct: number
  sharp_money_stats: Array<{
    bet_type: string
    sharpness_level: string
    stake_pct: number
    difference?: number
    sharpness_level_value?: number
  }>
  rlm_stats: Array<{
    bet_type: string
    rlm_strength: number
    line_movement: number
    rlm_strength_normalized: number
    percentage: number
  }>
  away_team_ml: number
  home_team_ml: number
  away_team_point_spread: number
  home_team_point_spread: number
}

interface RefereeStats {
  referee_id: number
  referee_name: string
  over_under: {
    over_under: {
      over_hits: number
      under_hits: number
      over_percentage: number
      under_percentage: number
    }
  }
  spread: {
    spread: {
      ats_wins: number
      ats_losses: number
      home_favorite_wins: number
      home_favorite_losses: number
    }
  }
  total_games: number
}

export interface GameDetailsSummary {
  name?: string
  season?: number
  head_to_head?: any
  season_avg?: any
  h2h?: any
  h2h_3year?: any
  team_form?: any
}

// Fetch games for a given league and date range
export async function fetchGames(
  league: League,
  from: string,
  to: string
): Promise<Game[]> {
  try {
    const url = `${API_BASE_URL}/api/${league}/games?from=${from}&to=${to}`
    console.log(`🎮 Fetching games: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'insider-api-key': API_KEY,
      },
      cache: 'no-store' // Don't cache - use fresh data
    })

    console.log(`📡 API Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error Response: ${errorText}`)
      throw new Error(`Failed to fetch ${league} games: ${response.status} - ${errorText}`)
    }

    const data: GamesResponse = await response.json()
    console.log(`✅ Found ${data.games?.length || 0} games`)
    return data.games || []
  } catch (error) {
    console.error(`Error fetching ${league} games:`, error)
    return []
  }
}

// Fetch public money data for a specific game
export async function fetchPublicMoney(
  league: League,
  gameId: string
): Promise<PublicMoneyData | null> {
  const url = `${API_BASE_URL}/api/${league}/games/${gameId}/public-money`

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      console.log(`  → Fetching public money (attempt ${attempt}/${FETCH_RETRIES}): ${url}`)

      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'insider-api-key': API_KEY
          },
          cache: 'no-store'
        },
        FETCH_TIMEOUT_MS
      )

      if (!response.ok) {
        console.error(`  ✗ HTTP ${response.status} for ${gameId}`)
        if (attempt === FETCH_RETRIES) {
          return null
        }
        continue
      }

      const fullResponse: PublicMoneyAPIResponse = await response.json()

      const currentData: PublicMoneyData = {
        public_money_ml_away_bets_pct: fullResponse.public_money_ml_away_bets_pct,
        public_money_ml_away_stake_pct: fullResponse.public_money_ml_away_stake_pct,
        public_money_ml_home_bets_pct: fullResponse.public_money_ml_home_bets_pct,
        public_money_ml_home_stake_pct: fullResponse.public_money_ml_home_stake_pct,
        public_money_spread_away_bets_pct: fullResponse.public_money_spread_away_bets_pct,
        public_money_spread_away_stake_pct: fullResponse.public_money_spread_away_stake_pct,
        public_money_spread_home_bets_pct: fullResponse.public_money_spread_home_bets_pct,
        public_money_spread_home_stake_pct: fullResponse.public_money_spread_home_stake_pct,
        public_money_over_bets_pct: fullResponse.public_money_over_bets_pct,
        public_money_over_stake_pct: fullResponse.public_money_over_stake_pct,
        public_money_under_bets_pct: fullResponse.public_money_under_bets_pct,
        public_money_under_stake_pct: fullResponse.public_money_under_stake_pct,
        sharp_money_stats: (fullResponse.sharp_money_stats || []).slice(0, 5),
        rlm_stats: (fullResponse.rlm_stats || []).slice(0, 5),
        away_team_ml: 0,
        home_team_ml: 0,
        away_team_point_spread: 0,
        home_team_point_spread: 0
      }

      console.log(`  ✓ Extracted current public money data for ${gameId}`)
      return currentData
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.error(`  ✗ Timeout fetching public money for ${gameId} (attempt ${attempt})`)
      } else {
        console.error(`  ✗ Error fetching public money for ${gameId} (attempt ${attempt}):`, error)
      }

      if (attempt === FETCH_RETRIES) {
        return null
      }
    }
  }

  return null
}

// Fetch referee stats for a specific game
export async function fetchRefereeStats(
  league: League,
  gameId: string
): Promise<RefereeStats | null> {
  try {
    const url = `${API_BASE_URL}/api/${league}/games/${gameId}/referee-stats`
    console.log(`  → Fetching referee stats: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'insider-api-key': API_KEY,
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      console.error(`  ✗ HTTP ${response.status} for ${gameId} referee stats`)
      return null
    }

    const rawData = await response.json()
    
    // NFL/MLB structure: has over_under.over_under directly
    if (rawData.over_under?.over_under) {
      console.log(`  ✓ Got referee stats for ${gameId} (NFL/MLB structure)`)
      return rawData
    }
    
    // NBA/other structure: has referee_odds.game_details with historical games
    // We need to aggregate O/U stats from historical game data
    if (rawData.referee_odds?.game_details?.game_details && Array.isArray(rawData.referee_odds.game_details.game_details)) {
      console.log(`  → Parsing NBA-style referee stats for ${gameId}`)
      const gameHistory = rawData.referee_odds.game_details.game_details
      
      // Aggregate over/under from game history
      let overHits = 0
      let underHits = 0
      
      for (const game of gameHistory) {
        if (game.game_ou && game.total_score !== undefined) {
          if (game.total_score > game.game_ou) {
            overHits++
          } else if (game.total_score < game.game_ou) {
            underHits++
          }
          // Push = don't count
        }
      }
      
      const totalGames = overHits + underHits
      if (totalGames < 10) {
        console.log(`  ✗ Insufficient referee history for ${gameId} (${totalGames} games)`)
        return null
      }
      
      // Convert to NFL-style structure for consistency
      const normalized: RefereeStats = {
        referee_id: rawData.referee_id,
        referee_name: rawData.referee_name,
        over_under: {
          over_under: {
            over_hits: overHits,
            under_hits: underHits,
            over_percentage: Math.round((overHits / totalGames) * 100),
            under_percentage: Math.round((underHits / totalGames) * 100)
          }
        },
        spread: {
          spread: {
            ats_wins: 0,
            ats_losses: 0,
            home_favorite_wins: 0,
            home_favorite_losses: 0
          }
        },
        total_games: totalGames
      }
      
      console.log(`  ✓ Parsed NBA referee stats: ${overHits}-${underHits} O/U (${totalGames} games)`)
      return normalized
    }
    
    console.log(`  ✗ Referee stats has unknown structure for ${gameId}`)
    return null
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error(`  ✗ Timeout fetching referee stats for ${gameId}`)
    } else {
      console.error(`  ✗ Error fetching referee stats for ${gameId}:`, error)
    }
    return null
  }
}

// Fetch game details (team stats, season averages, trends)
export async function fetchGameDetails(
  league: League,
  gameId: string
): Promise<GameDetailsSummary | null> {
  const url = `${API_BASE_URL}/api/${league}/games/${gameId}`

  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      console.log(`  → Fetching game details (attempt ${attempt}/${FETCH_RETRIES}): ${url}`)

      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            'insider-api-key': API_KEY
          },
          cache: 'no-store'
        },
        FETCH_TIMEOUT_MS
      )

      if (!response.ok) {
        console.error(`  ✗ HTTP ${response.status} for ${gameId} game details`)
        if (attempt === FETCH_RETRIES) {
          return null
        }
        continue
      }

      const data = await response.json()

      return {
        name: data.name,
        season: data.season,
        head_to_head: data.head_to_head ?? null,
        season_avg: data.season_avg ?? null,
        h2h: data.h2h ?? null,
        h2h_3year: data.h2h_3year ?? null,
        team_form: data.team_form ?? null
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.error(`  ✗ Timeout fetching game details for ${gameId} (attempt ${attempt})`)
      } else {
        console.error(`  ✗ Error fetching game details for ${gameId} (attempt ${attempt}):`, error)
      }

      if (attempt === FETCH_RETRIES) {
        return null
      }
    }
  }

  return null
}

// Helper to get current week's date range
export function getCurrentWeekDateRange(): { from: string; to: string } {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 6 = Saturday
  
  // Get the most recent Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
  
  // Get the upcoming Sunday
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  return {
    from: monday.toISOString().split('T')[0],
    to: sunday.toISOString().split('T')[0]
  }
}

// Fetch player props for a game
export async function fetchPlayerProps(league: League, gameId: string): Promise<PropCategory[] | null> {
  try {
    const url = `${API_BASE_URL}/api/${league}/games/${gameId}/player-props`
    console.log(`Fetching props from: ${url}`)
    console.log(`Using API key: ${API_KEY?.substring(0, 10)}...`)
    
    const response = await fetch(url, {
      headers: {
        'insider-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      cache: 'no-store' // Don't cache for now (debugging)
    })

    console.log(`Props API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Failed to fetch player props for ${gameId}: ${response.status} - ${errorText}`)
      return null
    }

    const data: PropCategory[] | null = await response.json()

    if (!Array.isArray(data)) {
      console.log(`Props payload for ${gameId} was not an array. Returning empty list.`)
      return []
    }

    const totalPlayers = data.reduce((sum, cat) => sum + (Array.isArray(cat.players) ? cat.players.length : 0), 0)
    console.log(`✓ Successfully fetched player props for ${gameId}: ${data.length} categories, ${totalPlayers} total players`)
    
    return data
  } catch (error) {
    console.error(`Error fetching player props for ${gameId}:`, error)
    return null
  }
}
