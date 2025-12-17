import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nfl'
  
  try {
    // Check what the live-odds API query returns
    const gamesQuery = await clickhouseQuery(`
      SELECT 
        g.game_id,
        g.sport,
        ht.name as home_team,
        ht.abbreviation as home_abbr,
        ht.logo_url as home_logo,
        at.name as away_team,
        at.abbreviation as away_abbr,
        at.logo_url as away_logo,
        g.game_time,
        
        g.spread_open,
        g.spread_close,
        g.total_open,
        g.total_close,
        g.home_ml_open,
        g.away_ml_open,
        g.home_ml_close,
        g.away_ml_close,
        
        g.public_spread_home_bet_pct,
        g.public_spread_home_money_pct,
        g.public_ml_home_bet_pct,
        g.public_ml_home_money_pct,
        g.public_total_over_bet_pct,
        g.public_total_over_money_pct,
        
        g.updated_at
      FROM games g
      LEFT JOIN teams ht ON ht.team_id = g.home_team_id AND ht.sport = '${sport}'
      LEFT JOIN teams at ON at.team_id = g.away_team_id AND at.sport = '${sport}'
      WHERE g.sport = '${sport}'
        AND g.game_time >= now() - INTERVAL 1 DAY
        AND g.game_time <= now() + INTERVAL 7 DAY
      ORDER BY g.game_time ASC
      LIMIT 5
    `)
    
    return NextResponse.json({
      success: true,
      sport,
      games: gamesQuery.data || [],
      analysis: {
        total_games: gamesQuery.data?.length || 0,
        games_with_splits: gamesQuery.data?.filter((g: any) => 
          g.public_spread_home_bet_pct > 0 && g.public_spread_home_bet_pct < 100
        ).length || 0,
        games_with_totals_splits: gamesQuery.data?.filter((g: any) => 
          g.public_total_over_bet_pct > 0 && g.public_total_over_bet_pct < 100
        ).length || 0,
        games_with_opening_lines: gamesQuery.data?.filter((g: any) => 
          g.spread_open !== 0
        ).length || 0
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

