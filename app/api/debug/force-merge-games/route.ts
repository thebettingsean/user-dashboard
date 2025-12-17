import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    // Force ClickHouse to merge duplicate rows in games table
    await clickhouseCommand(`OPTIMIZE TABLE games FINAL`)
    
    return NextResponse.json({
      success: true,
      message: 'Games table optimized - duplicates merged'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

