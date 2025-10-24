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
      
      // ALSO test direct fetch to see raw response
      const testUrl = `https://api.trendlinelabs.ai/api/${league}/games/${testGame.game_id}/player-props`
      logs.push(`Direct test URL: ${testUrl}`)
      
      // Try lowercase x-api-key
      try {
        const directResponse = await fetch(testUrl, {
          headers: {
            'x-api-key': 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'
          }
        })
        logs.push(`Test 1 (x-api-key lowercase): ${directResponse.status}`)
        if (directResponse.ok) {
          const data = await directResponse.json()
          logs.push(`✅ SUCCESS with lowercase! Got ${Array.isArray(data) ? data.length : 0} items`)
        }
      } catch (e: any) {
        logs.push(`Test 1 error: ${e.message}`)
      }
      
      // Try uppercase X-API-KEY
      try {
        const directResponse = await fetch(testUrl, {
          headers: {
            'X-API-KEY': 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'
          }
        })
        logs.push(`Test 2 (X-API-KEY uppercase): ${directResponse.status}`)
        if (directResponse.ok) {
          const data = await directResponse.json()
          logs.push(`✅ SUCCESS with uppercase! Got ${Array.isArray(data) ? data.length : 0} items`)
        }
      } catch (e: any) {
        logs.push(`Test 2 error: ${e.message}`)
      }
      
      // Try X-Api-Key (Title case)
      try {
        const directResponse = await fetch(testUrl, {
          headers: {
            'X-Api-Key': 'cd4a0edc-8df6-4158-a0ac-ca968df17cd3'
          }
        })
        logs.push(`Test 3 (X-Api-Key title case): ${directResponse.status}`)
        if (directResponse.ok) {
          const data = await directResponse.json()
          logs.push(`✅ SUCCESS with title case! Got ${Array.isArray(data) ? data.length : 0} items`)
        }
      } catch (e: any) {
        logs.push(`Test 3 error: ${e.message}`)
      }
      
      let propCategories = null
      try {
        propCategories = await fetchPlayerProps(league, testGame.game_id)
        logs.push(`fetchPlayerProps returned: ${propCategories ? `DATA (${Array.isArray(propCategories) ? propCategories.length : 'not array'} items)` : 'NULL'}`)
      } catch (fetchError: any) {
        logs.push(`❌ fetchPlayerProps THREW ERROR: ${fetchError.message}`)
        logs.push(`Stack: ${fetchError.stack}`)
      }
      
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

