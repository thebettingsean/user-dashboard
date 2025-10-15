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

// New unified API structure - all data in one endpoint
interface PublicMoneyBucket {
  losses: number
  roi: number
  total_bet: number
  total_profit: number
  win_pct: number
  wins: number
  total_games?: number
  quadrant_name?: string
}

export interface RefereeStats {
  referee_id: number
  referee_name: string
  total_games: number
  
  // Moneyline stats with public money buckets
  moneyline: {
    ml: {
      home_ml_wins: number
      home_ml_losses: number
      home_ml_roi: number
      away_ml_wins: number
      away_ml_losses: number
      away_ml_roi: number
      home_favorite_wins: number
      home_favorite_losses: number
      home_favorite_net_roi: number
      away_favorite_wins: number
      away_favorite_losses: number
      away_favorite_net_roi: number
      public_money: {
        '0-25%': PublicMoneyBucket
        '26-50%': PublicMoneyBucket
        '51-75%': PublicMoneyBucket
        '76-100%': PublicMoneyBucket
      } | null
    }
  }
  
  // Over/Under stats with public money buckets  
  over_under: {
    over_under: {
      over_hits: number
      under_hits: number
      over_percentage: number
      under_percentage: number
      over_profit: number
      over_roi: number
      under_profit: number
      under_roi: number
      public_money_over: {
        '0-25%': PublicMoneyBucket
        '26-50%': PublicMoneyBucket
        '51-75%': PublicMoneyBucket
        '76-100%': PublicMoneyBucket
      } | null
      public_money_under: {
        '0-25%': PublicMoneyBucket
        '26-50%': PublicMoneyBucket
        '51-75%': PublicMoneyBucket
        '76-100%': PublicMoneyBucket
      } | null
    }
  }
  
  // Spread stats with public money buckets
  spread: {
    spread: {
      ats_wins: number
      ats_losses: number
      ats_roi: number
      home_favorite_wins: number
      home_favorite_losses: number
      home_favorite_net_roi: number
      away_favorite_wins: number
      away_favorite_losses: number
      away_favorite_net_roi: number
      public_money: {
        '0-25%': PublicMoneyBucket
        '26-50%': PublicMoneyBucket
        '51-75%': PublicMoneyBucket
        '76-100%': PublicMoneyBucket
      } | null
    }
  }
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

// Fetch referee stats for a specific game (now includes all public money data too!)
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
    
    // Verify we have the expected unified structure
    if (!data.referee_id || !data.over_under?.over_under) {
      console.error(`  ✗ Invalid referee stats structure for ${gameId}`)
      return null
    }
    
    console.log(`  ✓ Fetched referee stats for ${gameId} (${data.total_games || 0} games)`)
    return data as RefereeStats
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
