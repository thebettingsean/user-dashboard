import { NextResponse } from 'next/server'
import { fetchGames, fetchPlayerProps, type League, type PlayerProp } from '@/lib/api/sportsData'
import { getSportPriority, getDateRangeForSport } from '@/lib/utils/sportSelector'

export interface TopProp {
  player_name: string
  team: string | null
  prop_description: string
  hit_rate: number
  record: string
  prop_type: string
  line: number
  odds: number
}

export interface PropsWidgetData {
  props: Array<{ league: string; props: TopProp[] }>
}

export async function GET() {
  try {
    console.log('\n=== TOP PROPS WIDGET DEBUG START ===')
    
    const { primary, fallbacks } = getSportPriority()
    const leagues = [primary, ...fallbacks] as League[]
    
    console.log('Sport priority:', leagues)
    
    const allProps: Array<{ league: string; prop: TopProp }> = []
    
    // Fetch props for each sport
    for (const league of leagues) {
      const { from, to } = getDateRangeForSport(league)
      const games = await fetchGames(league, from, to)
      
      if (games.length === 0) {
        console.log(`No games for ${league}`)
        continue
      }
      
      console.log(`Checking ${games.length} ${league.toUpperCase()} games for props`)
      
      // Sort games chronologically
      const sortedGames = [...games].sort((a, b) => {
        return new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
      })
      
      // Check first 3 games for props
      for (const game of sortedGames.slice(0, 3)) {
        console.log(`Fetching props for ${game.game_id}`)
        const propCategories = await fetchPlayerProps(league, game.game_id)
        
        if (!propCategories) {
          console.log(`No prop categories returned for ${game.game_id}`)
          continue
        }
        
        console.log(`Got ${propCategories.length} prop categories for ${game.game_id}`)
        
        // Get team abbreviations from game
        const awayTeam = game.away_team || 'AWAY'
        const homeTeam = game.home_team || 'HOME'
        
        // Extract all player props with ≥65% hit rate
        for (const category of propCategories) {
          console.log(`Checking ${category.title}: ${category.players.length} players`)
          
          for (const player of category.players) {
            const hitRate = player.record.total > 0 
              ? (player.record.hit / player.record.total) * 100
              : 0
            
            console.log(`${player.player_name} ${player.prop_type} ${player.opening_line}: ${hitRate.toFixed(1)}% (${player.record.hit}/${player.record.total})`)
            
            // Check odds filter: no odds worse than -200
            const odds = player.best_line?.opening_odds || 0
            if (odds <= -201) {
              console.log(`  ✗ Skipping ${player.player_name} - odds too bad: ${odds}`)
              continue
            }
            
            if (hitRate >= 65 && player.record.total >= 10) {
              const propDescription = `${player.prop_type.toUpperCase()} ${player.opening_line} ${category.title.replace(' (Over/Under)', '').replace(' (Yes/No)', '')}`
              
              console.log(`✅ QUALIFIED: ${player.player_name} - ${propDescription}`)
              
              // Get team from player data (if available), otherwise null
              const playerTeam = (player as any).team || null
              
              allProps.push({
                league: league.toUpperCase(),
                prop: {
                  player_name: player.player_name,
                  team: playerTeam,
                  prop_description: propDescription,
                  hit_rate: Math.round(hitRate * 10) / 10,
                  record: `${player.record.hit}-${player.record.miss}`,
                  prop_type: player.prop_type,
                  line: player.opening_line,
                  odds: odds
                }
              })
            }
          }
        }
      }
      
      console.log(`Found ${allProps.filter(p => p.league === league.toUpperCase()).length} props for ${league.toUpperCase()}`)
    }
    
    // Sort all props by hit rate (highest first)
    allProps.sort((a, b) => b.prop.hit_rate - a.prop.hit_rate)
    
    // Group by league and limit
    const groupedProps: Array<{ league: string; props: TopProp[] }> = []
    let remainingSlots = 5
    
    for (const league of leagues.map(l => l.toUpperCase())) {
      const leagueProps = allProps
        .filter(p => p.league === league)
        .slice(0, remainingSlots)
        .map(p => p.prop)
      
      if (leagueProps.length > 0) {
        groupedProps.push({ league, props: leagueProps })
        remainingSlots -= leagueProps.length
        
        if (remainingSlots <= 0) break
      }
    }
    
    console.log('Final props:', groupedProps.map(g => `${g.league}: ${g.props.length}`).join(', '))
    console.log('=== TOP PROPS WIDGET DEBUG END ===\n')
    
    return NextResponse.json({
      props: groupedProps
    })
    
  } catch (error) {
    console.error('Error in props widget data:', error)
    return NextResponse.json({
      props: []
    })
  }
}

