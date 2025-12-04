import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * Backfill Historical Odds Data using The Odds API
 * https://the-odds-api.com/historical-odds-data/
 */

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd8ba5d45eca27e710d7ef2680d8cb452'
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl'

// ESPN team ID to team name mapping for matching
const NFL_TEAMS: Record<number, string> = {
  22: 'Arizona Cardinals',
  1: 'Atlanta Falcons',
  33: 'Baltimore Ravens',
  2: 'Buffalo Bills',
  29: 'Carolina Panthers',
  3: 'Chicago Bears',
  4: 'Cincinnati Bengals',
  5: 'Cleveland Browns',
  6: 'Dallas Cowboys',
  7: 'Denver Broncos',
  8: 'Detroit Lions',
  9: 'Green Bay Packers',
  34: 'Houston Texans',
  11: 'Indianapolis Colts',
  30: 'Jacksonville Jaguars',
  12: 'Kansas City Chiefs',
  13: 'Las Vegas Raiders',
  24: 'Los Angeles Chargers',
  14: 'Los Angeles Rams',
  15: 'Miami Dolphins',
  16: 'Minnesota Vikings',
  17: 'New England Patriots',
  18: 'New Orleans Saints',
  19: 'New York Giants',
  20: 'New York Jets',
  21: 'Philadelphia Eagles',
  23: 'Pittsburgh Steelers',
  25: 'San Francisco 49ers',
  26: 'Seattle Seahawks',
  27: 'Tampa Bay Buccaneers',
  10: 'Tennessee Titans',
  28: 'Washington Commanders'
}

interface Game {
  game_id: number
  espn_game_id: string
  game_date: string
  game_time: string
  home_team_id: number
  away_team_id: number
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2022'
  const limit = parseInt(searchParams.get('limit') || '50')
  const dryRun = searchParams.get('dryRun') === 'true'
  
  const startTime = Date.now()
  
