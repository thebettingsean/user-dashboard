import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd8ba5d45eca27e710d7ef2680d8cb452'
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl'

const NFL_TEAMS: Record<number, string> = {
  12: 'Kansas City Chiefs',
  33: 'Baltimore Ravens'
}

/**
 * Debug why closing lines aren't being captured
 * Test with Ravens @ Chiefs Week 1 2024
 */
export async function GET() {
  try {
    // Get the specific game
    const result = await clickhouseQuery(`
      SELECT game_id, game_time, home_team_id, away_team_id, 
             spread_open, spread_close, total_open, total_close
      FROM nfl_games
      WHERE season = 2024 AND week = 1 
        AND home_team_id = 12 AND away_team_id = 33
      LIMIT 1
    `)
    
    const game = result.data?.[0]
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    const homeTeam = NFL_TEAMS[game.home_team_id]
    const awayTeam = NFL_TEAMS[game.away_team_id]
    const gameTime = new Date(game.game_time)
    
    // Calculate 1 hour before with rounding
    const oneHourBefore = new Date(gameTime.getTime() - 1 * 60 * 60 * 1000)
    const minutes = oneHourBefore.getMinutes()
    const roundedMinutes = Math.floor(minutes / 5) * 5
    oneHourBefore.setMinutes(roundedMinutes, 0, 0)
    const closingDateParam = oneHourBefore.toISOString().replace(/\.\d{3}Z$/, 'Z')
    
    // Query Odds API
    const url = `${ODDS_API_BASE}/odds?` +
      `apiKey=${ODDS_API_KEY}&` +
      `date=${closingDateParam}&` +
      `regions=us&` +
      `markets=h2h,spreads,totals&` +
      `oddsFormat=american`
    
    const response = await fetch(url)
    const oddsData = await response.json()
    
    // Try to find the game
    const matchingGame = oddsData.data?.find((event: any) => {
      const eventDate = new Date(event.commence_time)
      const timeDiff = Math.abs(eventDate.getTime() - gameTime.getTime())
      const within4Hours = timeDiff < 4 * 60 * 60 * 1000
      
      return event.home_team === homeTeam && 
             event.away_team === awayTeam && 
             within4Hours
    })
    
    return NextResponse.json({
      database_game: {
        game_time: game.game_time,
        home_team: homeTeam,
        away_team: awayTeam,
        current_spread_open: game.spread_open,
        current_spread_close: game.spread_close,
        current_total_open: game.total_open,
        current_total_close: game.total_close
      },
      our_query: {
        game_time_parsed: gameTime.toISOString(),
        one_hour_before_raw: new Date(gameTime.getTime() - 60*60*1000).toISOString(),
        one_hour_before_rounded: closingDateParam,
        url: url.replace(ODDS_API_KEY, 'HIDDEN')
      },
      odds_api_response: {
        timestamp: oddsData.timestamp,
        total_events: oddsData.data?.length || 0,
        matching_game_found: !!matchingGame
      },
      matching_game: matchingGame ? {
        home_team: matchingGame.home_team,
        away_team: matchingGame.away_team,
        commence_time: matchingGame.commence_time,
        bookmakers: matchingGame.bookmakers?.length,
        sample_spread: matchingGame.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads')?.outcomes?.[0],
        sample_total: matchingGame.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'totals')?.outcomes?.[0]
      } : null,
      all_games_sample: oddsData.data?.slice(0, 5).map((e: any) => ({
        home: e.home_team,
        away: e.away_team,
        time: e.commence_time
      }))
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

