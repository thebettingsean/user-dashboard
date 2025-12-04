import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    console.log('[Create Final Tables] Starting...')
    
    // Read the final schemas file
    const schemaPath = join(process.cwd(), 'clickhouse', 'final_schemas.sql')
    const schemaSQL = readFileSync(schemaPath, 'utf-8')
    
    // Split by CREATE TABLE and execute each
    const statements = schemaSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim()) // Remove comments and empty lines
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim())
      .filter(stmt => stmt.includes('CREATE') || stmt.includes('ALTER'))
    
    const results = []
    
    for (const stmt of statements) {
      const cleanStmt = stmt.trim()
      if (!cleanStmt) continue
      
      try {
        await clickhouseCommand(cleanStmt)
        const tableName = cleanStmt.match(/TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i)?.[1]
        console.log(`✅ Created/Updated: ${tableName}`)
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
      message: `Created ${successCount} tables/indexes, ${failCount} failed`,
      results,
      successCount,
      failCount
    })
    
  } catch (error: any) {
    console.error('[Create Final Tables] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

