import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

export async function GET() {
  try {
    console.log('Deleting all backfill games...')
    
    await clickhouseCommand(`
      ALTER TABLE games DELETE WHERE game_id LIKE '%_backfill_%'
    `)
    
    console.log('Successfully deleted backfill games')
    
    return NextResponse.json({
      success: true,
      message: 'Deleted all backfill games'
    })
  } catch (error: any) {
    console.error('Error deleting backfill games:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

