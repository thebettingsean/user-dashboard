import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use main Supabase project (same as game_scripts table)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'
)

/**
 * Cron job to pre-generate AI scripts for all games
 * Runs every hour from 9am-7pm EST (11 runs per day)
 * 
 * Vercel Cron Schedule (in UTC, EST = UTC-5):
 * - 9:00 AM EST = 2:00 PM UTC  -> 0 14 * * *
 * - 10:00 AM EST = 3:00 PM UTC -> 0 15 * * *
 * - 11:00 AM EST = 4:00 PM UTC -> 0 16 * * *
 * - 12:00 PM EST = 5:00 PM UTC -> 0 17 * * *
 * - 1:00 PM EST = 6:00 PM UTC  -> 0 18 * * *
 * - 2:00 PM EST = 7:00 PM UTC  -> 0 19 * * *
 * - 3:00 PM EST = 8:00 PM UTC  -> 0 20 * * *
 * - 4:00 PM EST = 9:00 PM UTC  -> 0 21 * * *
 * - 5:00 PM EST = 10:00 PM UTC -> 0 22 * * *
 * - 6:00 PM EST = 11:00 PM UTC -> 0 23 * * *
 * - 7:00 PM EST = 12:00 AM UTC -> 0 0 * * * (next day)
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🤖 [CRON] Starting script generation job...')

    // Always use production URL for cron jobs (avoid Vercel preview deployment protection)
    const baseUrl = 'https://dashboard.thebettinginsider.com'
    console.log(`📍 Using base URL: ${baseUrl}`)
    
    const gamesUrl = `${baseUrl}/api/games/today`
    console.log(`🎮 Fetching games from: ${gamesUrl}`)
    const gamesResponse = await fetch(gamesUrl)
    
    console.log(`📡 Games API response status: ${gamesResponse.status}`)
    
    if (!gamesResponse.ok) {
      const errorText = await gamesResponse.text()
      console.error(`❌ Games API failed: ${errorText}`)
      throw new Error(`Failed to fetch games: ${gamesResponse.status} - ${errorText}`)
    }

    const gamesData = await gamesResponse.json()
    const allGames = [
      ...(gamesData.nfl || []),
      ...(gamesData.nba || []),
      ...(gamesData.cfb || [])
    ]

    console.log(`📊 Found ${allGames.length} games to process`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each game
    for (const game of allGames) {
      const sport = game.sport || 'nfl'
      const gameId = game.gameId

      try {
        console.log(`🎯 Generating script for ${sport.toUpperCase()} game: ${gameId}`)

        // Check if script already exists and was generated recently (within 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        
        const { data: existingScript } = await supabase
          .from('game_scripts')
          .select('generated_at')
          .eq('game_id', gameId)
          .eq('sport', sport)
          .gte('generated_at', oneHourAgo)
          .single()

        if (existingScript) {
          console.log(`⏭️  Script already fresh for ${gameId}, skipping`)
          successCount++
          continue
        }

        // Generate script via API
        const generateResponse = await fetch(`${baseUrl}/api/game-intelligence/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': process.env.CRON_SECRET || '' // Cron authentication
          },
          body: JSON.stringify({
            gameId,
            sport,
            league: sport // Add league field for compatibility
          })
        })

        if (generateResponse.ok) {
          console.log(`✅ Successfully generated script for ${gameId}`)
          successCount++
        } else {
          const errorText = await generateResponse.text()
          console.error(`❌ Failed to generate script for ${gameId}: ${errorText}`)
          errors.push(`${gameId}: ${errorText}`)
          errorCount++
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        console.error(`❌ Error processing ${gameId}:`, error)
        errors.push(`${gameId}: ${error.message}`)
        errorCount++
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalGames: allGames.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 5) // Only return first 5 errors to avoid huge response
    }

    console.log('🏁 [CRON] Job completed:', summary)

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      ...summary
    })

  } catch (error: any) {
    console.error('❌ [CRON] Fatal error:', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        message: error.message 
      },
      { status: 500 }
    )
  }
}

