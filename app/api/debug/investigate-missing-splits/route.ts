import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY
  
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'API key not found' }, { status: 500 })
  }
  
  try {
    // Get the Rams @ Seahawks and Bears @ Packers games
    const gamesQuery = `
      SELECT 
        g.game_id,
        g.game_time,
        ht.name as home_team,
        ht.abbreviation as home_abbr,
        at.name as away_team,
        at.abbreviation as away_abbr,
        ng.sportsdata_io_score_id,
        g.public_spread_home_bet_pct,
        g.public_total_over_bet_pct
      FROM games g
      LEFT JOIN teams ht ON g.home_team_id = ht.espn_team_id AND ht.sport = 'nfl'
      LEFT JOIN teams at ON g.away_team_id = at.espn_team_id AND at.sport = 'nfl'
      LEFT JOIN nfl_games ng ON (
        g.home_team_id = ng.home_team_id 
        AND g.away_team_id = ng.away_team_id
        AND toDate(g.game_time) = toDate(ng.game_time)
      )
      WHERE g.sport = 'nfl'
        AND (
          (ht.abbreviation = 'SEA' AND at.abbreviation = 'LAR')
          OR (ht.abbreviation = 'CHI' AND at.abbreviation = 'GB')
        )
      LIMIT 5
    `
    
    const gamesResult = await clickhouseQuery<{
      game_id: string
      game_time: string
      home_team: string
      home_abbr: string
      away_team: string
      away_abbr: string
      sportsdata_io_score_id: number
      public_spread_home_bet_pct: number
      public_total_over_bet_pct: number
    }>(gamesQuery)
    
    const games = gamesResult.data || []
    const results: any[] = []
    
    for (const game of games) {
      const result: any = {
        game: `${game.away_abbr} @ ${game.home_abbr}`,
        gameTime: game.game_time,
        scoreId: game.sportsdata_io_score_id,
        currentSplits: {
          spread: game.public_spread_home_bet_pct,
          total: game.public_total_over_bet_pct
        }
      }
      
      // If no ScoreID, that's the problem
      if (!game.sportsdata_io_score_id || game.sportsdata_io_score_id === 0) {
        result.issue = 'NO_SCORE_ID'
        result.message = 'Game not found in nfl_games table or ScoreID is 0'
        results.push(result)
        continue
      }
      
      // Try fetching splits from SportsDataIO
      try {
        const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${game.sportsdata_io_score_id}?key=${SPORTSDATA_API_KEY}`
        const splitsResponse = await fetch(splitsUrl)
        
        result.apiStatus = splitsResponse.status
        result.apiOk = splitsResponse.ok
        
        if (!splitsResponse.ok) {
          result.issue = 'API_ERROR'
          const errorText = await splitsResponse.text()
          result.apiError = errorText.substring(0, 500)
          results.push(result)
          continue
        }
        
        const splits = await splitsResponse.json()
        result.hasData = !!splits?.BettingMarketSplits
        result.marketCount = splits?.BettingMarketSplits?.length || 0
        
        if (splits?.BettingMarketSplits && splits.BettingMarketSplits.length > 0) {
          // Parse the splits
          const parsedSplits: any = {}
          
          for (const market of splits.BettingMarketSplits) {
            const homeSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
            const overSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Over')
            
            if (market.BettingBetType === 'Spread' && homeSplit) {
              parsedSplits.spread = {
                betPct: homeSplit.BetPercentage,
                moneyPct: homeSplit.MoneyPercentage
              }
            } else if (market.BettingBetType === 'Moneyline' && homeSplit) {
              parsedSplits.moneyline = {
                betPct: homeSplit.BetPercentage,
                moneyPct: homeSplit.MoneyPercentage
              }
            } else if (market.BettingBetType === 'Total Points' && overSplit) {
              parsedSplits.total = {
                betPct: overSplit.BetPercentage,
                moneyPct: overSplit.MoneyPercentage
              }
            }
          }
          
          result.sportsDataIOSplits = parsedSplits
          
          // Check if splits are actually populated
          const hasRealSplits = 
            (parsedSplits.spread?.betPct !== 50 && parsedSplits.spread?.betPct > 0) ||
            (parsedSplits.moneyline?.betPct !== 50 && parsedSplits.moneyline?.betPct > 0) ||
            (parsedSplits.total?.betPct !== 50 && parsedSplits.total?.betPct > 0)
          
          if (hasRealSplits) {
            result.issue = 'DATA_AVAILABLE'
            result.message = '✅ SportsDataIO HAS real data - our sync might be failing to update this game'
          } else {
            result.issue = 'ALL_50_50'
            result.message = 'SportsDataIO returns data but all markets show 50/50'
          }
        } else {
          result.issue = 'NO_MARKETS'
          result.message = 'SportsDataIO returned response but BettingMarketSplits is empty'
        }
        
      } catch (fetchError: any) {
        result.issue = 'FETCH_ERROR'
        result.error = fetchError.message
      }
      
      results.push(result)
    }
    
    return NextResponse.json({
      success: true,
      gamesChecked: results.length,
      results,
      recommendation: results.some(r => r.issue === 'DATA_AVAILABLE')
        ? '🚨 SportsDataIO HAS data for these games! The issue is in our sync logic.'
        : results.some(r => r.issue === 'NO_SCORE_ID')
        ? '🚨 Games are missing ScoreIDs - need to fetch from SportsDataIO schedule API'
        : '⚠️ SportsDataIO genuinely does not have splits data for these games yet'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

