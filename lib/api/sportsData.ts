// lib/api/sportsData.ts
const API_BASE_URL = 'https://api.trendlinelabs.ai'
const API_KEY = process.env.INSIDER_API_KEY || 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'

type League = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'cfb'

interface Game {
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

// Fetch games for a given league and date range
export async function fetchGames(
  league: League,
  from: string,
  to: string
): Promise<Game[]> {
  try {
    const url = `${API_BASE_URL}/api/${league}/games?from=${from}&to=${to}`
    const response = await fetch(url, {
      headers: {
        'insider-api-key': API_KEY,
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${league} games: ${response.status}`)
    }

    const data: GamesResponse = await response.json()
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
  try {
    const url = `${API_BASE_URL}/api/${league}/games/${gameId}/public-money`
    console.log(`  → Fetching public money: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'insider-api-key': API_KEY,
      },
      // Don't use Next.js cache for this endpoint - response is too large (5MB+)
      // We extract only the needed data (a few KB) from the response
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      console.error(`  ✗ HTTP ${response.status} for ${gameId}`)
      return null
    }

    // The API returns a large object with current data at top level + historical pregame_odds array
    // We ONLY extract the top-level current percentages to avoid processing 5MB+ of historical data
    const fullResponse: PublicMoneyAPIResponse = await response.json()
    
    // Extract only the fields we need from the top level (current/latest data)
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
      // These aren't in the response, so we'll derive from the game's odds
      away_team_ml: 0, // Will be set from game.odds
      home_team_ml: 0,
      away_team_point_spread: 0,
      home_team_point_spread: 0
    }
    
    console.log(`  ✓ Extracted current public money data for ${gameId}`)
    return currentData
    
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error(`  ✗ Timeout fetching public money for ${gameId}`)
    } else {
      console.error(`  ✗ Error fetching public money for ${gameId}:`, error)
    }
    return null
  }
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

    const data = await response.json()
    
    // Validate that we have the required nested structure
    if (!data || !data.over_under || !data.over_under.over_under) {
      console.log(`  ✗ Referee stats missing required data structure for ${gameId}`)
      return null
    }
    
    console.log(`  ✓ Got referee stats for ${gameId}`)
    return data
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error(`  ✗ Timeout fetching referee stats for ${gameId}`)
    } else {
      console.error(`  ✗ Error fetching referee stats for ${gameId}:`, error)
    }
    return null
  }
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
