import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

/**
 * COMPLETE Odds Backfill - Two-Pass Strategy
 * Pass 1: Opening lines (Tuesday 12pm EST of game week)
 * Pass 2: Closing lines (1 hour before kickoff)
 * 
 * This replaces ALL odds data with consistent Odds API data
 */

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd8ba5d45eca27e710d7ef2680d8cb452'
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl'

const NFL_TEAMS: Record<number, string> = {
  22: 'Arizona Cardinals', 1: 'Atlanta Falcons', 33: 'Baltimore Ravens',
  2: 'Buffalo Bills', 29: 'Carolina Panthers', 3: 'Chicago Bears',
  4: 'Cincinnati Bengals', 5: 'Cleveland Browns', 6: 'Dallas Cowboys',
  7: 'Denver Broncos', 8: 'Detroit Lions', 9: 'Green Bay Packers',
  34: 'Houston Texans', 11: 'Indianapolis Colts', 30: 'Jacksonville Jaguars',
  12: 'Kansas City Chiefs', 13: 'Las Vegas Raiders', 24: 'Los Angeles Chargers',
  14: 'Los Angeles Rams', 15: 'Miami Dolphins', 16: 'Minnesota Vikings',
  17: 'New England Patriots', 18: 'New Orleans Saints', 19: 'New York Giants',
  20: 'New York Jets', 21: 'Philadelphia Eagles', 23: 'Pittsburgh Steelers',
  25: 'San Francisco 49ers', 26: 'Seattle Seahawks', 27: 'Tampa Bay Buccaneers',
  10: 'Tennessee Titans', 28: 'Washington Commanders'
}

interface Game {
  game_id: number
  espn_game_id: string
  season: number
  week: number
  game_date: string
  game_time: string
  home_team_id: number
  away_team_id: number
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2024'
  const limit = parseInt(searchParams.get('limit') || '300')
  
  const startTime = Date.now()
  
