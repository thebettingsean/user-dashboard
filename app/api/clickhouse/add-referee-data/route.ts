import { NextResponse } from 'next/server'
import { clickhouseCommand, clickhouseQuery } from '@/lib/clickhouse'

const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'

/**
 * Add Referee Data to NFL Games
 * 1. Add referee columns to nfl_games
 * 2. Backfill all existing games with referee data
 */

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'all'
  
  const startTime = Date.now()
  
  try {
    const results = []
    
    // Step 1: Add columns if needed
    if (action === 'add_columns' || action === 'all') {
      console.log('[Referee] Adding columns to nfl_games...')
      
      await clickhouseCommand(`
        ALTER TABLE nfl_games 
        ADD COLUMN IF NOT EXISTS referee_name String DEFAULT ''
      `)
      
      await clickhouseCommand(`
        ALTER TABLE nfl_games 
        ADD COLUMN IF NOT EXISTS referee_id UInt32 DEFAULT 0
      `)
      
      results.push('Added referee_name and referee_id columns')
    }
    
    // Step 2: Backfill referee data
    if (action === 'backfill' || action === 'all') {
      console.log('[Referee] Fetching all game IDs...')
      
      const gamesResult = await clickhouseQuery(`
        SELECT espn_game_id, game_id
        FROM nfl_games
        WHERE referee_name = '' OR referee_id = 0
        ORDER BY game_id
      `)
      
      const games = gamesResult.data || []
      console.log(`[Referee] Found ${games.length} games to update`)
      
      let updated = 0
      let errors = 0
      
      for (const game of games) {
        try {
          const officialsUrl = `${ESPN_CORE}/events/${game.espn_game_id}/competitions/${game.espn_game_id}/officials`
          const res = await fetch(officialsUrl)
          
          if (!res.ok) {
            errors++
            continue
          }
          
          const data = await res.json()
          const referee = data.items?.find((o: any) => o.position?.name === 'Referee')
          
          if (referee) {
            const refereeName = referee.fullName || referee.displayName || ''
            const refereeId = parseInt(referee.id) || 0
            
            await clickhouseCommand(`
              ALTER TABLE nfl_games 
              UPDATE 
                referee_name = '${refereeName.replace(/'/g, "''")}',
                referee_id = ${refereeId}
              WHERE game_id = ${game.game_id}
            `)
            
            updated++
            
            if (updated % 50 === 0) {
              console.log(`[Referee] Updated ${updated}/${games.length} games...`)
            }
          }
          
          // Rate limit
          await new Promise(r => setTimeout(r, 100))
          
        } catch (err: any) {
          console.error(`[Referee] Error for game ${game.game_id}:`, err.message)
          errors++
        }
      }
      
      results.push(`Backfilled ${updated} games (${errors} errors)`)
    }
    
    const duration = (Date.now() - startTime) / 1000
    
    return NextResponse.json({
      success: true,
      duration_seconds: duration,
      results
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

