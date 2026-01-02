import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * CRON JOB: Generate FREE game scripts for upcoming games
 * 
 * Schedule: Every 4 hours
 * - Fetches games with TeamRankings data
 * - Generates FREE scripts (team analysis only, no betting)
 * - Stores in free_game_scripts table
 * 
 * These scripts are promotional content - available to all users for free
 */

// Lazy-load Supabase client
function getSnapshotsClient() {
  return createClient(
    process.env.SNAPSHOTS_SUPABASE_URL || '',
    process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY || ''
  )
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('\n🎬 ===== FREE SCRIPT GENERATION STARTED =====')
  console.log(`Timestamp: ${new Date().toISOString()}`)

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sport from query params
    const { searchParams } = new URL(request.url)
    const sportFilter = searchParams.get('sport')?.toUpperCase()
    const limit = parseInt(searchParams.get('limit') || '10')

    const sportsToProcess = sportFilter ? [sportFilter] : ['NFL', 'NBA', 'CFB', 'CBB', 'NHL']
    console.log(`📋 Sports to process: ${sportsToProcess.join(', ')}`)
    console.log(`📊 Limit per sport: ${limit}`)

    let totalGenerated = 0
    let totalSkipped = 0
    let totalErrors = 0
    const errors: string[] = []

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    for (const sport of sportsToProcess) {
      console.log(`\n🏈 Processing ${sport} games...`)

      // Get upcoming games with TeamRankings data
      const now = new Date()
      const futureDate = new Date(now)
      futureDate.setDate(now.getDate() + (['NFL', 'CFB', 'CBB'].includes(sport) ? 10 : 3))

      const tableName = (sport === 'CFB' || sport === 'CBB') ? 'college_game_snapshots' : 'game_snapshots'
      const supabase = getSnapshotsClient()

      const { data: games, error: fetchError } = await supabase
        .from(tableName)
        .select('game_id, sport, home_team, away_team, start_time_utc, team_rankings')
        .eq('sport', sport)
        .gte('start_time_utc', now.toISOString())
        .lte('start_time_utc', futureDate.toISOString())
        .not('team_rankings', 'is', null) // Only games with TeamRankings data
        .order('start_time_utc', { ascending: true })
        .limit(limit)

      if (fetchError) {
        console.error(`❌ Error fetching ${sport} games:`, fetchError)
        errors.push(`${sport}: Failed to fetch games`)
        totalErrors++
        continue
      }

      if (!games || games.length === 0) {
        console.log(`ℹ️  No upcoming ${sport} games with TeamRankings data`)
        continue
      }

      console.log(`📊 Found ${games.length} ${sport} games with TeamRankings data`)

      // Process games one at a time to avoid overwhelming the AI API
      for (const game of games) {
        try {
          console.log(`\n📝 Generating script for: ${game.away_team} @ ${game.home_team}`)

          // Call the FREE script endpoint
          const response = await fetch(
            `${baseUrl}/api/game-scripts/free?gameId=${game.game_id}&sport=${sport}`,
            {
              headers: {
                'Content-Type': 'application/json'
              },
              // 60 second timeout for AI generation
            }
          )

          if (response.ok) {
            const data = await response.json()
            if (data.cached) {
              console.log(`⏭️  Script already cached for ${game.game_id}`)
              totalSkipped++
            } else {
              console.log(`✅ Generated new script for ${game.game_id}`)
              totalGenerated++
            }
          } else {
            const errorData = await response.json()
            console.error(`❌ Failed to generate script for ${game.game_id}:`, errorData.error)
            errors.push(`${game.game_id}: ${errorData.error}`)
            totalErrors++
          }

          // Small delay between generations to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))

        } catch (error: any) {
          console.error(`❌ Error processing ${game.game_id}:`, error.message)
          errors.push(`${game.game_id}: ${error.message}`)
          totalErrors++
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const summary = {
      success: true,
      sports: sportsToProcess,
      totalGenerated,
      totalSkipped,
      totalErrors,
      errors: errors.slice(0, 10),
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    }

    console.log('\n✅ ===== FREE SCRIPT GENERATION COMPLETE =====')
    console.log(`Generated: ${totalGenerated}, Skipped: ${totalSkipped}, Errors: ${totalErrors}, Duration: ${duration}s`)

    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('❌ Fatal error in free script generation:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

