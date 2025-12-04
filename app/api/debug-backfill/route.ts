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

export async function GET() {
  try {
    // Get first 2022 game without odds
    const result = await clickhouseQuery(`
      SELECT game_id, espn_game_id, game_date, home_team_id, away_team_id,
             spread_open, total_open, home_score, away_score
      FROM nfl_games
      WHERE season = 2022 AND (spread_open = 0 OR total_open = 0)
      ORDER BY game_date
      LIMIT 1
    `)
    
    const game = result.data?.[0]
    if (!game) {
      return NextResponse.json({ message: 'No games need backfill' })
    }
    
    const homeTeam = NFL_TEAMS[game.home_team_id]
    const awayTeam = NFL_TEAMS[game.away_team_id]
    const gameDate = new Date(game.game_date)
    const dayBefore = new Date(gameDate)
    dayBefore.setDate(dayBefore.getDate() - 1)
    const queryDate = new Date(dayBefore.toISOString().split('T')[0] + 'T17:00:00Z')
    
    // Try fetching from Odds API
    const url = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds?` +
      `apiKey=${ODDS_API_KEY}&` +
      `date=${queryDate.toISOString()}&` +
      `regions=us&` +
      `markets=h2h,spreads,totals&` +
      `oddsFormat=american`
    
    let oddsResponse
    let oddsError
    let responseStatus
    
    try {
      console.log('[Debug] Fetching:', url.substring(0, 100))
      const res = await fetch(url)
      responseStatus = res.status
      
      if (res.ok) {
        oddsResponse = await res.json()
      } else {
        oddsError = await res.text()
      }
    } catch (err: any) {
      oddsError = err.message
    }
    
    return NextResponse.json({
      game_info: {
        game_id: game.game_id,
        espn_game_id: game.espn_game_id,
        game_date: game.game_date,
        home_team: homeTeam,
        home_team_id: game.home_team_id,
        away_team: awayTeam,
        away_team_id: game.away_team_id,
        current_spread_open: game.spread_open,
        current_total_open: game.total_open
      },
      odds_api_query: {
        query_date: queryDate.toISOString(),
        url: url.replace(ODDS_API_KEY, 'HIDDEN')
      },
      odds_api_response: oddsResponse ? {
        timestamp: oddsResponse.timestamp,
        total_events: oddsResponse.data?.length || 0,
        sample_events: oddsResponse.data?.slice(0, 3).map((e: any) => ({
          home: e.home_team,
          away: e.away_team,
          commence: e.commence_time
        }))
      } : null,
      odds_error: oddsError || null
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

