import { NextResponse } from 'next/server'
import { fetchGames, fetchPlayerProps, type League } from '@/lib/api/sportsData'
import { getSportPriority, getDateRangeForSport } from '@/lib/utils/sportSelector'

export async function GET() {
  const logs: string[] = []
  
  try {
    logs.push('=== PROPS TEST START ===')
    
    const { primary, fallbacks } = getSportPriority()
    const leagues = [primary, ...fallbacks] as League[]
    
    logs.push(`Sport priority: ${leagues.join(', ')}`)
    
    for (const league of leagues) {
      const { from, to } = getDateRangeForSport(league)
      logs.push(`\nChecking ${league.toUpperCase()}: ${from} to ${to}`)
      
      const games = await fetchGames(league, from, to)
      logs.push(`Found ${games.length} games for ${league}`)
      
      if (games.length === 0) continue
      
      const sortedGames = [...games].sort((a, b) => {
        return new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
      })
      
      // Test first game only
      const testGame = sortedGames[0]
      logs.push(`Testing game: ${testGame.game_id} (${testGame.name})`)
      
      logs.push(`Calling fetchPlayerProps...`)
      const propCategories = await fetchPlayerProps(league, testGame.game_id)
      logs.push(`fetchPlayerProps returned: ${propCategories ? 'DATA' : 'NULL'}`)
      
      if (!propCategories) {
        logs.push(`❌ No props returned for ${testGame.game_id}`)
        logs.push(`This means either: 1) API returned non-200, 2) API returned empty array, 3) Fetch threw error`)
        continue
      }
      
      logs.push(`✅ Got ${propCategories.length} prop categories`)
      
      // Check first category
      if (propCategories.length > 0) {
        const firstCat = propCategories[0]
        logs.push(`\nFirst category: ${firstCat.title}`)
        logs.push(`Players: ${firstCat.players.length}`)
        
        // Check first 5 players
        firstCat.players.slice(0, 5).forEach(player => {
          const hitRate = (player.record.hit / player.record.total) * 100
          logs.push(`  ${player.player_name}: ${hitRate.toFixed(1)}% (${player.record.hit}-${player.record.miss}) ${player.prop_type} ${player.opening_line}`)
        })
      }
      
      // Only test one league
      break
    }
    
    logs.push('\n=== TEST END ===')
    
    return NextResponse.json({
      logs,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      logs
    }, { status: 500 })
  }
}

