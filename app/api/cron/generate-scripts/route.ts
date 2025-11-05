import { NextRequest, NextResponse } from 'next/server'
import { supabaseMain } from '@/lib/supabase'

/**
 * Cron job to pre-generate AI scripts for all games
 * Runs every 1.5 hours between 9am-7pm EST
 * 
 * Vercel Cron Schedule (in UTC):
 * - 9:00 AM EST = 2:00 PM UTC  -> 0 14 * * *
 * - 10:30 AM EST = 3:30 PM UTC -> 30 15 * * *
 * - 12:00 PM EST = 5:00 PM UTC -> 0 17 * * *
 * - 1:30 PM EST = 6:30 PM UTC  -> 30 18 * * *
 * - 3:00 PM EST = 8:00 PM UTC  -> 0 20 * * *
 * - 4:30 PM EST = 9:30 PM UTC  -> 30 21 * * *
 * - 6:00 PM EST = 11:00 PM UTC -> 0 23 * * *
 * - 7:00 PM EST = 12:00 AM UTC -> 0 0 * * * (next day)
 * 
 * Add all these to vercel.json cron config
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🤖 [CRON] Starting script generation job...')

    // Get all upcoming games from API
    const gamesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/games/today`)
    
    if (!gamesResponse.ok) {
      throw new Error('Failed to fetch games')
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
        
        const { data: existingScript } = await supabaseMain
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
        const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/game-intelligence/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-job': 'true' // Flag to identify cron requests
          },
          body: JSON.stringify({
            gameId,
            sport,
            fromCron: true
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

