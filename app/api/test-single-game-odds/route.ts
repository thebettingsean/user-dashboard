import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'd8ba5d45eca27e710d7ef2680d8cb452'

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

export async function GET(request: Request) {
  try {
    // Get first 2022 game
    const gameResult = await clickhouseQuery(`
      SELECT 
        game_id, espn_game_id, game_date, 
        home_team_id, away_team_id, season,
        home_score, away_score
      FROM nfl_games
      WHERE season = 2022 AND (spread_open = 0 OR total_open = 0)
      ORDER BY game_date
      LIMIT 1
    `)
    
    const game = gameResult.data?.[0]
    if (!game) {
      return NextResponse.json({ error: 'No 2022 games found' }, { status: 404 })
    }
    
    const homeTeam = NFL_TEAMS[game.home_team_id]
    const awayTeam = NFL_TEAMS[game.away_team_id]
    
    // Query Odds API 1 hour before game
    const gameDate = new Date(game.game_date)
    const queryDate = new Date(gameDate.getTime() - 1 * 60 * 60 * 1000)
    
    const url = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds?` +
      `apiKey=${ODDS_API_KEY}&` +
      `date=${queryDate.toISOString()}&` +
      `regions=us&` +
      `markets=h2h,spreads,totals&` +
      `oddsFormat=american`
    
    const response = await fetch(url)
    const oddsData = await response.json()
    
    // Try to find matching game
    const matchingGame = oddsData.data?.find((event: any) => {
      const eventDate = new Date(event.commence_time)
      const timeDiff = Math.abs(eventDate.getTime() - gameDate.getTime())
      const within12Hours = timeDiff < 12 * 60 * 60 * 1000
      
      return event.home_team === homeTeam && 
             event.away_team === awayTeam && 
             within12Hours
    })
    
    return NextResponse.json({
      our_game: {
        game_id: game.game_id,
        game_date: game.game_date,
        home_team: homeTeam,
        away_team: awayTeam,
        score: `${game.away_score}-${game.home_score}`
      },
      odds_api_query: {
        date: queryDate.toISOString(),
        total_events: oddsData.data?.length || 0
      },
      matching_game_found: !!matchingGame,
      matching_game: matchingGame ? {
        home_team: matchingGame.home_team,
        away_team: matchingGame.away_team,
        commence_time: matchingGame.commence_time,
        bookmakers: matchingGame.bookmakers?.length
      } : null,
      all_games_in_response: oddsData.data?.map((e: any) => ({
        home: e.home_team,
        away: e.away_team,
        time: e.commence_time
      })).slice(0, 5)
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

