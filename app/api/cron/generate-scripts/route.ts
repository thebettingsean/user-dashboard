import { NextRequest, NextResponse } from 'next/server'

/**
 * Cron job to pre-generate AI scripts for all games
 * Runs every 4 hours to refresh scripts
 * 
 * Vercel Cron: 0 */4 * * * (every 4 hours)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🤖 CRON: Starting script pre-generation...')
    const startTime = Date.now()

    // Get today's games
    const baseUrl = request.nextUrl.origin
    const gamesResponse = await fetch(`${baseUrl}/api/games/today`)
    
    if (!gamesResponse.ok) {
      throw new Error('Failed to fetch games')
    }

    const { games } = await gamesResponse.json()
    console.log(`📊 Found ${games.length} games to process`)

    // Pre-generate scripts for each game
    const results = await Promise.allSettled(
      games.map(async (game: any) => {
        try {
          console.log(`🎮 Generating script for ${game.game_id}...`)
          
          // Fetch game data
          const dataResponse = await fetch(
            `${baseUrl}/api/game-intelligence/data?gameId=${game.game_id}&league=${game.sport.toLowerCase()}`
          )
          
          if (!dataResponse.ok) {
            throw new Error(`Failed to fetch data for ${game.game_id}`)
          }

          const gameData = await dataResponse.json()

          // Generate script
          const scriptResponse = await fetch(
            `${baseUrl}/api/game-intelligence/generate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gameId: game.game_id,
                league: game.sport.toLowerCase(),
                data: gameData
              })
            }
          )

          if (!scriptResponse.ok) {
            throw new Error(`Failed to generate script for ${game.game_id}`)
          }

          const script = await scriptResponse.json()
          console.log(`✅ Generated script for ${game.game_id} (${script.script.length} chars)`)
          
          return { gameId: game.game_id, success: true, length: script.script.length }
        } catch (error) {
          console.error(`❌ Failed to generate script for ${game.game_id}:`, error)
          return { gameId: game.game_id, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      })
    )

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
    const duration = Date.now() - startTime

    console.log(`🎯 CRON COMPLETE: ${successful} successful, ${failed} failed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      processed: games.length,
      successful,
      failed,
      duration,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'rejected' })
    })

  } catch (error) {
    console.error('❌ Cron job failed:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

