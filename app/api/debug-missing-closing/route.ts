import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd8ba5d45eca27e710d7ef2680d8cb452'
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl'

const NFL_TEAMS: Record<number, string> = {
  1: 'Atlanta Falcons', 2: 'Buffalo Bills', 3: 'Chicago Bears', 4: 'Cincinnati Bengals',
  5: 'Cleveland Browns', 6: 'Dallas Cowboys', 7: 'Denver Broncos', 8: 'Detroit Lions',
  9: 'Green Bay Packers', 10: 'Tennessee Titans', 11: 'Indianapolis Colts', 12: 'Kansas City Chiefs',
  13: 'Las Vegas Raiders', 14: 'Los Angeles Rams', 15: 'Miami Dolphins', 16: 'Minnesota Vikings',
  17: 'New England Patriots', 18: 'New Orleans Saints', 19: 'New York Giants', 20: 'New York Jets',
  21: 'Philadelphia Eagles', 22: 'Arizona Cardinals', 23: 'Pittsburgh Steelers', 24: 'Los Angeles Chargers',
  25: 'San Francisco 49ers', 26: 'Seattle Seahawks', 27: 'Tampa Bay Buccaneers', 28: 'Washington Commanders',
  29: 'Carolina Panthers', 30: 'Jacksonville Jaguars', 33: 'Baltimore Ravens', 34: 'Houston Texans'
}

/**
 * Debug: Find a game with opening but NO closing, check if Odds API has it
 */
export async function GET() {
  try {
    // Find a 2024 game with opening but no closing
    const result = await clickhouseQuery(`
      SELECT game_id, game_time, home_team_id, away_team_id, 
             spread_open, spread_close, total_open, total_close
      FROM nfl_games
      WHERE season = 2024 
        AND spread_open != 0 
        AND spread_close = 0
      LIMIT 1
    `)
    
    const game = result.data?.[0]
    if (!game) {
      return NextResponse.json({ error: 'No games found with this criteria' }, { status: 404 })
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
      return event.home_team === homeTeam && 
             event.away_team === awayTeam && 
             timeDiff < 4 * 60 * 60 * 1000
    })
    
    return NextResponse.json({
      game_info: {
        game_id: game.game_id,
        game_time: game.game_time,
        matchup: `${awayTeam} @ ${homeTeam}`,
        has_opening: game.spread_open !== 0,
        has_closing: game.spread_close !== 0
      },
      our_query: {
        query_time: closingDateParam,
        url: url.replace(ODDS_API_KEY, 'HIDDEN')
      },
      odds_api: {
        snapshot_time: oddsData.timestamp,
        total_events: oddsData.data?.length || 0,
        game_found: !!matchingGame,
        total_bookmakers: matchingGame?.bookmakers?.length || 0
      },
      all_bookmakers: matchingGame?.bookmakers?.map((bm: any) => ({
        name: bm.title,
        markets: bm.markets?.map((m: any) => m.key),
        has_spreads: bm.markets?.some((m: any) => m.key === 'spreads'),
        has_totals: bm.markets?.some((m: any) => m.key === 'totals'),
        has_h2h: bm.markets?.some((m: any) => m.key === 'h2h')
      })) || [],
      diagnosis: matchingGame ? 
        (matchingGame.bookmakers?.some((bm: any) => 
          bm.markets?.some((m: any) => m.key === 'spreads') &&
          bm.markets?.some((m: any) => m.key === 'totals')
        ) ? '✅ FOUND DATA - Our backfill should have captured this!' : '❌ No bookmaker has complete spreads+totals') :
        '❌ Game not found in Odds API snapshot at this time'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

