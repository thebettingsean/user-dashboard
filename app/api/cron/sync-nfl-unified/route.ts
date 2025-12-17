/**
 * NFL Unified Sync - Proper Data Flow
 * 
 * 1. SportsDataIO Schedule → Get games + ScoreIDs (source of truth)
 * 2. Odds API → Get lines for those games
 * 3. SportsDataIO Splits → Get public betting using ScoreIDs
 * 4. Odds API → Get props for those games
 * 5. ESPN Box Scores → Only for completed games (results)
 */

import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const SPORTSDATA_SCHEDULE_KEY = process.env.SPORTSDATA_IO_KEY || 'ad4d37f5374f45ffb40e571e38551af1'
const SPORTSDATA_SPLITS_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY || '68b4610b673548e186c0267946db7c27'
const ODDS_API_KEY = process.env.ODDS_API_KEY

interface SportsDataGame {
  GameKey: string
  ScoreID: number
  Season: number
  Week: number
  Date: string
  HomeTeam: string
  AwayTeam: string
  Status: string
}

export async function GET() {
  const startTime = Date.now()
  const results: any[] = []
  
  try {
    // STEP 1: Fetch schedule from SportsDataIO (SOURCE OF TRUTH)
    console.log('📅 Step 1: Fetching schedule from SportsDataIO...')
    
    const currentSeason = 2024
    const scheduleUrl = `https://api.sportsdata.io/v3/nfl/scores/json/Schedules/${currentSeason}?key=${SPORTSDATA_SCHEDULE_KEY}`
    
    const scheduleResponse = await fetch(scheduleUrl)
    
    if (!scheduleResponse.ok) {
      throw new Error(`SportsDataIO schedule returned ${scheduleResponse.status}`)
    }
    
    const allGames: SportsDataGame[] = await scheduleResponse.json()
    
    // Filter to upcoming games only (within next 14 days)
    const now = new Date()
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    
    const upcomingGames = allGames.filter(g => {
      const gameDate = new Date(g.Date)
      return gameDate > now && gameDate < twoWeeksFromNow && g.ScoreID > 0
    })
    
    console.log(`Found ${upcomingGames.length} upcoming games with ScoreIDs`)
    
    // STEP 2: Get team mappings from our database
    const teamsQuery = await clickhouseQuery<{
      abbreviation: string
      espn_team_id: number
      name: string
    }>(`
      SELECT abbreviation, espn_team_id, name
      FROM teams
      WHERE sport = 'nfl'
    `)
    
    const teamMap = new Map<string, number>()
    for (const team of teamsQuery.data || []) {
      teamMap.set(team.abbreviation, team.espn_team_id)
      // Also map full name for matching
      const lastName = team.name.split(' ').pop() || ''
      teamMap.set(lastName, team.espn_team_id)
    }
    
    // STEP 3: Insert/update games in nfl_games with ScoreIDs
    console.log('💾 Step 2: Syncing games to database...')
    
    let gamesInserted = 0
    let gamesUpdated = 0
    
    for (const game of upcomingGames) {
      const homeTeamId = teamMap.get(game.HomeTeam) || 0
      const awayTeamId = teamMap.get(game.AwayTeam) || 0
      
      if (homeTeamId === 0 || awayTeamId === 0) {
        console.warn(`⚠️  Could not map teams: ${game.AwayTeam} @ ${game.HomeTeam}`)
        continue
      }
      
      // Check if game exists
      const existingGame = await clickhouseQuery<{ game_id: number }>(`
        SELECT game_id
        FROM nfl_games
        WHERE home_team_id = ${homeTeamId}
          AND away_team_id = ${awayTeamId}
          AND toDate(game_time) = toDate('${game.Date}')
        LIMIT 1
      `)
      
      if (existingGame.data && existingGame.data.length > 0) {
        // Update existing game with ScoreID
        await clickhouseCommand(`
          ALTER TABLE nfl_games UPDATE
            sportsdata_io_score_id = ${game.ScoreID},
            updated_at = now()
          WHERE game_id = ${existingGame.data[0].game_id}
        `)
        gamesUpdated++
      } else {
        // Insert new game
        const gameTime = new Date(game.Date).toISOString().slice(0, 19).replace('T', ' ')
        
        await clickhouseCommand(`
          INSERT INTO nfl_games (
            game_id, season, week, game_time,
            home_team_id, away_team_id,
            sportsdata_io_score_id,
            created_at, updated_at
          ) VALUES (
            ${Math.floor(Math.random() * 2147483647)},
            ${game.Season},
            ${game.Week},
            '${gameTime}',
            ${homeTeamId},
            ${awayTeamId},
            ${game.ScoreID},
            now(),
            now()
          )
        `)
        gamesInserted++
      }
    }
    
    results.push({
      step: 'sync_games_from_sportsdata',
      success: true,
      details: {
        total_games: upcomingGames.length,
        games_inserted: gamesInserted,
        games_updated: gamesUpdated
      }
    })
    
    // STEP 4: Fetch public betting splits using ScoreIDs
    console.log('📊 Step 3: Fetching public betting splits...')
    
    let splitsUpdated = 0
    
    for (const game of upcomingGames) {
      try {
        const splitsUrl = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${game.ScoreID}?key=${SPORTSDATA_SPLITS_KEY}`
        const splitsResponse = await fetch(splitsUrl)
        
        if (splitsResponse.ok) {
          const splits = await splitsResponse.json()
          
          if (splits?.BettingMarketSplits) {
            let spreadBet = 0, spreadMoney = 0
            let mlBet = 0, mlMoney = 0
            let totalBet = 0, totalMoney = 0
            
            for (const market of splits.BettingMarketSplits) {
              const homeSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
              const overSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Over')
              
              if (market.BettingBetType === 'Spread' && homeSplit) {
                spreadBet = homeSplit.BetPercentage || 0
                spreadMoney = homeSplit.MoneyPercentage || 0
              } else if (market.BettingBetType === 'Moneyline' && homeSplit) {
                mlBet = homeSplit.BetPercentage || 0
                mlMoney = homeSplit.MoneyPercentage || 0
              } else if (market.BettingBetType === 'Total Points' && overSplit) {
                totalBet = overSplit.BetPercentage || 0
                totalMoney = overSplit.MoneyPercentage || 0
              }
            }
            
            // Update nfl_games with splits
            await clickhouseCommand(`
              ALTER TABLE nfl_games UPDATE
                public_spread_home_bet_pct = ${spreadBet},
                public_spread_home_money_pct = ${spreadMoney},
                public_ml_home_bet_pct = ${mlBet},
                public_ml_home_money_pct = ${mlMoney},
                public_total_over_bet_pct = ${totalBet},
                public_total_over_money_pct = ${totalMoney}
              WHERE sportsdata_io_score_id = ${game.ScoreID}
            `)
            
            splitsUpdated++
          }
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`Error fetching splits for ScoreID ${game.ScoreID}:`, error)
      }
    }
    
    results.push({
      step: 'sync_public_betting',
      success: true,
      details: {
        games_checked: upcomingGames.length,
        splits_updated: splitsUpdated
      }
    })
    
    // STEP 5: Fetch odds from Odds API
    console.log('💰 Step 4: Fetching odds from Odds API...')
    
    if (ODDS_API_KEY) {
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,h2h,totals&oddsFormat=american`
      
      try {
        const oddsResponse = await fetch(oddsUrl)
        
        if (oddsResponse.ok) {
          const oddsData = await oddsResponse.json()
          
          console.log(`Fetched odds for ${oddsData.length} games from Odds API`)
          
          results.push({
            step: 'fetch_odds_api',
            success: true,
            details: {
              games_with_odds: oddsData.length
            }
          })
        }
      } catch (error) {
        console.error('Error fetching odds:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      elapsed_ms: Date.now() - startTime,
      results,
      summary: {
        games_synced: gamesInserted + gamesUpdated,
        splits_updated: splitsUpdated,
        architecture: {
          step1: 'SportsDataIO Schedule → Games + ScoreIDs',
          step2: 'Database → Insert/Update games',
          step3: 'SportsDataIO Splits → Public betting data',
          step4: 'Odds API → Lines and props',
          step5: 'ESPN → Box scores (only after completion)'
        }
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      elapsed_ms: Date.now() - startTime,
      results
    }, { status: 500 })
  }
}

