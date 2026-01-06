import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET() {
  try {
    // List all tables with "prop" in the name
    const tables = await clickhouseQuery(`
      SELECT 
        name,
        engine,
        total_rows,
        total_bytes
      FROM system.tables
      WHERE database = 'default'
        AND (name LIKE '%prop%' OR name LIKE '%player%')
      ORDER BY name
    `)
    
    return NextResponse.json({
      success: true,
      prop_tables: tables.data || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

