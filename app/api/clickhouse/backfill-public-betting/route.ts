import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

const SPORTSDATA_IO_SPLITS_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY || '68b4610b673548e186c0267946db7c27'

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


async function fetchBettingSplits(scoreId: number): Promise<GameBettingSplits | null> {
  try {
    const response = await fetch(
      `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_IO_SPLITS_KEY}`
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    // Check if it's an error response or empty
    if (data.HttpStatusCode || !data.BettingMarketSplits || data.BettingMarketSplits.length === 0) {
      return null
    }
    
    return data as GameBettingSplits
  } catch (error) {
    return null
  }
}

function extractPublicBetting(splits: GameBettingSplits) {
  let mlHomeBetPct = 0, mlHomeMoneyPct = 0
  let spreadHomeBetPct = 0, spreadHomeMoneyPct = 0
  let totalOverBetPct = 0, totalOverMoneyPct = 0
  
  for (const market of splits.BettingMarketSplits) {
    if (market.BettingBetType === 'Moneyline') {
      const homeSplit = market.BettingSplits.find(s => s.BettingOutcomeType === 'Home')
      if (homeSplit) {
        mlHomeBetPct = homeSplit.BetPercentage
        mlHomeMoneyPct = homeSplit.MoneyPercentage
      }
    }
    
    if (market.BettingBetType === 'Spread') {
      const homeSplit = market.BettingSplits.find(s => s.BettingOutcomeType === 'Home')
      if (homeSplit) {
        spreadHomeBetPct = homeSplit.BetPercentage
        spreadHomeMoneyPct = homeSplit.MoneyPercentage
      }
    }
    
    if (market.BettingBetType === 'Total Points') {
      const overSplit = market.BettingSplits.find(s => s.BettingOutcomeType === 'Over')
      if (overSplit) {
        totalOverBetPct = overSplit.BetPercentage
        totalOverMoneyPct = overSplit.MoneyPercentage
      }
    }
  }
  
  return {
    mlHomeBetPct,
    mlHomeMoneyPct,
    spreadHomeBetPct,
    spreadHomeMoneyPct,
    totalOverBetPct,
    totalOverMoneyPct
  }
}

// Team abbreviation mapping (SportsDataIO uses different abbrevs sometimes)
const TEAM_ABBREV_MAP: Record<string, string[]> = {
  'ARI': ['ARI', 'ARZ', 'Arizona'],
  'ATL': ['ATL', 'Atlanta'],
  'BAL': ['BAL', 'Baltimore'],
  'BUF': ['BUF', 'Buffalo'],
  'CAR': ['CAR', 'Carolina'],
  'CHI': ['CHI', 'Chicago'],
  'CIN': ['CIN', 'Cincinnati'],
  'CLE': ['CLE', 'Cleveland'],
  'DAL': ['DAL', 'Dallas'],
  'DEN': ['DEN', 'Denver'],
  'DET': ['DET', 'Detroit'],
  'GB': ['GB', 'GNB', 'Green Bay'],
  'HOU': ['HOU', 'Houston'],
  'IND': ['IND', 'Indianapolis'],
  'JAX': ['JAX', 'JAC', 'Jacksonville'],
  'KC': ['KC', 'KAN', 'Kansas City'],
  'LV': ['LV', 'LVR', 'OAK', 'Las Vegas', 'Oakland'],
  'LAC': ['LAC', 'SD', 'Los Angeles Chargers', 'San Diego'],
  'LAR': ['LAR', 'LA', 'STL', 'Los Angeles Rams', 'St. Louis'],
  'MIA': ['MIA', 'Miami'],
  'MIN': ['MIN', 'Minnesota'],
  'NE': ['NE', 'NEP', 'New England'],
  'NO': ['NO', 'NOR', 'New Orleans'],
  'NYG': ['NYG', 'New York Giants'],
  'NYJ': ['NYJ', 'New York Jets'],
  'PHI': ['PHI', 'Philadelphia'],
  'PIT': ['PIT', 'Pittsburgh'],
  'SEA': ['SEA', 'Seattle'],
  'SF': ['SF', 'SFO', 'San Francisco'],
  'TB': ['TB', 'TBB', 'Tampa Bay'],
  'TEN': ['TEN', 'Tennessee'],
  'WAS': ['WAS', 'WSH', 'Washington']
}

function normalizeTeam(team: string): string {
  const upper = team.toUpperCase()
  for (const [standard, variants] of Object.entries(TEAM_ABBREV_MAP)) {
    if (variants.some(v => v.toUpperCase() === upper)) {
      return standard
    }
  }
  return upper
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const startId = parseInt(searchParams.get('startId') || '17500')
  const endId = parseInt(searchParams.get('endId') || '19400')
  const batchSize = parseInt(searchParams.get('batchSize') || '50')
  const dryRun = searchParams.get('dryRun') === 'true'
  
  try {
    console.log(`🏈 Backfilling public betting data from ScoreID ${startId} to ${endId}...`)
    
    const stats = {
      scanned: 0,
      withSplits: 0,
      matched: 0,
      updated: 0,
      noMatch: 0,
      errors: 0
    }
    
    const matchedGames: any[] = []
    const unmatchedGames: any[] = []
    
    // Process in batches
    for (let batchStart = startId; batchStart <= endId; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize - 1, endId)
      console.log(`📊 Processing ScoreIDs ${batchStart}-${batchEnd}...`)
      
      // Fetch all splits in this batch concurrently
      const promises = []
      for (let scoreId = batchStart; scoreId <= batchEnd; scoreId++) {
        promises.push(fetchBettingSplits(scoreId))
      }
      
      const results = await Promise.all(promises)
      
      for (let i = 0; i < results.length; i++) {
        const splits = results[i]
        stats.scanned++
        
        if (!splits) continue
        stats.withSplits++
        
        const publicBetting = extractPublicBetting(splits)
        const gameDate = splits.Date.split('T')[0]
        const homeTeam = normalizeTeam(splits.HomeTeam)
        const awayTeam = normalizeTeam(splits.AwayTeam)
        
        // Try to find matching game in ClickHouse (nfl_games table)
        // Join with teams to match by abbreviation
        // Use a 2-day window to handle timezone differences (TNF/MNF games)
        const matchQuery = `
          SELECT 
            g.game_id, 
            g.home_team_id, 
            g.away_team_id, 
            g.game_date,
            g.season,
            g.week,
            ht.abbreviation as home_abbrev,
            at.abbreviation as away_abbrev
          FROM nfl_games g
          LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = 'nfl'
          LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = 'nfl'
          WHERE g.game_date >= date_sub(day, 1, toDate('${gameDate}'))
            AND g.game_date <= date_add(day, 1, toDate('${gameDate}'))
          LIMIT 100
        `
        
        try {
          const result = await clickhouseQuery(matchQuery)
          const games = result.data
          
          // Match by team abbreviations
          const matchedGame = games.find((g: any) => {
            const homeMatch = normalizeTeam(g.home_abbrev || '') === homeTeam
            const awayMatch = normalizeTeam(g.away_abbrev || '') === awayTeam
            return homeMatch && awayMatch
          })
          
          if (matchedGame) {
            stats.matched++
            matchedGames.push({
              scoreId: splits.ScoreId,
              gameId: matchedGame.game_id,
              season: splits.Season,
              week: splits.Week,
              date: gameDate,
              matchup: `${awayTeam} @ ${homeTeam}`,
              ...publicBetting
            })
            
            if (!dryRun) {
              // Update the game with public betting data
              const updateQuery = `
                ALTER TABLE nfl_games UPDATE
                  sportsdata_io_score_id = ${splits.ScoreId},
                  public_ml_home_bet_pct = ${publicBetting.mlHomeBetPct},
                  public_ml_home_money_pct = ${publicBetting.mlHomeMoneyPct},
                  public_spread_home_bet_pct = ${publicBetting.spreadHomeBetPct},
                  public_spread_home_money_pct = ${publicBetting.spreadHomeMoneyPct},
                  public_total_over_bet_pct = ${publicBetting.totalOverBetPct},
                  public_total_over_money_pct = ${publicBetting.totalOverMoneyPct},
                  public_betting_updated_at = now()
                WHERE game_id = ${matchedGame.game_id}
              `
              await clickhouseCommand(updateQuery)
              stats.updated++
            }
          } else {
            stats.noMatch++
            unmatchedGames.push({
              scoreId: splits.ScoreId,
              season: splits.Season,
              week: splits.Week,
              date: gameDate,
              matchup: `${awayTeam} @ ${homeTeam}`
            })
          }
        } catch (error: any) {
          stats.errors++
          console.error(`Error matching game ${splits.ScoreId}:`, error.message)
        }
      }
      
      // Small delay between batches to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return NextResponse.json({
      success: true,
      dryRun,
      stats,
      matchedGames: matchedGames.slice(0, 20), // Sample
      unmatchedGames: unmatchedGames.slice(0, 10) // Sample
    })
    
  } catch (error: any) {
    console.error('Backfill error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

