import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

const SPORTSDATA_IO_SPLITS_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY

interface BettingSplit {
  BettingOutcomeType: 'Home' | 'Away' | 'Over' | 'Under'
  BetPercentage: number
  MoneyPercentage: number
}

interface BettingMarketSplit {
  BettingBetType: 'Moneyline' | 'Spread' | 'Total Points'
  BettingSplits: BettingSplit[]
}

interface GameBettingSplits {
  ScoreId: number
  Season: number
  Week: number
  Date: string
  AwayTeam: string
  HomeTeam: string
  BettingMarketSplits: BettingMarketSplit[]
}

// Team abbreviation mapping (SportsDataIO -> ESPN)
const TEAM_ABBR_MAP: Record<string, string> = {
  'JAX': 'JAC',
  'JAC': 'JAX',
  'WSH': 'WAS',
  'WAS': 'WSH',
  'LA': 'LAR',
  'LAR': 'LA',
}

function normalizeAbbr(abbr: string): string {
  return TEAM_ABBR_MAP[abbr] || abbr
}

async function fetchBettingSplits(scoreId: number): Promise<GameBettingSplits | null> {
  try {
    const response = await fetch(
      `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_IO_SPLITS_KEY}`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (data.HttpStatusCode || !data.BettingMarketSplits || data.BettingMarketSplits.length === 0) {
      return null
    }
    
    return data as GameBettingSplits
  } catch {
    return null
  }
}

function extractPublicBetting(splits: GameBettingSplits) {
  const result = {
    public_ml_home_bet_pct: 0,
    public_ml_home_money_pct: 0,
    public_spread_home_bet_pct: 0,
    public_spread_home_money_pct: 0,
    public_total_over_bet_pct: 0,
    public_total_over_money_pct: 0,
  }
  
  for (const market of splits.BettingMarketSplits) {
    if (market.BettingBetType === 'Moneyline') {
      const homeSplit = market.BettingSplits.find(s => s.BettingOutcomeType === 'Home')
      if (homeSplit) {
        result.public_ml_home_bet_pct = homeSplit.BetPercentage || 0
        result.public_ml_home_money_pct = homeSplit.MoneyPercentage || 0
      }
    } else if (market.BettingBetType === 'Spread') {
      const homeSplit = market.BettingSplits.find(s => s.BettingOutcomeType === 'Home')
      if (homeSplit) {
        result.public_spread_home_bet_pct = homeSplit.BetPercentage || 0
        result.public_spread_home_money_pct = homeSplit.MoneyPercentage || 0
      }
    } else if (market.BettingBetType === 'Total Points') {
      const overSplit = market.BettingSplits.find(s => s.BettingOutcomeType === 'Over')
      if (overSplit) {
        result.public_total_over_bet_pct = overSplit.BetPercentage || 0
        result.public_total_over_money_pct = overSplit.MoneyPercentage || 0
      }
    }
  }
  
  return result
}

export async function GET() {
  if (!SPORTSDATA_IO_SPLITS_KEY) {
    return NextResponse.json({ success: false, error: 'SPORTSDATA_IO_SPLITS_KEY not configured' }, { status: 500 })
  }

  const startTime = Date.now()
  
  try {
    // Get upcoming games that need public betting data (next 7 days)
    const gamesQuery = `
      SELECT 
        g.game_id,
        g.season,
        g.week,
        toString(g.game_date) as game_date,
        g.home_team_id,
        g.away_team_id,
        g.sportsdata_io_score_id,
        ht.abbreviation as home_abbr,
        at.abbreviation as away_abbr
      FROM nfl_games g
      LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nfl'
      WHERE g.game_time >= now() - INTERVAL 1 HOUR
        AND g.game_time <= now() + INTERVAL 7 DAY
      ORDER BY g.game_time ASC
      LIMIT 50
    `
    
    const gamesResult = await clickhouseQuery<{
      game_id: number
      season: number
      week: number
      game_date: string
      home_team_id: number
      away_team_id: number
      sportsdata_io_score_id: number
      home_abbr: string
      away_abbr: string
    }>(gamesQuery)
    
    const games = gamesResult.data || []
    
    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming games found',
        duration_ms: Date.now() - startTime
      })
    }
    
    // For games with ScoreID, fetch betting splits directly
    // For games without ScoreID, we'll need to scan recent ScoreIDs to find matches
    const stats = { updated: 0, skipped: 0, errors: 0 }
    const updates: any[] = []
    
    // Get ScoreID range for current season (approximate)
    // 2025 season ScoreIDs start around 19000+
    const currentSeason = games[0]?.season || 2025
    const baseScoreId = currentSeason === 2025 ? 19000 : 18700
    
    for (const game of games) {
      try {
        let splits: GameBettingSplits | null = null
        let scoreId = game.sportsdata_io_score_id
        
        // If we have a ScoreID, use it directly
        if (scoreId && scoreId > 0) {
          splits = await fetchBettingSplits(scoreId)
        }
        
        // If no ScoreID or no splits found, scan for matching game
        if (!splits && game.home_abbr && game.away_abbr) {
          // Scan a range of ScoreIDs to find the matching game
          for (let id = baseScoreId; id <= baseScoreId + 500; id++) {
            const testSplits = await fetchBettingSplits(id)
            if (testSplits) {
              const homeMatch = normalizeAbbr(testSplits.HomeTeam) === normalizeAbbr(game.home_abbr)
              const awayMatch = normalizeAbbr(testSplits.AwayTeam) === normalizeAbbr(game.away_abbr)
              const dateMatch = testSplits.Date.split('T')[0] === game.game_date
              
              if (homeMatch && awayMatch && dateMatch) {
                splits = testSplits
                scoreId = id
                break
              }
            }
          }
        }
        
        if (splits) {
          const betting = extractPublicBetting(splits)
          
          // Update the game with public betting data
          const updateSql = `
            ALTER TABLE nfl_games UPDATE
              sportsdata_io_score_id = ${scoreId},
              public_ml_home_bet_pct = ${betting.public_ml_home_bet_pct},
              public_ml_home_money_pct = ${betting.public_ml_home_money_pct},
              public_spread_home_bet_pct = ${betting.public_spread_home_bet_pct},
              public_spread_home_money_pct = ${betting.public_spread_home_money_pct},
              public_total_over_bet_pct = ${betting.public_total_over_bet_pct},
              public_total_over_money_pct = ${betting.public_total_over_money_pct},
              public_betting_updated_at = now()
            WHERE game_id = ${game.game_id}
          `
          
          await clickhouseCommand(updateSql)
          stats.updated++
          
          updates.push({
            game_id: game.game_id,
            matchup: `${game.away_abbr} @ ${game.home_abbr}`,
            score_id: scoreId,
            ml_bet: betting.public_ml_home_bet_pct,
            ml_money: betting.public_ml_home_money_pct,
            spread_bet: betting.public_spread_home_bet_pct,
            spread_money: betting.public_spread_home_money_pct,
          })
        } else {
          stats.skipped++
        }
      } catch (error: any) {
        console.error(`Error updating game ${game.game_id}:`, error)
        stats.errors++
      }
    }
    
    return NextResponse.json({
      success: true,
      stats,
      games_checked: games.length,
      updates: updates.slice(0, 10), // Sample of updates
      duration_ms: Date.now() - startTime
    })
    
  } catch (error: any) {
    console.error('Public betting sync error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    }, { status: 500 })
  }
}

