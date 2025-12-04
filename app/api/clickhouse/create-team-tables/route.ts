import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    console.log('[Create Team Tables] Starting...')
    
    const schemaPath = join(process.cwd(), 'clickhouse', 'team_stats_rankings_schema.sql')
    const schemaSQL = readFileSync(schemaPath, 'utf-8')
    
    // Extract CREATE TABLE statements
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.includes('CREATE TABLE'))
    
    const results = []
    
    for (const stmt of statements) {
      try {
        await clickhouseCommand(stmt)
        const tableName = stmt.match(/TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i)?.[1]
        console.log(`✅ Created: ${tableName}`)
        results.push({ success: true, table: tableName })
      } catch (err: any) {
        console.error(`❌ Failed:`, err.message)
        results.push({ success: false, error: err.message })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    return NextResponse.json({
      success: failCount === 0,
      message: `Created ${successCount} tables, ${failCount} failed`,
      results,
      successCount,
      failCount
    })
    
  } catch (error: any) {
    console.error('[Create Team Tables] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

