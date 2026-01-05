import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'

/**
 * NUCLEAR OPTION: Just fix the Packers/Bears game RIGHT NOW
 */
export async function GET() {
  try {
    // Check what's actually in the database RIGHT NOW
    const currentData = await clickhouseQuery<any>(`
      SELECT 
        game_id,
        spread_open,
        spread_close,
        updated_at
      FROM games
      WHERE game_id LIKE '%271335072b85daf0ceabb360ef75220e%'
      ORDER BY updated_at DESC
      LIMIT 5
    `)
    
    // Force ClickHouse to optimize/merge
    await clickhouseCommand(`OPTIMIZE TABLE games FINAL`)
    
    // Check again after optimization
    const afterOptimize = await clickhouseQuery<any>(`
      SELECT 
        game_id,
        spread_open,
        spread_close,
        updated_at
      FROM games FINAL
      WHERE game_id LIKE '%271335072b85daf0ceabb360ef75220e%'
      LIMIT 1
    `)
    
    // If STILL 0, just INSERT directly with the correct value
    if (!afterOptimize.data?.[0]?.spread_open || afterOptimize.data[0].spread_open === 0) {
      // Get the full game data
      const fullGame = await clickhouseQuery<any>(`
        SELECT * FROM games FINAL 
        WHERE game_id = 'nfl_271335072b85daf0ceabb360ef75220e'
        LIMIT 1
      `)
      
      if (fullGame.data && fullGame.data.length > 0) {
        const g = fullGame.data[0]
        
        // INSERT with correct opening line
        await clickhouseCommand(`
          INSERT INTO games (
            game_id, sport, game_time, home_team_id, away_team_id,
            spread_open, spread_close, total_open, total_close,
            home_ml_open, away_ml_open, home_ml_close, away_ml_close,
            home_spread_juice, away_spread_juice, over_juice, under_juice,
            opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
            spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
            total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
            total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
            ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
            ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
            status, sportsdata_io_score_id, updated_at
          ) VALUES (
            'nfl_271335072b85daf0ceabb360ef75220e', '${g.sport}', '${g.game_time}', 
            ${g.home_team_id}, ${g.away_team_id},
            -1, ${g.spread_close}, ${g.total_open || 47.5}, ${g.total_close},
            0, 0, ${g.home_ml_close}, ${g.away_ml_close},
            ${g.home_spread_juice}, ${g.away_spread_juice}, ${g.over_juice}, ${g.under_juice},
            -110, -110, -110, -110,
            ${g.public_spread_home_bet_pct}, ${g.public_spread_home_money_pct},
            ${g.public_ml_home_bet_pct}, ${g.public_ml_home_money_pct},
            ${g.public_total_over_bet_pct}, ${g.public_total_over_money_pct},
            ${g.spread_home_public_respect}, ${g.spread_home_vegas_backed}, ${g.spread_home_whale_respect},
            ${g.spread_away_public_respect}, ${g.spread_away_vegas_backed}, ${g.spread_away_whale_respect},
            ${g.total_over_public_respect}, ${g.total_over_vegas_backed}, ${g.total_over_whale_respect},
            ${g.total_under_public_respect}, ${g.total_under_vegas_backed}, ${g.total_under_whale_respect},
            ${g.ml_home_public_respect}, ${g.ml_home_vegas_backed}, ${g.ml_home_whale_respect},
            ${g.ml_away_public_respect}, ${g.ml_away_vegas_backed}, ${g.ml_away_whale_respect},
            '${g.status}', ${g.sportsdata_io_score_id}, now()
          )
        `)
        
        // Force another optimization
        await clickhouseCommand(`OPTIMIZE TABLE games FINAL`)
      }
    }
    
    // Final check
    const final = await clickhouseQuery<any>(`
      SELECT 
        game_id,
        spread_open,
        spread_close,
        updated_at
      FROM games FINAL
      WHERE game_id = 'nfl_271335072b85daf0ceabb360ef75220e'
      LIMIT 1
    `)
    
    return NextResponse.json({
      message: 'Fixed Packers/Bears - hard refresh your page',
      beforeOptimize: currentData.data,
      afterOptimize: afterOptimize.data,
      final: final.data,
      success: final.data?.[0]?.spread_open === -1 || final.data?.[0]?.spread_open === 1,
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}

