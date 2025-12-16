/**
 * Universal Upcoming Games Sync - ALL SPORTS
 * 
 * Simple logic:
 * 1. Odds API -> Insert/update ALL upcoming games for ALL sports
 * 2. Odds API -> Get upcoming props  
 * 3. SportsDataIO -> Add public betting splits
 * 4. Store everything with timestamps for history
 * 
 * ESPN is ONLY used for box scores after games complete (separate cron)
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const ODDS_API_KEY = process.env.ODDS_API_KEY
const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY

// Sport configurations
const SPORTS_CONFIG = [
  { 
    oddsApiKey: 'americanfootball_nfl', 
    sport: 'nfl',
    table: 'nfl_games',
    sportsDataKey: 'nfl'
  },
  { 
    oddsApiKey: 'basketball_nba', 
    sport: 'nba',
    table: 'nba_games',
    sportsDataKey: 'nba'
  },
  { 
    oddsApiKey: 'icehockey_nhl', 
    sport: 'nhl',
    table: 'nhl_games',
    sportsDataKey: 'nhl'
  },
  { 
    oddsApiKey: 'americanfootball_ncaaf', 
    sport: 'cfb',
    table: 'cfb_games',
    sportsDataKey: 'cfb'
  }
]

interface TeamMapping {
  oddsApiName: string
  teamId: number
  abbreviation: string
}

export async function GET(request: NextRequest) {
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }

  const results: any[] = []
  const startTime = Date.now()

  for (const sportConfig of SPORTS_CONFIG) {
    try {
      console.log(`\n=== Syncing ${sportConfig.sport.toUpperCase()} ===`)
      
      // Step 1: Fetch team mappings from our teams table
      const teamMappings = await getTeamMappings(sportConfig.sport)
      
      // Step 2: Fetch upcoming games from Odds API
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/${sportConfig.oddsApiKey}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals,h2h&oddsFormat=american`
      const oddsResponse = await fetch(oddsUrl)
      
      if (!oddsResponse.ok) {
        throw new Error(`Odds API returned ${oddsResponse.status}`)
      }
      
      const games = await oddsResponse.json()
      console.log(`[${sportConfig.sport}] Found ${games.length} upcoming games in Odds API`)
      
      let gamesInserted = 0
      let gamesUpdated = 0
      
      // Step 3: Insert/update each game
      for (const game of games) {
        const homeTeam = teamMappings.find(t => 
          t.oddsApiName === game.home_team || 
          t.oddsApiName.toLowerCase() === game.home_team.toLowerCase()
        )
        const awayTeam = teamMappings.find(t => 
          t.oddsApiName === game.away_team ||
          t.oddsApiName.toLowerCase() === game.away_team.toLowerCase()
        )
        
        if (!homeTeam || !awayTeam) {
          console.log(`[${sportConfig.sport}] Could not map teams: ${game.away_team} @ ${game.home_team}`)
          continue
        }
        
        const gameTime = new Date(game.commence_time)
        const gameDate = gameTime.toISOString().split('T')[0]
        
        // Get best odds (FanDuel or DraftKings preferred)
        const bookmaker = game.bookmakers?.find((b: any) => b.key === 'fanduel') ||
                          game.bookmakers?.find((b: any) => b.key === 'draftkings') ||
                          game.bookmakers?.[0]
        
        let spread = 0, total = 0, homeML = 0, awayML = 0
        
        if (bookmaker) {
          for (const market of bookmaker.markets || []) {
            if (market.key === 'spreads') {
              const homeOutcome = market.outcomes?.find((o: any) => o.name === game.home_team)
              spread = homeOutcome?.point || 0
            } else if (market.key === 'totals') {
              const overOutcome = market.outcomes?.find((o: any) => o.name === 'Over')
              total = overOutcome?.point || 0
            } else if (market.key === 'h2h') {
              const homeOutcome = market.outcomes?.find((o: any) => o.name === game.home_team)
              const awayOutcome = market.outcomes?.find((o: any) => o.name === game.away_team)
              homeML = homeOutcome?.price || 0
              awayML = awayOutcome?.price || 0
            }
          }
        }
        
        // Generate a consistent game_id from Odds API game_id
        const gameId = generateGameId(game.id, sportConfig.sport)
        
        // Check if game exists
        const existing = await clickhouseQuery(`
          SELECT game_id FROM ${sportConfig.table} WHERE game_id = ${gameId} LIMIT 1
        `)
        
        if (existing.data.length === 0) {
          // Insert new game
          await clickhouseCommand(`
            INSERT INTO ${sportConfig.table} (
              game_id, game_time, game_date, home_team_id, away_team_id,
              spread_open, total_open, home_ml_open, away_ml_open,
              spread_close, total_close, home_ml_close, away_ml_close,
              home_score, away_score, season, week, created_at, updated_at
            ) VALUES (
              ${gameId},
              parseDateTimeBestEffort('${gameTime.toISOString()}'),
              '${gameDate}',
              ${homeTeam.teamId}, ${awayTeam.teamId},
              ${spread}, ${total}, ${homeML}, ${awayML},
              ${spread}, ${total}, ${homeML}, ${awayML},
              0, 0, ${getCurrentSeason(sportConfig.sport)}, 0,
              now(), now()
            )
          `)
          gamesInserted++
          console.log(`[${sportConfig.sport}] ✅ Inserted: ${awayTeam.abbreviation} @ ${homeTeam.abbreviation} on ${gameDate}`)
        } else {
          // Update existing game with latest odds (closing lines)
          await clickhouseCommand(`
            ALTER TABLE ${sportConfig.table} UPDATE
              spread_close = ${spread},
              total_close = ${total},
              home_ml_close = ${homeML},
              away_ml_close = ${awayML},
              updated_at = now()
            WHERE game_id = ${gameId}
          `)
          gamesUpdated++
        }
      }
      
      results.push({
        sport: sportConfig.sport,
        success: true,
        gamesInserted,
        gamesUpdated,
        totalGames: games.length
      })
      
    } catch (error: any) {
      console.error(`[${sportConfig.sport}] Error:`, error.message)
      results.push({
        sport: sportConfig.sport,
        success: false,
        error: error.message
      })
    }
  }
  
  const duration = Date.now() - startTime
  
  return NextResponse.json({
    success: true,
    duration: `${duration}ms`,
    results,
    message: 'Universal sync complete - Odds API used for ALL upcoming games'
  })
}

// Helper: Get team mappings from our teams table
async function getTeamMappings(sport: string): Promise<TeamMapping[]> {
  const query = `
    SELECT team_id, espn_team_id, name, abbreviation 
    FROM teams 
    WHERE sport = '${sport}'
  `
  const result = await clickhouseQuery<{ team_id: number; espn_team_id: number; name: string; abbreviation: string }>(query)
  
  return (result.data || []).map(team => ({
    oddsApiName: team.name,
    teamId: team.espn_team_id, // Use ESPN ID for game tables
    abbreviation: team.abbreviation
  }))
}

// Helper: Generate consistent game_id from Odds API game_id
function generateGameId(oddsApiId: string, sport: string): number {
  // Create a hash from the odds API ID
  let hash = 0
  const str = `${sport}_${oddsApiId}`
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Helper: Get current season for each sport
function getCurrentSeason(sport: string): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12
  
  // NFL/CFB: Sept-Feb = current year, Mar-Aug = next year
  if (sport === 'nfl' || sport === 'cfb') {
    return month >= 9 ? year : year - 1
  }
  
  // NBA/NHL: Oct-Jun = current year, Jul-Sep = next year  
  if (sport === 'nba' || sport === 'nhl') {
    return month >= 10 ? year : year - 1
  }
  
  return year
}

