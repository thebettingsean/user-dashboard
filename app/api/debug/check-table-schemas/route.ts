import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    const schemas: any = {}
    
    // Check NFL box scores
    const nflBoxQuery = await clickhouseQuery<any>(`
      DESCRIBE TABLE nfl_box_scores_v2
    `)
    schemas.nfl_box_scores_v2 = nflBoxQuery.data?.map(row => row.name) || []
    
    // Check NBA box scores
    const nbaBoxQuery = await clickhouseQuery<any>(`
      DESCRIBE TABLE nba_box_scores_v2
    `)
    schemas.nba_box_scores_v2 = nbaBoxQuery.data?.map(row => row.name) || []
    
    // Check NFL games
    const nflGamesQuery = await clickhouseQuery<any>(`
      DESCRIBE TABLE nfl_games
    `)
    schemas.nfl_games = nflGamesQuery.data?.map(row => row.name) || []
    
    // Check NBA games
    const nbaGamesQuery = await clickhouseQuery<any>(`
      DESCRIBE TABLE nba_games
    `)
    schemas.nba_games = nbaGamesQuery.data?.map(row => row.name) || []
    
    return NextResponse.json({
      success: true,
      schemas,
      comparison: {
        nfl_box_cols: schemas.nfl_box_scores_v2.length,
        nba_box_cols: schemas.nba_box_scores_v2.length,
        nfl_games_cols: schemas.nfl_games.length,
        nba_games_cols: schemas.nba_games.length
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

