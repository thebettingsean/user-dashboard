import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

export const maxDuration = 300

// Populate the games table with latest data from live_odds_snapshots
export async function GET() {
  const startTime = Date.now()
  
  try {
    console.log('[POPULATE-GAMES] Starting...')
    
    // Get latest snapshot for each game from live_odds_snapshots
    const latestSnapshotsQuery = await clickhouseQuery(`
      SELECT 
        odds_api_game_id,
        sport,
        home_team,
        away_team,
        game_time,
        sportsdata_score_id,
        argMax(spread, snapshot_time) as current_spread,
        argMax(total, snapshot_time) as current_total,
        argMax(ml_home, snapshot_time) as current_ml_home,
        argMax(ml_away, snapshot_time) as current_ml_away,
        argMin(spread, snapshot_time) as opening_spread,
        argMin(total, snapshot_time) as opening_total,
        argMin(ml_home, snapshot_time) as opening_ml_home,
        argMin(ml_away, snapshot_time) as opening_ml_away,
        argMax(public_spread_home_bet_pct, snapshot_time) as spread_bet_pct,
        argMax(public_spread_home_money_pct, snapshot_time) as spread_money_pct,
        argMax(public_ml_home_bet_pct, snapshot_time) as ml_bet_pct,
        argMax(public_ml_home_money_pct, snapshot_time) as ml_money_pct,
        argMax(public_total_over_bet_pct, snapshot_time) as total_bet_pct,
        argMax(public_total_over_money_pct, snapshot_time) as total_money_pct
      FROM live_odds_snapshots
      WHERE game_time >= now() - INTERVAL 1 DAY
        AND game_time <= now() + INTERVAL 10 DAY
      GROUP BY odds_api_game_id, sport, home_team, away_team, game_time, sportsdata_score_id
    `)
    
    const snapshots = latestSnapshotsQuery.data || []
    console.log(`[POPULATE-GAMES] Found ${snapshots.length} games with snapshots`)
    
    let updated = 0
    let failed = 0
    
    for (const snap of snapshots) {
      try {
        // Get team IDs from teams table
        const homeTeamQuery = await clickhouseQuery(`
          SELECT team_id FROM teams 
          WHERE sport = '${snap.sport}' 
            AND name = '${snap.home_team.replace(/'/g, "''")}'
          LIMIT 1
        `)
        
        const awayTeamQuery = await clickhouseQuery(`
          SELECT team_id FROM teams 
          WHERE sport = '${snap.sport}' 
            AND name = '${snap.away_team.replace(/'/g, "''")}'
          LIMIT 1
        `)
        
        if (!homeTeamQuery.data?.[0] || !awayTeamQuery.data?.[0]) {
          console.log(`[POPULATE-GAMES] Skipping ${snap.away_team} @ ${snap.home_team} - teams not found`)
          failed++
          continue
        }
        
        const homeTeamId = homeTeamQuery.data[0].team_id
        const awayTeamId = awayTeamQuery.data[0].team_id
        const gameId = `${snap.sport}_${snap.odds_api_game_id}`
        
        // Insert/update game in games table
        await clickhouseCommand(`
          INSERT INTO games (
            game_id, sport, game_time, home_team_id, away_team_id,
            spread_open, spread_close, total_open, total_close,
            home_ml_open, away_ml_open, home_ml_close, away_ml_close,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            status, sportsdata_io_score_id, updated_at
          ) VALUES (
            '${gameId}', '${snap.sport}', '${snap.game_time}', ${homeTeamId}, ${awayTeamId},
            ${snap.opening_spread || 0}, ${snap.current_spread || 0}, 
            ${snap.opening_total || 0}, ${snap.current_total || 0},
            ${snap.opening_ml_home || 0}, ${snap.opening_ml_away || 0},
            ${snap.current_ml_home || 0}, ${snap.current_ml_away || 0},
            ${snap.spread_bet_pct || 50}, ${snap.spread_money_pct || 50},
            ${snap.ml_bet_pct || 50}, ${snap.ml_money_pct || 50},
            ${snap.total_bet_pct || 50}, ${snap.total_money_pct || 50},
            'upcoming', ${snap.sportsdata_score_id || 0}, now()
          )
        `)
        
        updated++
        
        if (updated % 10 === 0) {
          console.log(`[POPULATE-GAMES] Progress: ${updated}/${snapshots.length}`)
        }
        
      } catch (error: any) {
        console.error(`[POPULATE-GAMES] Error processing ${snap.odds_api_game_id}:`, error.message)
        failed++
      }
    }
    
    return NextResponse.json({
      success: true,
      totalSnapshots: snapshots.length,
      updated,
      failed,
      elapsed_ms: Date.now() - startTime
    })
    
  } catch (error: any) {
    console.error('[POPULATE-GAMES] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      elapsed_ms: Date.now() - startTime
    }, { status: 500 })
  }
}

