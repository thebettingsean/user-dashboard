import { NextRequest, NextResponse } from 'next/server'

/**
 * CRON JOB: Generate FREE game scripts for upcoming games
 * 
 * 100% INDEPENDENT SYSTEM - NO TRENDLINE LABS
 * 
 * Schedule: Daily at 9 AM ET (14:00 UTC)
 * 
 * Flow:
 * 1. Fetch upcoming games from ODDS API
 * 2. For each game:
 *    a) Scrape TeamRankings.com for both teams
 *    b) Send to Claude for script generation
 *    c) Store in free_game_scripts table
 * 
 * Sports: NFL, NBA, NHL, CFB, CBB
 */

// Odds API sport keys mapping
const ODDS_API_SPORTS: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  nhl: 'icehockey_nhl',
  cfb: 'americanfootball_ncaaf',
  cbb: 'basketball_ncaab'
}

interface OddsApiGame {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('\n🎬 ===== FREE SCRIPT GENERATION CRON STARTED =====')
  console.log(`Timestamp: ${new Date().toISOString()}`)

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional filters from query params
    const { searchParams } = new URL(request.url)
    const sportFilter = searchParams.get('sport')?.toLowerCase()

    // Determine which sports to process
    const sportsToProcess = sportFilter 
      ? [sportFilter] 
      : ['nfl', 'nba', 'nhl', 'cfb', 'cbb']
    
    console.log(`📋 Sports to process: ${sportsToProcess.map(s => s.toUpperCase()).join(', ')}`)

    let totalGenerated = 0
    let totalSkipped = 0
    let totalErrors = 0
    const errors: string[] = []
    const results: any[] = []

    // Use production URL - VERCEL_URL gives deployment URL which doesn't work for internal calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://thebettinginsider.com'

    const ODDS_API_KEY = process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY

    if (!ODDS_API_KEY) {
      console.error('❌ ODDS_API_KEY not configured')
      return NextResponse.json({ error: 'Odds API key not configured' }, { status: 500 })
    }

    // Process each sport
    for (const sport of sportsToProcess) {
      console.log(`\n🏈 Processing ${sport.toUpperCase()} games...`)

      const sportKey = ODDS_API_SPORTS[sport]
      if (!sportKey) {
        console.log(`⚠️ Unknown sport: ${sport}`)
        continue
      }

      // Fetch upcoming games from Odds API
      try {
        const oddsUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,totals&oddsFormat=american`
        
        console.log(`📡 Fetching from Odds API: ${sportKey}`)
        
        const oddsResponse = await fetch(oddsUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 0 }
        })

        if (!oddsResponse.ok) {
          const errorText = await oddsResponse.text()
          console.error(`❌ Odds API error for ${sport}: ${oddsResponse.status} - ${errorText}`)
          errors.push(`${sport.toUpperCase()}: Odds API error ${oddsResponse.status}`)
          totalErrors++
          continue
        }

        const games: OddsApiGame[] = await oddsResponse.json()
        
        if (!games || games.length === 0) {
          console.log(`ℹ️  No upcoming ${sport.toUpperCase()} games found`)
          continue
        }

        // Filter to upcoming games only (next 7 days)
        const now = new Date()
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        
        const upcomingGames = games.filter(g => {
          const gameTime = new Date(g.commence_time)
          return gameTime > now && gameTime < sevenDaysFromNow
        })

        console.log(`📊 Found ${upcomingGames.length} upcoming ${sport.toUpperCase()} games`)

        // Process each game
        for (const game of upcomingGames) {
          try {
            console.log(`\n📝 ${game.away_team} @ ${game.home_team}`)

            // Call the FREE script endpoint with all required params
            const scriptUrl = new URL(`${baseUrl}/api/game-scripts/free`)
            scriptUrl.searchParams.set('gameId', game.id)
            scriptUrl.searchParams.set('sport', sport)
            scriptUrl.searchParams.set('homeTeam', game.home_team)
            scriptUrl.searchParams.set('awayTeam', game.away_team)
            scriptUrl.searchParams.set('gameTime', game.commence_time)

            console.log(`   🔗 Calling: ${scriptUrl.toString().substring(0, 100)}...`)

            const response = await fetch(scriptUrl.toString(), {
              headers: { 'Content-Type': 'application/json' }
            })

            // Check if we got HTML instead of JSON (error page)
            const contentType = response.headers.get('content-type') || ''
            if (!contentType.includes('application/json')) {
              const text = await response.text()
              console.error(`   ❌ Got HTML instead of JSON (status: ${response.status})`)
              console.error(`   Response preview: ${text.substring(0, 100)}`)
              errors.push(`${game.id}: Got HTML response (${response.status})`)
              totalErrors++
              continue
            }

            const data = await response.json()

            if (response.ok) {
              if (data.cached) {
                console.log(`⏭️  Script already cached`)
                totalSkipped++
              } else {
                console.log(`✅ Generated new script`)
                totalGenerated++
              }
              
              results.push({
                gameId: game.id,
                sport: sport.toUpperCase(),
                matchup: `${game.away_team} @ ${game.home_team}`,
                status: data.cached ? 'cached' : 'generated'
              })
            } else {
              console.error(`❌ Failed: ${data.error}`)
              errors.push(`${game.id}: ${data.error}`)
              totalErrors++
              
              results.push({
                gameId: game.id,
                sport: sport.toUpperCase(),
                matchup: `${game.away_team} @ ${game.home_team}`,
                status: 'error',
                error: data.error
              })
            }

            // Delay between generations (2 seconds) to:
            // 1. Avoid rate limiting Claude API
            // 2. Give TeamRankings scraper time
            await new Promise(resolve => setTimeout(resolve, 2000))

          } catch (gameError: any) {
            console.error(`❌ Error processing ${game.id}:`, gameError.message)
            errors.push(`${game.id}: ${gameError.message}`)
            totalErrors++
          }
        }

      } catch (sportError: any) {
        console.error(`❌ Error processing ${sport}:`, sportError.message)
        errors.push(`${sport.toUpperCase()}: ${sportError.message}`)
        totalErrors++
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const summary = {
      success: true,
      sports: sportsToProcess.map(s => s.toUpperCase()),
      totalGenerated,
      totalSkipped,
      totalErrors,
      errors: errors.slice(0, 15),
      results: results.slice(0, 30),
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    }

    console.log('\n✅ ===== FREE SCRIPT GENERATION COMPLETE =====')
    console.log(`Generated: ${totalGenerated}, Cached: ${totalSkipped}, Errors: ${totalErrors}`)
    console.log(`Duration: ${duration}s`)

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
export const maxDuration = 800 // Pro plan max (13.3 minutes)
