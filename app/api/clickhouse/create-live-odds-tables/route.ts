import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

export async function POST() {
  const results: { step: string; status: string; error?: string }[] = []

  try {
    // Step 1: Create live_odds_snapshots table
    const createSnapshotsTable = `
      CREATE TABLE IF NOT EXISTS live_odds_snapshots (
        -- Identity
        odds_api_game_id String,
        sportsdata_score_id UInt32 DEFAULT 0,
        sport LowCardinality(String),
        snapshot_time DateTime,
        
        -- Game info (denormalized for speed)
        home_team String,
        away_team String,
        game_time DateTime,
        
        -- Spread
        spread Float32 DEFAULT 0,
        spread_juice_home Int16 DEFAULT -110,
        spread_juice_away Int16 DEFAULT -110,
        
        -- Total
        total Float32 DEFAULT 0,
        total_juice_over Int16 DEFAULT -110,
        total_juice_under Int16 DEFAULT -110,
        
        -- Moneyline
        ml_home Int16 DEFAULT 0,
        ml_away Int16 DEFAULT 0,
        
        -- Public betting percentages
        public_spread_home_bet_pct Float32 DEFAULT 0,
        public_spread_home_money_pct Float32 DEFAULT 0,
        public_ml_home_bet_pct Float32 DEFAULT 0,
        public_ml_home_money_pct Float32 DEFAULT 0,
        public_total_over_bet_pct Float32 DEFAULT 0,
        public_total_over_money_pct Float32 DEFAULT 0,
        
        -- Metadata
        sportsbook LowCardinality(String) DEFAULT 'consensus',
        created_at DateTime DEFAULT now()
      ) ENGINE = ReplacingMergeTree(created_at)
      ORDER BY (sport, odds_api_game_id, snapshot_time)
      PARTITION BY toYYYYMM(game_time)
    `
    
    await clickhouseCommand(createSnapshotsTable)
    results.push({ step: 'Create live_odds_snapshots table', status: 'success' })

    // Step 2: Create live_odds_summary materialized view
    const createSummaryView = `
      CREATE MATERIALIZED VIEW IF NOT EXISTS live_odds_summary
      ENGINE = ReplacingMergeTree()
      ORDER BY (sport, odds_api_game_id)
      POPULATE
      AS SELECT
        odds_api_game_id,
        sportsdata_score_id,
        sport,
        home_team,
        away_team,
        game_time,
        
        -- Opening (first snapshot)
        argMin(spread, snapshot_time) as opening_spread,
        argMin(total, snapshot_time) as opening_total,
        argMin(ml_home, snapshot_time) as opening_ml_home,
        argMin(ml_away, snapshot_time) as opening_ml_away,
        argMin(snapshot_time, snapshot_time) as opening_time,
        
        -- Current/Closing (latest snapshot)
        argMax(spread, snapshot_time) as current_spread,
        argMax(total, snapshot_time) as current_total,
        argMax(ml_home, snapshot_time) as current_ml_home,
        argMax(ml_away, snapshot_time) as current_ml_away,
        argMax(snapshot_time, snapshot_time) as current_time,
        
        -- Movement calculations
        argMax(spread, snapshot_time) - argMin(spread, snapshot_time) as spread_movement,
        argMax(total, snapshot_time) - argMin(total, snapshot_time) as total_movement,
        
        -- Latest public betting
        argMax(public_spread_home_bet_pct, snapshot_time) as public_spread_bet_pct,
        argMax(public_spread_home_money_pct, snapshot_time) as public_spread_money_pct,
        argMax(public_ml_home_bet_pct, snapshot_time) as public_ml_bet_pct,
        argMax(public_ml_home_money_pct, snapshot_time) as public_ml_money_pct,
        argMax(public_total_over_bet_pct, snapshot_time) as public_total_bet_pct,
        argMax(public_total_over_money_pct, snapshot_time) as public_total_money_pct,
        
        -- Snapshot count
        count() as snapshot_count,
        
        max(created_at) as last_updated
        
      FROM live_odds_snapshots
      GROUP BY odds_api_game_id, sportsdata_score_id, sport, home_team, away_team, game_time
    `
    
    await clickhouseCommand(createSummaryView)
    results.push({ step: 'Create live_odds_summary view', status: 'success' })

    // Step 3: Create indexes for faster queries
    const createIndex1 = `
      ALTER TABLE live_odds_snapshots 
      ADD INDEX IF NOT EXISTS idx_game_time (game_time) TYPE minmax GRANULARITY 1
    `
    await clickhouseCommand(createIndex1)
    results.push({ step: 'Create game_time index', status: 'success' })

    const createIndex2 = `
      ALTER TABLE live_odds_snapshots 
      ADD INDEX IF NOT EXISTS idx_sport (sport) TYPE set(10) GRANULARITY 1
    `
    await clickhouseCommand(createIndex2)
    results.push({ step: 'Create sport index', status: 'success' })

    return NextResponse.json({
      success: true,
      message: 'Live odds tables created successfully',
      results
    })

  } catch (error: any) {
    console.error('Error creating live odds tables:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to create live_odds_snapshots table and live_odds_summary view',
    tables: [
      'live_odds_snapshots - stores every 30-min snapshot of odds and public betting',
      'live_odds_summary - materialized view with opening/current/movement aggregations'
    ]
  })
}

