import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = 'd8ba5d45eca27e710d7ef2680d8cb452'

/**
 * Debug: Compare game times in our DB vs Odds API
 */
export async function GET() {
  try {
    // Get a Week 10 2024 game from our database
    const result = await clickhouseQuery(`
      SELECT 
        game_id, week, game_date, game_time, 
        home_team_id, away_team_id,
        spread_open, spread_close
      FROM nfl_games 
      WHERE season = 2024 AND week = 10
      ORDER BY game_time
      LIMIT 5
    `)
    
    // Also query Odds API for Week 10 snapshot
    const oddsUrl = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds?apiKey=${ODDS_API_KEY}&date=2024-11-10T17:00:00Z&regions=us&markets=spreads`
    const oddsRes = await fetch(oddsUrl)
    const oddsData = await oddsRes.json()
    
    return NextResponse.json({
      our_database: {
        games: result.data?.slice(0, 5).map((g: any) => ({
          game_id: g.game_id,
          week: g.week,
          game_date: g.game_date,
          game_time: g.game_time,
          game_time_type: typeof g.game_time,
          game_time_as_date: new Date(g.game_time).toISOString(),
          home_team_id: g.home_team_id,
          away_team_id: g.away_team_id,
          has_close: g.spread_close !== 0
        }))
      },
      odds_api: {
        snapshot_time: oddsData.timestamp,
        events: oddsData.data?.slice(0, 5).map((e: any) => ({
          home_team: e.home_team,
          away_team: e.away_team,
          commence_time: e.commence_time,
          has_spreads: e.bookmakers?.some((b: any) => b.markets?.some((m: any) => m.key === 'spreads'))
        }))
      },
      analysis: {
        question: "Do our game_times match Odds API commence_times?",
        note: "If times are off by hours, our 1-hour-before query will fail"
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

