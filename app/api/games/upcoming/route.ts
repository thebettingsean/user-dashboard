/**
 * Unified Games API - Fetches upcoming games with all data FROM CLICKHOUSE
 * Data sources:
 * - Games, Odds & Public Betting: ClickHouse (updated every 30min by sync-live-odds cron)
 * - Team Logos & Colors: ClickHouse teams table
 * 
 * No longer calls Odds API directly - uses cached data from ClickHouse instead
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

// Map frontend sport names to ClickHouse database sport names
const DB_SPORT_MAP: Record<string, string> = {
  nfl: 'nfl',
  nba: 'nba',
  cfb: 'cfb',
  cbb: 'ncaab', // Teams are stored as 'ncaab', games can be 'cbb' or 'ncaab'
  nhl: 'nhl',
  mlb: 'mlb',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.toLowerCase() || 'nfl'

    if (!DB_SPORT_MAP[sport]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid sport. Must be: nfl, nba, cfb, cbb, nhl, or mlb'
      }, { status: 400 })
    }

    // For games table, query both 'cbb' and 'ncaab' for college basketball
    const sportFilter = sport === 'cbb' 
      ? `AND g.sport IN ('cbb', 'ncaab')` 
      : `AND g.sport = '${sport}'`
    
    // For teams table, use the mapped sport name
    const teamsSport = DB_SPORT_MAP[sport]

    console.log(`[GAMES API - ${sport.toUpperCase()}] Fetching upcoming games from ClickHouse...`)

    // Query ClickHouse for upcoming games with team data and latest odds
    // Join with teams for logos/colors
    // Join with latest snapshot for current odds (ensures consistency)
    const gamesQuery = `
      SELECT 
        g.game_id,
        g.odds_api_game_id,
        g.sport,
        g.game_time,
        g.home_team_id,
        g.away_team_id,
        
        -- Team info
        ht.name as home_team_name,
        at.name as away_team_name,
        ht.logo_url as home_logo,
        at.logo_url as away_logo,
        ht.abbreviation as home_abbrev,
        at.abbreviation as away_abbrev,
        ht.primary_color as home_primary_color,
        at.primary_color as away_primary_color,
        ht.secondary_color as home_secondary_color,
        at.secondary_color as away_secondary_color,
        
        -- Current odds from latest snapshot (preferred) or games table (fallback)
        COALESCE(latest.spread, g.spread_close) as current_spread,
        COALESCE(latest.total, g.total_close) as current_total,
        COALESCE(latest.ml_home, g.home_ml_close) as current_ml_home,
        COALESCE(latest.ml_away, g.away_ml_close) as current_ml_away,
        
        -- Juice
        COALESCE(latest.spread_juice_home, g.home_spread_juice) as home_spread_juice,
        COALESCE(latest.spread_juice_away, g.away_spread_juice) as away_spread_juice,
        COALESCE(latest.total_juice_over, g.over_juice) as over_juice,
        COALESCE(latest.total_juice_under, g.under_juice) as under_juice,
        
        -- Public betting data
        g.public_spread_home_bet_pct,
        g.public_spread_home_money_pct,
        g.public_ml_home_bet_pct,
        g.public_ml_home_money_pct,
        g.public_total_over_bet_pct,
        g.public_total_over_money_pct,
        
        -- Sportsbook (from latest snapshot)
        latest.sportsbook as current_sportsbook
        
      FROM games g FINAL
      
      -- Join teams for logos and colors (MUST match on sport to prevent cross-sport contamination)
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND (
        (g.sport IN ('cbb', 'ncaab') AND ht.sport IN ('cbb', 'ncaab')) OR
        (g.sport NOT IN ('cbb', 'ncaab') AND ht.sport = g.sport)
      )
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND (
        (g.sport IN ('cbb', 'ncaab') AND at.sport IN ('cbb', 'ncaab')) OR
        (g.sport NOT IN ('cbb', 'ncaab') AND at.sport = g.sport)
      )
      
      -- Join with latest odds snapshot for current lines
      LEFT JOIN (
        SELECT 
          odds_api_game_id,
          spread,
          total,
          ml_home,
          ml_away,
          spread_juice_home,
          spread_juice_away,
          total_juice_over,
          total_juice_under,
          sportsbook,
          snapshot_time
        FROM live_odds_snapshots
        WHERE (odds_api_game_id, snapshot_time) IN (
          SELECT odds_api_game_id, MAX(snapshot_time)
          FROM live_odds_snapshots
          GROUP BY odds_api_game_id
        )
      ) latest ON g.odds_api_game_id = latest.odds_api_game_id
      
      WHERE g.game_time > now()
        ${sportFilter}
        AND g.status NOT IN ('completed', 'archived')
      
      ORDER BY g.game_time ASC
      LIMIT 100
    `

    const result = await clickhouseQuery<any>(gamesQuery)

    if (!result.data || result.data.length === 0) {
      console.log(`[GAMES API - ${sport.toUpperCase()}] No upcoming games found in ClickHouse`)
      return NextResponse.json({
        success: true,
        sport: sport.toUpperCase(),
        games: [],
        total: 0,
        message: 'No upcoming games found'
      })
    }

    console.log(`[GAMES API - ${sport.toUpperCase()}] Found ${result.data.length} upcoming games`)

    // Transform to frontend format
    const games = result.data.map((row: any, index: number) => {
      try {
      // Calculate spread for home/away (home spread is negative of away)
      const homeSpread = row.current_spread
      const awaySpread = homeSpread ? -homeSpread : null

      return {
        id: row.odds_api_game_id || row.game_id,
        sport: sport.toUpperCase(),
        awayTeam: row.away_team_name || 'Unknown',
        homeTeam: row.home_team_name || 'Unknown',
        awayTeamAbbr: row.away_abbrev || (row.away_team_name ? row.away_team_name.substring(0, 3).toUpperCase() : 'AWY'),
        homeTeamAbbr: row.home_abbrev || (row.home_team_name ? row.home_team_name.substring(0, 3).toUpperCase() : 'HME'),
        awayTeamLogo: row.away_logo || null,
        homeTeamLogo: row.home_logo || null,
        awayTeamColor: row.away_primary_color || null,
        homeTeamColor: row.home_primary_color || null,
        kickoff: row.game_time,
        kickoffLabel: new Date(row.game_time).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        // Odds
        spread: homeSpread !== null ? {
          homeLine: homeSpread,
          awayLine: awaySpread,
        } : null,
        totals: row.current_total ? {
          number: row.current_total,
        } : null,
        moneyline: (row.current_ml_home || row.current_ml_away) ? {
          home: row.current_ml_home,
          away: row.current_ml_away,
        } : null,
        sportsbook: row.current_sportsbook || 'Consensus',
        // Public Betting (from sportsdataio via ClickHouse)
        publicBetting: (
          row.public_spread_home_bet_pct || 
          row.public_ml_home_bet_pct || 
          row.public_total_over_bet_pct
        ) ? {
          spreadHomeBetPct: row.public_spread_home_bet_pct,
          spreadHomeMoneyPct: row.public_spread_home_money_pct,
          mlHomeBetPct: row.public_ml_home_bet_pct,
          mlHomeMoneyPct: row.public_ml_home_money_pct,
          totalOverBetPct: row.public_total_over_bet_pct,
          totalOverMoneyPct: row.public_total_over_money_pct,
        } : null,
        hasPublicBetting: !!(
          row.public_spread_home_bet_pct || 
          row.public_ml_home_bet_pct || 
          row.public_total_over_bet_pct
        ),
      }
      } catch (error: any) {
        console.error(`[GAMES API - ${sport.toUpperCase()}] Error transforming row ${index}:`, error.message, row)
        throw error
      }
    })

    console.log(`[GAMES API - ${sport.toUpperCase()}] Returning ${games.length} games`)

    return NextResponse.json({
      success: true,
      sport: sport.toUpperCase(),
      games,
      total: games.length,
      dataSources: {
        games: 'ClickHouse (synced every 30min)',
        odds: 'ClickHouse live_odds_snapshots',
        logos: 'ClickHouse teams table',
        publicBetting: 'SportsDataIO (via ClickHouse)',
      }
    })

  } catch (error: any) {
    console.error('[GAMES API] Error:', error.message)
    console.error('[GAMES API] Full error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
