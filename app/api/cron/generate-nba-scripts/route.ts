import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use main Supabase project (same as game_scripts table)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://cmulndosilihjhlurbth.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdWxuZG9zaWxpaGpobHVyYnRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjIzMDAwMCwiZXhwIjoyMDYxODA2MDAwfQ.FPqgWV0P7bbawmTkDvPwHK3DtQwnkix1r0-2hN7shWY'
)

/**
 * NBA-specific cron job to pre-generate AI scripts
 * Runs every hour from 10:30am-8:30pm EST (10:30, 11:30, 12:30... 8:30 PM)
 * 
 * Vercel Cron Schedule (in UTC, EST = UTC-5):
 * - 10:30 AM EST = 3:30 PM UTC  = 30 15 * * *
 * - 11:30 AM EST = 4:30 PM UTC  = 30 16 * * *
 * - 12:30 PM EST = 5:30 PM UTC  = 30 17 * * *
 * - 1:30 PM EST  = 6:30 PM UTC  = 30 18 * * *
 * - 2:30 PM EST  = 7:30 PM UTC  = 30 19 * * *
 * - 3:30 PM EST  = 8:30 PM UTC  = 30 20 * * *
 * - 4:30 PM EST  = 9:30 PM UTC  = 30 21 * * *
 * - 5:30 PM EST  = 10:30 PM UTC = 30 22 * * *
 * - 6:30 PM EST  = 11:30 PM UTC = 30 23 * * *
 * - 7:30 PM EST  = 0:30 AM UTC  = 30 0 * * * (next day)
 * - 8:30 PM EST  = 1:30 AM UTC  = 30 1 * * * (next day)
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('\n🏀 ========== NBA SCRIPT GENERATION CRON START ==========')
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
    
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
    
    // Filter for NBA games only
    const allGames = (gamesData.games || []).filter((game: any) => game.sport === 'NBA')
    
    console.log(`📊 Found ${allGames.length} NBA games to process`)
    
    if (allGames.length === 0) {
      console.log('⚠️ No NBA games found today')
      return NextResponse.json({
        success: true,
        message: 'No NBA games to process',
        timestamp: new Date().toISOString(),
        totalGames: 0,
        successCount: 0,
        skippedCount: 0,
        errorCount: 0
      })
    }

    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // OPTIMIZATION: Fetch ALL existing NBA scripts at once (single DB query)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: existingScripts } = await supabase
      .from('game_scripts')
      .select('game_id, sport, generated_at')
      .eq('sport', 'NBA')
      .gte('generated_at', oneHourAgo)
    
    const freshScriptsMap = new Map<string, string>()
    if (existingScripts) {
      existingScripts.forEach(script => {
        freshScriptsMap.set(script.game_id, script.generated_at)
      })
      console.log(`📝 Found ${existingScripts.length} fresh NBA scripts (< 1 hour old)`)
    }

    // Process all NBA games
    for (const game of allGames) {
      const gameId = game.game_id || game.gameId
      const sport = 'NBA'

      try {
        console.log(`🎯 Checking script for NBA game: ${gameId}`)

        // Check if this game has a fresh script (< 1 hour old)
        const existingGeneratedAt = freshScriptsMap.get(gameId)
        
        // Quick check for analyst picks (only if script is fresh, to determine if we force regen)
        let hasAnalystPicks = false
        if (existingGeneratedAt) {
          try {
            const picksCheckUrl = `${baseUrl}/api/analyst-library?gameId=${gameId}`
            const picksCheckRes = await fetch(picksCheckUrl)
            if (picksCheckRes.ok) {
              const picksData = await picksCheckRes.json()
              hasAnalystPicks = picksData.picks && picksData.picks.length > 0
              if (hasAnalystPicks) {
                console.log(`✨ Found ${picksData.picks.length} analyst picks for ${gameId}`)
              }
            }
          } catch (error) {
            console.log(`⚠️ Could not check analyst picks for ${gameId}:`, error)
          }
        }
        
        // Skip if script is fresh AND no analyst picks (analyst picks = force regen for 3-credit strength)
        if (existingGeneratedAt && !hasAnalystPicks) {
          console.log(`⏭️  Script fresh for ${gameId} (generated ${existingGeneratedAt}), skipping`)
          skippedCount++
          continue
        }
        
        if (hasAnalystPicks) {
          console.log(`🔄 Analyst picks found for ${gameId} - forcing regeneration for 3-credit strength`)
        } else if (existingGeneratedAt) {
          console.log(`🔄 Script stale for ${gameId} (generated ${existingGeneratedAt}), regenerating`)
        } else {
          console.log(`🆕 No existing script for ${gameId}, generating new one`)
        }

        // Step 1: Fetch game intelligence data
        console.log(`📊 Fetching game data for ${gameId}...`)
        const dataResponse = await fetch(`${baseUrl}/api/game-intelligence/data?gameId=${gameId}&league=${sport}`)
        
        if (!dataResponse.ok) {
          const errorText = await dataResponse.text()
          console.error(`❌ Failed to fetch game data for ${gameId}: ${errorText}`)
          errors.push(`${gameId}: Failed to fetch data - ${errorText}`)
          errorCount++
          continue
        }

        const gameData = await dataResponse.json()
        console.log(`✅ Game data fetched for ${gameId}, strength: ${gameData.dataStrength}`)

        // Step 2: Generate script via API with the data
        const generateResponse = await fetch(`${baseUrl}/api/game-intelligence/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': process.env.CRON_SECRET || '' // Cron authentication
          },
          body: JSON.stringify({
            gameId,
            league: sport,
            data: gameData // Pass the fetched game data
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

      } catch (error: any) {
        console.error(`❌ Error processing ${gameId}:`, error)
        errors.push(`${gameId}: ${error.message}`)
        errorCount++
      }
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      sport: 'NBA',
      totalGames: allGames.length,
      successCount,
      skippedCount,
      errorCount,
      errors: errors.slice(0, 5) // Only return first 5 errors to avoid huge response
    }

    console.log('\n📊 ========== NBA CRON SUMMARY ==========')
    console.log(`✅ Success: ${successCount}`)
    console.log(`⏭️  Skipped: ${skippedCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log('🏀 ========== NBA SCRIPT GENERATION CRON END ==========\n')

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('❌ NBA Cron job failed:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        timestamp: new Date().toISOString(),
        sport: 'NBA'
      }, 
      { status: 500 }
    )
  }
}