  try {
    console.log(`[Odds Backfill] Starting for ${season} season (limit: ${limit})`)
    
    // Get games without odds data
    const gamesResult = await clickhouseQuery(`
      SELECT 
        game_id, 
        espn_game_id, 
        game_date, 
        game_time,
        home_team_id, 
        away_team_id
      FROM nfl_games
      WHERE season = ${season}
        AND (spread_open = 0 OR total_open = 0)
      ORDER BY game_time
      LIMIT ${limit}
    `)
    
    const games = gamesResult.data as Game[]
    console.log(`[Odds Backfill] Found ${games.length} games to backfill`)
    
    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No games need odds backfill for ${season} season`
      })
    }
    
    let updated = 0
    let notFound = 0
    let errors = 0
    const errorDetails: string[] = []
    
    for (const game of games) {
      try {
        const homeTeam = NFL_TEAMS[game.home_team_id]
        const awayTeam = NFL_TEAMS[game.away_team_id]
        
        if (!homeTeam || !awayTeam) {
          console.log(`[Odds Backfill] Unknown team IDs: ${game.home_team_id} / ${game.away_team_id}`)
          errors++
          continue
        }
        
        // Query The Odds API 1 hour before kickoff (better snapshot availability)
        // Important: API requires format without milliseconds (e.g., 'Z' not '.000Z')
        const gameTime = new Date(game.game_time)
        const oneHourBefore = new Date(gameTime.getTime() - 1 * 60 * 60 * 1000)
        
        // Round to nearest 5-minute interval for valid snapshot
        const minutes = oneHourBefore.getMinutes()
        const roundedMinutes = Math.floor(minutes / 5) * 5
        oneHourBefore.setMinutes(roundedMinutes)
        oneHourBefore.setSeconds(0)
        oneHourBefore.setMilliseconds(0)
        
        const dateParam = oneHourBefore.toISOString().replace(/\.\d{3}Z$/, 'Z') // Remove milliseconds
        
        console.log(`[Odds Backfill] Fetching odds for ${awayTeam} @ ${homeTeam} (${game.game_time})`)
        
        const oddsUrl = `${ODDS_API_BASE}/odds?` + 
          `apiKey=${ODDS_API_KEY}&` +
          `date=${dateParam}&` +
          `regions=us&` +
          `markets=h2h,spreads,totals&` +
          `oddsFormat=american`
        
        const response = await fetch(oddsUrl)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Odds Backfill] API error ${response.status}:`, errorText)
          errors++
          await new Promise(r => setTimeout(r, 1000)) // Rate limit
          continue
        }
        
        const oddsData = await response.json()
        console.log(`[Odds Backfill] API returned ${oddsData.data?.length || 0} events for date ${dateParam}`)
        
        // Find the matching game in the response
        // Match by teams and ensure commence time is within 4 hours of our game time
        const matchingGame = oddsData.data?.find((event: any) => {
          const eventDate = new Date(event.commence_time)
          const timeDiff = Math.abs(eventDate.getTime() - gameTime.getTime())
          const within4Hours = timeDiff < 4 * 60 * 60 * 1000
          
          return event.home_team === homeTeam && 
                 event.away_team === awayTeam && 
                 within4Hours
        })
        
        if (!matchingGame) {
          console.log(`[Odds Backfill] No odds found for ${awayTeam} @ ${homeTeam}`)
          notFound++
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
        
        // Extract odds from first available bookmaker
        const bookmaker = matchingGame.bookmakers?.[0]
        if (!bookmaker) {
          notFound++
          continue
        }
        
        // Extract spread
        const spreadMarket = bookmaker.markets?.find((m: any) => m.key === 'spreads')
        const homeSpread = spreadMarket?.outcomes?.find((o: any) => o.name === homeTeam)
        const awaySpread = spreadMarket?.outcomes?.find((o: any) => o.name === awayTeam)
        
        // Extract totals
        const totalsMarket = bookmaker.markets?.find((m: any) => m.key === 'totals')
        const overOutcome = totalsMarket?.outcomes?.find((o: any) => o.name === 'Over')
        
        // Extract moneylines
        const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h')
        const homeMl = h2hMarket?.outcomes?.find((o: any) => o.name === homeTeam)
        const awayMl = h2hMarket?.outcomes?.find((o: any) => o.name === awayTeam)
        
        if (dryRun) {
          console.log(`[Odds Backfill] DRY RUN - Would update game ${game.game_id}:`)
          console.log(`  Spread: ${homeSpread?.point || 0} (${homeSpread?.price || 0})`)
          console.log(`  Total: ${overOutcome?.point || 0}`)
          console.log(`  ML: Home ${homeMl?.price || 0}, Away ${awayMl?.price || 0}`)
          updated++
          continue
        }
        
        // Update the game with odds data
        await clickhouseCommand(`
          ALTER TABLE nfl_games 
          UPDATE 
            spread_open = ${homeSpread?.point || 0},
            total_open = ${overOutcome?.point || 0},
            home_ml_open = ${homeMl?.price || 0},
            away_ml_open = ${awayMl?.price || 0},
            odds_provider_name = '${bookmaker.title.replace(/'/g, "''")}'
          WHERE game_id = ${game.game_id}
        `)
        
        updated++
        console.log(`[Odds Backfill] ✓ Updated game ${game.game_id}`)
        
        // Rate limit: 1 request per second
        await new Promise(r => setTimeout(r, 1000))
        
      } catch (err: any) {
        const errorMsg = `Game ${game.game_id}: ${err.message}`
        console.error(`[Odds Backfill]`, errorMsg)
        errorDetails.push(errorMsg)
        errors++
      }
    }
    
    const duration = (Date.now() - startTime) / 1000
    
    return NextResponse.json({
      success: true,
      season,
      games_processed: games.length,
      updated,
      not_found: notFound,
      errors,
      error_details: errorDetails.slice(0, 5), // First 5 errors
      duration_seconds: duration,
      dry_run: dryRun,
      estimated_api_cost: games.length * 3 * 10 // 3 markets * 10 requests per market
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

