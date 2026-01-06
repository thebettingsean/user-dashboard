import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Get all tables
    const tablesQuery = await clickhouseQuery<{ name: string }>(`
      SHOW TABLES
    `)
    
    const tables = tablesQuery.data?.map(row => row.name) || []
    
    // Get structure and row counts for each table
    const audit: Record<string, any> = {}
    
    for (const table of tables) {
      try {
        // Get columns
        const columnsQuery = await clickhouseQuery<{ name: string; type: string }>(`
          DESCRIBE TABLE ${table}
        `)
        const columns = columnsQuery.data || []
        
        // Get row count
        const countQuery = await clickhouseQuery<{ cnt: number }>(`
          SELECT count(*) as cnt FROM ${table}
        `)
        const rowCount = countQuery.data?.[0]?.cnt || 0
        
        // Get sample row (if table has data)
        let sampleRow = null
        if (rowCount > 0) {
          const sampleQuery = await clickhouseQuery<any>(`
            SELECT * FROM ${table} LIMIT 1
          `)
          sampleRow = sampleQuery.data?.[0] || null
        }
        
        audit[table] = {
          columns: columns.map(c => ({ name: c.name, type: c.type })),
          column_count: columns.length,
          row_count: rowCount,
          sample_row: sampleRow,
          has_data: rowCount > 0
        }
      } catch (e: any) {
        audit[table] = {
          error: e.message
        }
      }
    }
    
    // Categorize tables by prefix/type
    const categorized = {
      nfl: tables.filter(t => t.startsWith('nfl_')),
      nba: tables.filter(t => t.startsWith('nba_')),
      nhl: tables.filter(t => t.startsWith('nhl_')),
      cfb: tables.filter(t => t.startsWith('cfb_') || t.startsWith('college_football_')),
      cbb: tables.filter(t => t.startsWith('cbb_') || t.startsWith('college_basketball_')),
      universal: tables.filter(t => !t.includes('_') || ['teams', 'players', 'games', 'live_odds_snapshots', 'game_first_seen'].includes(t)),
      other: tables.filter(t => 
        !t.startsWith('nfl_') && 
        !t.startsWith('nba_') && 
        !t.startsWith('nhl_') && 
        !t.startsWith('cfb_') && 
        !t.startsWith('cbb_') &&
        !t.startsWith('college_') &&
        !['teams', 'players', 'games', 'live_odds_snapshots', 'game_first_seen'].includes(t)
      )
    }
    
    return NextResponse.json({
      success: true,
      total_tables: tables.length,
      categorized,
      audit,
      summary: {
        tables_with_data: Object.keys(audit).filter(t => audit[t].has_data).length,
        tables_empty: Object.keys(audit).filter(t => audit[t].has_data === false && !audit[t].error).length,
        tables_with_errors: Object.keys(audit).filter(t => audit[t].error).length
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300

