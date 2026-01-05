import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * ADMIN ENDPOINT: Check health of line data (no authentication required)
 * 
 * This endpoint checks for:
 * 1. Games with suspiciously large movements (likely corrupted)
 * 2. Total count of corrupted vs clean games
 * 3. Whether the prevention fix is working (no new corruption)
 * 
 * Usage: GET /api/admin/check-line-health?sport=nfl
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'nfl'
  
  try {
    // Check for games with EXTREME movements (likely corrupted)
    const suspiciousGamesQuery = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        g.sport,
        g.game_time,
        ht.name as home_team,
        at.name as away_team,
        g.spread_open,
        g.spread_close,
        g.total_open,
        g.total_close,
        ABS(g.spread_close - g.spread_open) as spread_movement,
        ABS(g.total_close - g.total_open) as total_movement,
        g.status,
        CASE 
          WHEN g.game_time < now() THEN 'COMPLETED'
          ELSE 'UPCOMING'
        END as actual_status
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.sport = '${sport}'
        AND g.game_time > now() - INTERVAL 7 DAY
        AND (
          ABS(g.spread_close - g.spread_open) > 10
          OR ABS(g.total_close - g.total_open) > 10
        )
      ORDER BY spread_movement DESC
      LIMIT 20
    `)
    
    // Count total games in last 7 days
    const totalGamesQuery = await clickhouseQuery<{total: number}>(`
      SELECT COUNT(*) as total
      FROM games FINAL
      WHERE sport = '${sport}'
        AND game_time > now() - INTERVAL 7 DAY
    `)
    
    // Count games with suspicious movements
    const corruptedCountQuery = await clickhouseQuery<{total: number}>(`
      SELECT COUNT(*) as total
      FROM games FINAL
      WHERE sport = '${sport}'
        AND game_time > now() - INTERVAL 7 DAY
        AND (
          ABS(spread_close - spread_open) > 10
          OR ABS(total_close - total_open) > 10
        )
    `)
    
    // Check for recent games (last 2 hours) to see if prevention is working
    const recentGamesQuery = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        ht.name as home_team,
        at.name as away_team,
        g.spread_open,
        g.spread_close,
        g.game_time,
        g.updated_at,
        ABS(g.spread_close - g.spread_open) as spread_movement,
        CASE 
          WHEN g.game_time < now() AND g.updated_at > g.game_time THEN 'BAD: Updated after kickoff'
          WHEN g.game_time < now() AND g.updated_at <= g.game_time THEN 'GOOD: Not updated after kickoff'
          ELSE 'UPCOMING: Not yet played'
        END as prevention_status
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.sport = '${sport}'
        AND g.game_time > now() - INTERVAL 2 HOUR
        AND g.game_time < now()
      ORDER BY g.game_time DESC
      LIMIT 10
    `)
    
    const totalGames = totalGamesQuery.data?.[0]?.total || 0
    const corruptedGames = corruptedCountQuery.data?.[0]?.total || 0
    const cleanGames = totalGames - corruptedGames
    const corruptionRate = totalGames > 0 ? (corruptedGames / totalGames * 100).toFixed(1) : '0'
    
    return NextResponse.json({
      sport,
      summary: {
        totalGames: totalGames,
        cleanGames: cleanGames,
        corruptedGames: corruptedGames,
        corruptionRate: `${corruptionRate}%`,
        needsCleanup: corruptedGames > 0,
      },
      suspiciousGames: suspiciousGamesQuery.data?.map((g: any) => ({
        game: `${g.away_team} @ ${g.home_team}`,
        gameTime: g.game_time,
        status: g.actual_status,
        spread: `${g.spread_open} → ${g.spread_close} (${g.spread_movement.toFixed(1)} move)`,
        total: `${g.total_open} → ${g.total_close} (${g.total_movement.toFixed(1)} move)`,
        likelyCorrupted: g.spread_movement > 10 || g.total_movement > 10,
      })) || [],
      preventionCheck: {
        description: 'Games from last 2 hours that have completed - checking if they were updated after kickoff',
        games: recentGamesQuery.data?.map((g: any) => ({
          game: `${g.away_team} @ ${g.home_team}`,
          gameTime: g.game_time,
          lastUpdated: g.updated_at,
          spread: `${g.spread_open} → ${g.spread_close} (${g.spread_movement.toFixed(1)} move)`,
          status: g.prevention_status,
        })) || [],
        preventionWorking: recentGamesQuery.data?.every((g: any) => !g.prevention_status.includes('BAD')) ?? true,
      },
      recommendations: {
        step1: corruptedGames > 0 
          ? `Run cleanup script: /api/admin/fix-corrupted-lines?sport=${sport}&limit=100&dryRun=true`
          : 'No cleanup needed - data looks clean!',
        step2: 'Wait for next cron run (every 30 min) and recheck this endpoint',
        step3: 'Verify signals on /public-betting page',
      },
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('[Check Line Health] Error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}

