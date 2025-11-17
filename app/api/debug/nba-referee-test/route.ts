import { NextRequest, NextResponse } from 'next/server'
import { fetchGames, fetchRefereeStats } from '@/lib/api/sportsData'

/**
 * DEBUG ENDPOINT: Test NBA referee data fetching
 * GET /api/debug/nba-referee-test
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n🔍 ===== NBA REFEREE DEBUG TEST =====\n')

    // Get today's NBA games
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    
    console.log(`📅 Fetching NBA games for: ${today} to ${tomorrow}`)
    const games = await fetchGames('nba', today, tomorrow)
    
    if (games.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No NBA games found for today',
        date: today
      })
    }

    console.log(`\n✅ Found ${games.length} NBA games\n`)

    // Test referee fetching for each game
    const results = []
    for (const game of games) {
      console.log(`\n📊 Testing game: ${game.away_team} @ ${game.home_team} (${game.game_id})`)
      console.log(`   Referee in game object: ${game.referee_name || 'NOT SET'}`)
      
      try {
        const refereeStats = await fetchRefereeStats('nba', game.game_id)
        
        if (refereeStats) {
          console.log(`   ✅ Referee stats FOUND:`, {
            name: refereeStats.referee_name,
            total_games: refereeStats.total_games,
            over_percentage: refereeStats.over_under?.over_under?.over_percentage,
            under_percentage: refereeStats.over_under?.over_under?.under_percentage
          })
          
          results.push({
            game_id: game.game_id,
            matchup: `${game.away_team} @ ${game.home_team}`,
            referee_found: true,
            referee_name: refereeStats.referee_name,
            total_games: refereeStats.total_games,
            over_under_data: refereeStats.over_under?.over_under || null
          })
        } else {
          console.log(`   ❌ Referee stats NOT FOUND`)
          results.push({
            game_id: game.game_id,
            matchup: `${game.away_team} @ ${game.home_team}`,
            referee_found: false,
            error: 'No referee stats returned from API'
          })
        }
      } catch (error: any) {
        console.error(`   ❌ ERROR fetching referee stats:`, error.message)
        results.push({
          game_id: game.game_id,
          matchup: `${game.away_team} @ ${game.home_team}`,
          referee_found: false,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      total_games: games.length,
      results,
      summary: {
        referee_found: results.filter(r => r.referee_found).length,
        referee_missing: results.filter(r => !r.referee_found).length
      }
    })

  } catch (error: any) {
    console.error('❌ Debug test failed:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

