import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY

async function debugSportsData() {
  if (!SPORTSDATA_API_KEY) {
    console.error('SPORTSDATA_IO_SPLITS_KEY not set')
    return
  }

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  // ==================== NHL ====================
  const nhlSeason = currentMonth >= 9 ? currentYear + 1 : currentYear
  console.log(`\n${'='.repeat(60)}`)
  console.log(`NHL Games (Season ${nhlSeason})`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    const nhlUrl = `https://api.sportsdata.io/v3/nhl/scores/json/Games/${nhlSeason}?key=${SPORTSDATA_API_KEY}`
    const nhlResp = await fetch(nhlUrl)
    
    if (nhlResp.ok) {
      const allGames = await nhlResp.json()
      
      const upcomingGames = allGames.filter((g: any) => {
        const gameDate = (g.Day || g.DateTime || '').split('T')[0]
        return gameDate >= today && gameDate <= tomorrow
      })
      
      console.log(`Found ${upcomingGames.length} NHL games for today/tomorrow`)
      
      for (const game of upcomingGames.slice(0, 8)) {
        console.log(`\nGame ${game.GameID}: ${game.AwayTeam} @ ${game.HomeTeam}`)
        console.log(`  HomeTeam: ${game.HomeTeam} | HomeTeamName: ${game.HomeTeamName || 'N/A'}`)
        console.log(`  AwayTeam: ${game.AwayTeam} | AwayTeamName: ${game.AwayTeamName || 'N/A'}`)
        
        // Try to get splits
        try {
          const splitsUrl = `https://api.sportsdata.io/v3/nhl/odds/json/BettingSplitsByGameId/${game.GameID}?key=${SPORTSDATA_API_KEY}`
          const splitsResp = await fetch(splitsUrl)
          if (splitsResp.ok) {
            const splits = await splitsResp.json()
            if (splits?.BettingMarketSplits?.length > 0) {
              // Show raw data for first game
              if (upcomingGames.indexOf(game) === 0) {
                console.log(`  RAW SPLITS DATA:`)
                console.log(JSON.stringify(splits.BettingMarketSplits[0], null, 2))
              }
              
              const spreadMarket = splits.BettingMarketSplits.find((m: any) => 
                m.BettingBetType?.toLowerCase().includes('spread') || 
                m.BettingBetType?.toLowerCase().includes('puck')
              )
              if (spreadMarket) {
                const homeSplit = spreadMarket.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
                console.log(`  Splits: YES - ${spreadMarket.BettingBetType}`)
                console.log(`    BettingSplits: ${JSON.stringify(spreadMarket.BettingSplits)}`)
              } else {
                console.log(`  Splits: YES but no spread market`)
                console.log(`    Markets: ${splits.BettingMarketSplits.map((m: any) => m.BettingBetType).join(', ')}`)
              }
            } else {
              console.log(`  Splits: NO`)
            }
          } else {
            console.log(`  Splits API: ${splitsResp.status}`)
          }
        } catch (e) {
          console.log(`  Splits error: ${e}`)
        }
      }
    } else {
      console.log(`NHL API error: ${nhlResp.status}`)
    }
  } catch (e) {
    console.error('NHL error:', e)
  }

  // ==================== CBB ====================
  const cbbSeason = currentMonth >= 10 ? currentYear + 1 : currentYear
  console.log(`\n${'='.repeat(60)}`)
  console.log(`CBB Teams List`)
  console.log(`${'='.repeat(60)}`)
  
  // First, try to get the teams list
  try {
    const teamsUrl = `https://api.sportsdata.io/v3/cbb/scores/json/Teams?key=${SPORTSDATA_API_KEY}`
    const teamsResp = await fetch(teamsUrl)
    
    if (teamsResp.ok) {
      const teams = await teamsResp.json()
      console.log(`Found ${teams.length} CBB teams`)
      
      // Show sample teams
      for (const team of teams.slice(0, 15)) {
        console.log(`  ${team.Key || team.TeamID}: ${team.Name || team.School} (${team.ShortDisplayName || 'N/A'})`)
      }
      
      // Show a specific team we know
      const tulane = teams.find((t: any) => t.Key === 'TULANE' || t.Name?.includes('Tulane'))
      if (tulane) {
        console.log(`\n  TULANE details:`)
        console.log(JSON.stringify(tulane, null, 2))
      }
    } else {
      console.log(`CBB Teams API error: ${teamsResp.status}`)
    }
  } catch (e) {
    console.error('CBB Teams error:', e)
  }
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`CBB Games (Season ${cbbSeason})`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    const cbbUrl = `https://api.sportsdata.io/v3/cbb/scores/json/Games/${cbbSeason}?key=${SPORTSDATA_API_KEY}`
    const cbbResp = await fetch(cbbUrl)
    
    if (cbbResp.ok) {
      const allGames = await cbbResp.json()
      
      const upcomingGames = allGames.filter((g: any) => {
        const gameDate = (g.Day || g.DateTime || '').split('T')[0]
        return gameDate >= today && gameDate <= tomorrow
      })
      
      console.log(`Found ${upcomingGames.length} CBB games for today/tomorrow`)
      
      // Show sample games
      for (const game of upcomingGames.slice(0, 5)) {
        console.log(`\nGame ${game.GameID}: ${game.AwayTeam} @ ${game.HomeTeam}`)
        console.log(`  HomeTeamID: ${game.HomeTeamID}, AwayTeamID: ${game.AwayTeamID}`)
      }
    } else {
      console.log(`CBB API error: ${cbbResp.status}`)
    }
  } catch (e) {
    console.error('CBB error:', e)
  }

  // ==================== CFB ====================
  console.log(`\n${'='.repeat(60)}`)
  console.log(`CFB Games (Season ${currentYear})`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    // CFB bowl games are in POST season
    const cfbUrl = `https://api.sportsdata.io/v3/cfb/scores/json/Games/${currentYear}POST?key=${SPORTSDATA_API_KEY}`
    const cfbResp = await fetch(cfbUrl)
    
    if (cfbResp.ok) {
      const allGames = await cfbResp.json()
      
      const upcomingGames = allGames.filter((g: any) => {
        const gameDate = (g.Day || g.DateTime || '').split('T')[0]
        return gameDate >= today && gameDate <= tomorrow
      })
      
      console.log(`Found ${upcomingGames.length} CFB POST games for today/tomorrow`)
      
      for (const game of upcomingGames.slice(0, 10)) {
        console.log(`\nGame ${game.GameID}: ${game.AwayTeam} @ ${game.HomeTeam}`)
        console.log(`  HomeTeamName: ${game.HomeTeamName || 'N/A'}`)
        console.log(`  AwayTeamName: ${game.AwayTeamName || 'N/A'}`)
        console.log(`  Title: ${game.Title || 'N/A'}`)
      }
    } else {
      console.log(`CFB API error: ${cfbResp.status}`)
    }
  } catch (e) {
    console.error('CFB error:', e)
  }
}

debugSportsData()

