import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Drop existing games table if it exists (to recreate with correct schema)
    await clickhouseCommand(`DROP TABLE IF EXISTS games`)
    
    // Create universal games table for ALL sports
    const createTableSQL = `
      CREATE TABLE games (
        game_id String,
        sport LowCardinality(String),
        odds_api_game_id String,
        
        home_team_id UInt32,
        away_team_id UInt32,
        
        game_time DateTime,
        game_date Date,
        
        spread_open Float32 DEFAULT 0,
        total_open Float32 DEFAULT 0,
        home_ml_open Int16 DEFAULT 0,
        away_ml_open Int16 DEFAULT 0,
        
        spread_close Float32 DEFAULT 0,
        total_close Float32 DEFAULT 0,
        home_ml_close Int16 DEFAULT 0,
        away_ml_close Int16 DEFAULT 0,
        
        home_score UInt8 DEFAULT 0,
        away_score UInt8 DEFAULT 0,
        
        status LowCardinality(String) DEFAULT 'scheduled',
        
        season UInt16 DEFAULT 0,
        week UInt8 DEFAULT 0,
        
        created_at DateTime DEFAULT now(),
        updated_at DateTime DEFAULT now()
      ) ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (sport, game_time, game_id)
      SETTINGS index_granularity = 8192
    `
    
    await clickhouseCommand(createTableSQL)
    
    // Add indexes for faster queries
    await clickhouseCommand(`ALTER TABLE games ADD INDEX IF NOT EXISTS sport_idx (sport) TYPE set GRANULARITY 1`)
    await clickhouseCommand(`ALTER TABLE games ADD INDEX IF NOT EXISTS game_time_idx (game_time) TYPE minmax GRANULARITY 1`)
    await clickhouseCommand(`ALTER TABLE games ADD INDEX IF NOT EXISTS status_idx (status) TYPE set GRANULARITY 1`)
    
    return NextResponse.json({
      success: true,
      message: 'Universal games table created successfully',
      details: {
        table: 'games',
        purpose: 'ALL upcoming games for ALL sports in one unified table',
        features: [
          'ReplacingMergeTree for easy upserts',
          'Supports NFL, NBA, NHL, CFB, and all future sports',
          'Opening and closing lines',
          'Status tracking (scheduled, in_progress, final)',
          'Indexed by sport, game_time, and status'
        ]
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

