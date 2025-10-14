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

interface PublicMoneyData {
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
  updated_at: string
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
    const response = await fetch(url, {
      headers: {
        'insider-api-key': API_KEY,
      },
      next: { revalidate: 1800 } // Cache for 30 minutes
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch public money for ${gameId}: ${response.status}`)
    }

    const data: PublicMoneyData[] = await response.json()
    
    // Return the most recent data point (last item in array)
    if (data && data.length > 0) {
      return data[data.length - 1]
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching public money for ${gameId}:`, error)
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
    const response = await fetch(url, {
      headers: {
        'insider-api-key': API_KEY,
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch referee stats for ${gameId}: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching referee stats for ${gameId}:`, error)
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
