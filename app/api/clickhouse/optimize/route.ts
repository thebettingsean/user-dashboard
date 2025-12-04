import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    console.log('[Optimize] Running OPTIMIZE on all tables...')
    
    await clickhouseCommand('OPTIMIZE TABLE teams FINAL')
    await clickhouseCommand('OPTIMIZE TABLE players FINAL')
    
    return NextResponse.json({
      success: true,
      message: 'Tables optimized and deduplicated'
    })

  } catch (error: any) {
    console.error('[Optimize] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

