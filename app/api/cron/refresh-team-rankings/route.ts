import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scrapeTeamRankings } from '@/lib/team-rankings-scraper'
import { scrapeMoneyPuck } from '@/lib/moneypuck-scraper'

// Lazy-load Supabase client to avoid build-time initialization
function getSupabaseClient() {
  const supabaseUrl = process.env.SNAPSHOTS_SUPABASE_URL
  const supabaseServiceKey = process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * CRON JOB: Refresh TeamRankings data for upcoming games
 * 
 * Schedule:
 * - NFL: Tuesday 6 AM ET (after MNF, before next week)
 * - NBA: Daily 7 AM ET
 * - NHL: Daily 7 AM ET (future)
 * - NCAAF: Tuesday 6 AM ET (future)
 * 
 * This runs LESS frequently than refresh-game-snapshots because
 * team stats don't change much - only after games are played.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('\n🔄 ===== TEAM RANKINGS REFRESH STARTED =====')
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
    const forceRefresh = searchParams.get('force') === 'true'

    const sportsToRefresh = sportFilter ? [sportFilter] : ['NFL', 'NBA', 'CFB', 'NHL']
    console.log(`📋 Sports to refresh: ${sportsToRefresh.join(', ')}`)
    if (forceRefresh) console.log('⚠️  FORCE REFRESH enabled - will update all games')

    let totalUpdated = 0
    let totalErrors = 0
    const errors: string[] = []

    for (const sport of sportsToRefresh) {
      console.log(`\n🏈 Processing ${sport} games...`)

      // Get upcoming games that need team stats refresh
      // For NFL/CFB: next 10 days (covers current week)
      // For NBA/NHL: next 2 days (frequent games)
      const now = new Date()
      const futureDate = new Date(now)
      futureDate.setDate(now.getDate() + (['NFL', 'CFB'].includes(sport) ? 10 : 2))

      const supabase = getSupabaseClient()
      const query = supabase
        .from('game_snapshots')
        .select('id, game_id, sport, home_team, away_team, start_time_utc, team_rankings')
        .eq('sport', sport)
        .gte('start_time_utc', now.toISOString())
        .lte('start_time_utc', futureDate.toISOString())
        .order('start_time_utc', { ascending: true })

      const { data: games, error: fetchError } = await query

      if (fetchError) {
        console.error(`❌ Error fetching ${sport} games:`, fetchError)
        errors.push(`${sport}: Failed to fetch games`)
        totalErrors++
        continue
      }

      if (!games || games.length === 0) {
        console.log(`ℹ️  No upcoming ${sport} games found`)
        continue
      }

      console.log(`📊 Found ${games.length} upcoming ${sport} games`)

      // Process games in batches of 5 to avoid overwhelming the scraper
      const batchSize = 5
      for (let i = 0; i < games.length; i += batchSize) {
        const batch = games.slice(i, i + batchSize)
        console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(games.length / batchSize)}`)

        const updates = await Promise.allSettled(
          batch.map(async (game) => {
            try {
              // Check if we should skip this game
              if (!forceRefresh && game.team_rankings) {
                const fetchedAt = game.team_rankings.fetched_at
                if (fetchedAt) {
                  const hoursSinceFetch = (Date.now() - new Date(fetchedAt).getTime()) / (1000 * 60 * 60)
                  
                  // Skip if refreshed in last 12 hours (data doesn't change that often)
                  if (hoursSinceFetch < 12) {
                    console.log(`⏭️  Skipping ${game.game_id} (refreshed ${hoursSinceFetch.toFixed(1)}h ago)`)
                    return { skipped: true }
                  }
                }
              }

              console.log(`\n📊 Fetching team stats for: ${game.away_team} @ ${game.home_team}`)

              // Scrape team stats based on sport
              let homeData, awayData
              
              if (sport === 'NHL') {
                // NHL uses MoneyPuck
                [homeData, awayData] = await Promise.all([
                  scrapeMoneyPuck(game.home_team),
                  scrapeMoneyPuck(game.away_team)
                ])
              } else {
                // NFL, NBA, CFB use TeamRankings
                [homeData, awayData] = await Promise.all([
                  scrapeTeamRankings(sport.toLowerCase(), game.home_team),
                  scrapeTeamRankings(sport.toLowerCase(), game.away_team)
                ])
              }

              if (!homeData || !awayData) {
                throw new Error(`Failed to scrape team stats: ${!homeData ? 'Home' : ''} ${!awayData ? 'Away' : ''}`)
              }

              // Combine into single object
              const teamRankings = {
                home_team: homeData,
                away_team: awayData,
                fetched_at: new Date().toISOString()
              }

              // Update game_snapshots
              const supabaseUpdate = getSupabaseClient()
              const { error: updateError } = await supabaseUpdate
                .from('game_snapshots')
                .update({ 
                  team_rankings: teamRankings,
                  updated_at: new Date().toISOString()
                })
                .eq('id', game.id)

              if (updateError) {
                throw updateError
              }

              console.log(`✅ Updated TeamRankings for ${game.game_id}`)
              return { success: true, gameId: game.game_id }

            } catch (error: any) {
              console.error(`❌ Error updating ${game.game_id}:`, error.message)
              errors.push(`${game.game_id}: ${error.message}`)
              totalErrors++
              return { success: false, gameId: game.game_id, error: error.message }
            }
          })
        )

        // Count successes
        const batchSuccesses = updates.filter(
          (result) => result.status === 'fulfilled' && result.value.success
        ).length
        const batchSkipped = updates.filter(
          (result) => result.status === 'fulfilled' && result.value.skipped
        ).length
        
        totalUpdated += batchSuccesses
        console.log(`✅ Batch complete: ${batchSuccesses} updated, ${batchSkipped} skipped`)

        // Small delay between batches to be nice to TeamRankings
        if (i + batchSize < games.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const summary = {
      success: true,
      sports: sportsToRefresh,
      totalUpdated,
      totalErrors,
      errors: errors.slice(0, 10), // Limit error list
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    }

    console.log('\n✅ ===== TEAM RANKINGS REFRESH COMPLETE =====')
    console.log(`Updated: ${totalUpdated}, Errors: ${totalErrors}, Duration: ${duration}s`)
    
    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('❌ Fatal error in team rankings refresh:', error)
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