  try {
    console.log(`[Complete Odds Backfill] Starting for ${season} season`)
    
    // Get ALL games for the season (not just missing ones)
    const gamesResult = await clickhouseQuery(`
      SELECT 
        game_id, espn_game_id, season, week,
        game_date, game_time,
        home_team_id, away_team_id
      FROM nfl_games
      WHERE season = ${season}
      ORDER BY game_time
      LIMIT ${limit}
    `)
    
    const games = gamesResult.data as Game[]
    console.log(`[Complete Odds Backfill] Processing ${games.length} games`)
    
    if (games.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No games found for ${season} season`
      })
    }
    
    let openingLinesFound = 0
    let closingLinesFound = 0
    let gamesFullyUpdated = 0
    let errors = 0
    
    for (const game of games) {
      try {
        const homeTeam = NFL_TEAMS[game.home_team_id]
        const awayTeam = NFL_TEAMS[game.away_team_id]
        
        if (!homeTeam || !awayTeam) {
          errors++
          continue
        }
        
        // IMPORTANT: game_time is stored without timezone, treat as UTC
        const gameTime = new Date(game.game_time.replace(' ', 'T') + 'Z')
        let spreadOpen = 0, totalOpen = 0, homeMLOpen = 0, awayMLOpen = 0
        let spreadClose = 0, totalClose = 0, homeMLClose = 0, awayMLClose = 0
        let provider = ''
        
        // PASS 1: Opening Lines - Tuesday 12pm EST of game week
        try {
          const gameDate = new Date(game.game_date)
          // Find the Tuesday before the game (NFL week starts Tuesday)
          const dayOfWeek = gameDate.getDay() // 0=Sun, 1=Mon, etc
          let daysBack = dayOfWeek === 0 ? 5 : dayOfWeek === 1 ? 6 : dayOfWeek - 2
          const tuesday = new Date(gameDate)
          tuesday.setDate(gameDate.getDate() - daysBack)
          tuesday.setHours(17, 0, 0, 0) // 12pm EST = 5pm UTC
          
          const openingDateParam = tuesday.toISOString().replace(/\.\d{3}Z$/, 'Z')
          
          const openingUrl = `${ODDS_API_BASE}/odds?` +
            `apiKey=${ODDS_API_KEY}&` +
            `date=${openingDateParam}&` +
            `regions=us&` +
            `markets=h2h,spreads,totals&` +
            `oddsFormat=american`
          
          const openingRes = await fetch(openingUrl)
          if (openingRes.ok) {
            const openingData = await openingRes.json()
            const matchingGame = openingData.data?.find((event: any) => {
              return event.home_team === homeTeam && event.away_team === awayTeam
            })
            
            if (matchingGame && matchingGame.bookmakers?.length > 0) {
              // COMPREHENSIVE CASCADE: Collect data from ALL bookmakers
              const preferredBooks = ['FanDuel', 'DraftKings', 'BetMGM', 'Caesars', 'BetRivers']
              
              // Sort bookmakers: preferred first, then others
              const sortedBookmakers = [
                ...preferredBooks.map(name => matchingGame.bookmakers.find((b: any) => b.title === name)).filter(Boolean),
                ...matchingGame.bookmakers.filter((b: any) => !preferredBooks.includes(b.title))
              ]
              
              // Cascade through ALL bookmakers, taking what we need from each
              for (const bm of sortedBookmakers) {
                // SPREADS: Take if we don't have it yet
                if (spreadOpen === 0) {
                  const spreadMarket = bm.markets?.find((m: any) => m.key === 'spreads')
                  const homeSpread = spreadMarket?.outcomes?.find((o: any) => o.name === homeTeam)
                  if (homeSpread?.point !== undefined) {
                    spreadOpen = homeSpread.point
                    if (!provider) provider = bm.title
                  }
                }
                
                // TOTALS: Take if we don't have it yet
                if (totalOpen === 0) {
                  const totalsMarket = bm.markets?.find((m: any) => m.key === 'totals')
                  const overTotal = totalsMarket?.outcomes?.find((o: any) => o.name === 'Over')
                  if (overTotal?.point !== undefined) {
                    totalOpen = overTotal.point
                    if (!provider) provider = bm.title
                  }
                }
                
                // MONEYLINES: Take if we don't have them yet
                if (homeMLOpen === 0 || awayMLOpen === 0) {
                  const h2hMarket = bm.markets?.find((m: any) => m.key === 'h2h')
                  const homeML = h2hMarket?.outcomes?.find((o: any) => o.name === homeTeam)
                  const awayML = h2hMarket?.outcomes?.find((o: any) => o.name === awayTeam)
                  if (homeML?.price && homeMLOpen === 0) homeMLOpen = homeML.price
                  if (awayML?.price && awayMLOpen === 0) awayMLOpen = awayML.price
                  if (!provider) provider = bm.title
                }
                
                // If we have everything, stop cascading
                if (spreadOpen !== 0 && totalOpen !== 0 && homeMLOpen !== 0 && awayMLOpen !== 0) {
                  break
                }
              }
              
              if (spreadOpen !== 0 || totalOpen !== 0) openingLinesFound++
            }
          }
          
          await new Promise(r => setTimeout(r, 500)) // Rate limit
        } catch (err) {
          console.error(`[Opening] Error for game ${game.game_id}:`, (err as any).message)
        }
        
        // PASS 2: Closing Lines - 1 hour before kickoff
        // IMPORTANT: Our game_time is stored without timezone, treat it as UTC
        try {
          // Parse game_time as UTC by appending 'Z'
          const gameTimeUTC = new Date(game.game_time.replace(' ', 'T') + 'Z')
          const oneHourBefore = new Date(gameTimeUTC.getTime() - 1 * 60 * 60 * 1000)
          const minutes = oneHourBefore.getMinutes()
          const roundedMinutes = Math.floor(minutes / 5) * 5
          oneHourBefore.setMinutes(roundedMinutes, 0, 0)
          
          const closingDateParam = oneHourBefore.toISOString().replace(/\.\d{3}Z$/, 'Z')
          
          const closingUrl = `${ODDS_API_BASE}/odds?` +
            `apiKey=${ODDS_API_KEY}&` +
            `date=${closingDateParam}&` +
            `regions=us&` +
            `markets=h2h,spreads,totals&` +
            `oddsFormat=american`
          
          const closingRes = await fetch(closingUrl)
          if (closingRes.ok) {
            const closingData = await closingRes.json()
            const matchingGame = closingData.data?.find((event: any) => {
              const eventDate = new Date(event.commence_time)
              const timeDiff = Math.abs(eventDate.getTime() - gameTime.getTime())
              return event.home_team === homeTeam && 
                     event.away_team === awayTeam && 
                     timeDiff < 4 * 60 * 60 * 1000
            })
            
            if (matchingGame && matchingGame.bookmakers?.length > 0) {
              // COMPREHENSIVE CASCADE: Collect data from ALL bookmakers
              // Priority order for preferred books
              const preferredBooks = ['FanDuel', 'DraftKings', 'BetMGM', 'Caesars', 'BetRivers']
              
              // Sort bookmakers: preferred first, then others
              const sortedBookmakers = [
                ...preferredBooks.map(name => matchingGame.bookmakers.find((b: any) => b.title === name)).filter(Boolean),
                ...matchingGame.bookmakers.filter((b: any) => !preferredBooks.includes(b.title))
              ]
              
              // Cascade through ALL bookmakers, taking what we need from each
              for (const bm of sortedBookmakers) {
                // SPREADS: Take if we don't have it yet
                if (spreadClose === 0) {
                  const spreadMarket = bm.markets?.find((m: any) => m.key === 'spreads')
                  const homeSpread = spreadMarket?.outcomes?.find((o: any) => o.name === homeTeam)
                  if (homeSpread?.point !== undefined) {
                    spreadClose = homeSpread.point
                    if (!provider) provider = bm.title
                  }
                }
                
                // TOTALS: Take if we don't have it yet
                if (totalClose === 0) {
                  const totalsMarket = bm.markets?.find((m: any) => m.key === 'totals')
                  const overTotal = totalsMarket?.outcomes?.find((o: any) => o.name === 'Over')
                  if (overTotal?.point !== undefined) {
                    totalClose = overTotal.point
                    if (!provider) provider = bm.title
                  }
                }
                
                // MONEYLINES: Take if we don't have them yet
                if (homeMLClose === 0 || awayMLClose === 0) {
                  const h2hMarket = bm.markets?.find((m: any) => m.key === 'h2h')
                  const homeML = h2hMarket?.outcomes?.find((o: any) => o.name === homeTeam)
                  const awayML = h2hMarket?.outcomes?.find((o: any) => o.name === awayTeam)
                  if (homeML?.price && homeMLClose === 0) homeMLClose = homeML.price
                  if (awayML?.price && awayMLClose === 0) awayMLClose = awayML.price
                  if (!provider) provider = bm.title
                }
                
                // If we have everything, stop cascading
                if (spreadClose !== 0 && totalClose !== 0 && homeMLClose !== 0 && awayMLClose !== 0) {
                  break
                }
              }
              
              if (spreadClose !== 0 || totalClose !== 0) closingLinesFound++
            }
          }
          
          await new Promise(r => setTimeout(r, 500)) // Rate limit
        } catch (err) {
          console.error(`[Closing] Error for game ${game.game_id}:`, (err as any).message)
        }
        
        // Update the game with whatever data we found
        if (spreadOpen !== 0 || spreadClose !== 0 || totalOpen !== 0 || totalClose !== 0) {
          await clickhouseCommand(`
            ALTER TABLE nfl_games 
            UPDATE 
              spread_open = ${spreadOpen},
              spread_close = ${spreadClose},
              total_open = ${totalOpen},
              total_close = ${totalClose},
              home_ml_open = ${homeMLOpen},
              home_ml_close = ${homeMLClose},
              away_ml_open = ${awayMLOpen},
              away_ml_close = ${awayMLClose},
              odds_provider_name = '${provider.replace(/'/g, "''") || 'The Odds API'}'
            WHERE game_id = ${game.game_id}
          `)
          
          if (spreadOpen !== 0 && spreadClose !== 0) gamesFullyUpdated++
        }
        
        if (gamesFullyUpdated % 20 === 0 && gamesFullyUpdated > 0) {
          console.log(`[Complete Odds Backfill] Progress: ${gamesFullyUpdated} games fully updated...`)
        }
        
      } catch (err: any) {
        console.error(`[Complete Odds Backfill] Error for game ${game.game_id}:`, err.message)
        errors++
      }
    }
    
    const duration = (Date.now() - startTime) / 1000
    
    return NextResponse.json({
      success: true,
      season,
      games_processed: games.length,
      opening_lines_found: openingLinesFound,
      closing_lines_found: closingLinesFound,
      games_fully_updated: gamesFullyUpdated,
      errors,
      duration_seconds: duration
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

