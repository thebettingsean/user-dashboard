import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // 1. Check if props can be matched via nfl_upcoming_games
    const propsViaUpcoming = await clickhouseQuery(`
      SELECT 
        COUNT(DISTINCT p.game_id) as games_with_props,
        COUNT(*) as total_prop_lines,
        MIN(u.game_time) as earliest_game,
        MAX(u.game_time) as latest_game,
        groupUniqArray(toString(u.season)) as seasons
      FROM nfl_prop_lines p FINAL
      INNER JOIN nfl_upcoming_games u FINAL ON p.game_id = u.game_id
    `)
    
    // 2. Get sample of prop data (wait for schema first)
    const propSample = await clickhouseQuery(`
      SELECT *
      FROM nfl_prop_lines FINAL
      LIMIT 5
    `)
    
    // 3. Check if there's a season field directly in prop_lines
    const propLineFields = await clickhouseQuery(`
      SELECT name, type
      FROM system.columns
      WHERE database = 'default'
        AND table = 'nfl_prop_lines'
      ORDER BY name
    `)
    
    // 4. Check prop_line_snapshots too
    const snapshotFields = await clickhouseQuery(`
      SELECT name, type
      FROM system.columns
      WHERE database = 'default'
        AND table = 'nfl_prop_line_snapshots'
      ORDER BY name
    `)
    
    return NextResponse.json({
      success: true,
      props_via_upcoming: propsViaUpcoming.data?.[0] || null,
      sample_props: propSample.data || [],
      prop_lines_columns: propLineFields.data || [],
      prop_snapshots_columns: snapshotFields.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

