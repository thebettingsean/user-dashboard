import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Sample CBB games from games table (main source)
    const gamesQuery = await clickhouseQuery(`
      SELECT 
        g.game_id,
        g.sport,
        g.game_time,
        g.spread_open,
        g.spread_close,
        g.total_open,
        g.total_close,
        g.public_spread_home_bet_pct,
        g.public_ml_home_bet_pct,
        ht.name as home_team,
        at.name as away_team
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id
      LEFT JOIN teams at ON g.away_team_id = at.team_id
      WHERE g.sport IN ('cbb', 'ncaab')
        AND g.game_time >= now() - INTERVAL 1 HOUR
        AND g.game_time <= now() + INTERVAL 7 DAY
      ORDER BY g.game_time ASC
      LIMIT 20
    `)
    
    // Count games with real data vs missing data
    const statsQuery = await clickhouseQuery(`
      SELECT 
        COUNT(*) as total_games,
        SUM(CASE WHEN spread_open != 0 THEN 1 ELSE 0 END) as with_opening_spread,
        SUM(CASE WHEN total_open != 0 THEN 1 ELSE 0 END) as with_opening_total,
        SUM(CASE WHEN public_spread_home_bet_pct != 50 THEN 1 ELSE 0 END) as with_real_splits
      FROM games FINAL
      WHERE sport IN ('cbb', 'ncaab')
        AND game_time >= now() - INTERVAL 1 HOUR
        AND game_time <= now() + INTERVAL 7 DAY
    `)
    
    // Sample CBB teams from teams table (stored as 'ncaab')
    const teamsQuery = await clickhouseQuery(`
      SELECT name, abbreviation, logo_url
      FROM teams
      WHERE sport = 'ncaab'
      LIMIT 20
    `)
    
    // Check live_odds_snapshots for CBB
    const snapshotsQuery = await clickhouseQuery(`
      SELECT 
        COUNT(*) as total_snapshots,
        SUM(CASE WHEN public_spread_home_bet_pct != 50 THEN 1 ELSE 0 END) as with_real_splits
      FROM live_odds_snapshots
      WHERE sport = 'cbb'
        AND game_time >= now() - INTERVAL 1 HOUR
        AND game_time <= now() + INTERVAL 7 DAY
    `)
    
    // Check game_first_seen for CBB opening lines
    const firstSeenQuery = await clickhouseQuery(`
      SELECT 
        COUNT(*) as total_games,
        SUM(CASE WHEN opening_spread != 0 THEN 1 ELSE 0 END) as with_opening_spread,
        SUM(CASE WHEN opening_total != 0 THEN 1 ELSE 0 END) as with_opening_total
      FROM game_first_seen
      WHERE sport = 'cbb'
    `)
    
    return NextResponse.json({
      success: true,
      cbbGames: gamesQuery.data || [],
      gameStats: statsQuery.data?.[0] || {},
      snapshotStats: snapshotsQuery.data?.[0] || {},
      firstSeenStats: firstSeenQuery.data?.[0] || {},
      teamsInDb: teamsQuery.data || [],
      teamCount: (teamsQuery.data || []).length
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

