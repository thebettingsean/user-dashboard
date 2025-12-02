import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Initialize ClickHouse schema (creates all tables)
 * GET /api/clickhouse/init-schema
 * 
 * WARNING: Only run this once! It creates all tables.
 */
export async function GET() {
  try {
    console.log('\n🏗️  Initializing ClickHouse schema...')
    
    // Read schema file
    const schemaPath = join(process.cwd(), 'clickhouse', 'schema.sql')
    const schemaSQL = readFileSync(schemaPath, 'utf-8')
    
    // Split by semicolons and filter out comments/empty lines
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`[Schema Init] Found ${statements.length} SQL statements`)
    
    const results = []
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip pure comment blocks
      if (statement.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
        continue
      }
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing:`, statement.substring(0, 80) + '...')
        await clickhouseCommand(statement)
        results.push({ success: true, statement: statement.substring(0, 100) })
      } catch (error: any) {
        console.error(`[${i + 1}/${statements.length}] Failed:`, error.message)
        results.push({ 
          success: false, 
          statement: statement.substring(0, 100),
          error: error.message 
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    console.log(`\n✅ Schema initialization complete: ${successCount} success, ${failCount} failed`)
    
    return NextResponse.json({
      success: failCount === 0,
      message: `Schema initialized: ${successCount} statements executed, ${failCount} failed`,
      results,
      successCount,
      failCount
    })
    
  } catch (error: any) {
    console.error('[Schema Init] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to initialize schema'
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

