/**
 * Fetch upcoming games for analyst pick submission
 * Returns games with team logos, game times, and game IDs
 */

import { NextRequest, NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

const ODDS_API_KEY = process.env.ODDS_API_KEY

// Map our sport names to Odds API sport keys
const SPORT_MAP: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  nba: 'basketball_nba',
  cfb: 'americanfootball_ncaaf',
  cbb: 'basketball_ncaab',
  nhl: 'icehockey_nhl',
  mlb: 'baseball_mlb',
}

// Sport emojis
const SPORT_EMOJI: Record<string, string> = {
  nfl: '🏈',
  nba: '🏀',
  cfb: '🏈',
  cbb: '🏀',
  nhl: '🏒',
  mlb: '⚾',
}

// Map frontend sport names to ClickHouse database sport names
const DB_SPORT_MAP: Record<string, string> = {
  nfl: 'nfl',
  nba: 'nba',
  cfb: 'cfb',
  cbb: 'ncaab', // ClickHouse uses 'ncaab' for college basketball
  nhl: 'nhl',
  mlb: 'mlb',
}

interface OddsAPIGame {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers?: any[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')?.toLowerCase() || 'nfl'

    if (!SPORT_MAP[sport]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid sport. Must be: nfl, nba, cfb, cbb, nhl, or mlb'
      }, { status: 400 })
    }

    if (!ODDS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'ODDS_API_KEY not configured'
      }, { status: 500 })
    }

    // Fetch upcoming games from Odds API
    const oddsApiSport = SPORT_MAP[sport]
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
    
    console.log(`[${sport.toUpperCase()}] Fetching from Odds API...`)
    const oddsResponse = await fetch(oddsUrl, { 
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    if (!oddsResponse.ok) {
      throw new Error(`Odds API error: ${oddsResponse.status}`)
    }

    const games: OddsAPIGame[] = await oddsResponse.json()
    console.log(`[${sport.toUpperCase()}] Got ${games.length} games from Odds API`)

    // Fetch team logos from ClickHouse
    console.log(`[${sport.toUpperCase()}] Fetching team data from ClickHouse...`)
    const dbSport = DB_SPORT_MAP[sport] || sport
    console.log(`[${sport.toUpperCase()}] Querying ClickHouse for sport: '${dbSport}'`)
    const teamLogosQuery = await clickhouseQuery<{
      team_id: number
      espn_team_id: number
      team_name: string
      logo_url: string
      abbreviation: string
    }>(`
      SELECT 
        team_id,
        espn_team_id,
        name as team_name,
        logo_url,
        abbreviation
      FROM teams
      WHERE LOWER(sport) = '${dbSport}' AND logo_url != ''
    `)
    
    console.log(`[${sport.toUpperCase()}] ClickHouse query success: ${teamLogosQuery.success}`)
    console.log(`[${sport.toUpperCase()}] Found ${teamLogosQuery.data?.length || 0} teams with logos`)
    
    if (!teamLogosQuery.success || !teamLogosQuery.data || teamLogosQuery.data.length === 0) {
      console.error(`[${sport.toUpperCase()}] ⚠️ WARNING: No teams found in ClickHouse!`)
      console.error(`[${sport.toUpperCase()}] Query error:`, teamLogosQuery.error)
    } else {
      // Log first few teams for debugging
      console.log(`[${sport.toUpperCase()}] Sample teams:`, teamLogosQuery.data.slice(0, 3).map(t => ({
        name: t.team_name,
        abbr: t.abbreviation,
        has_logo: !!t.logo_url
      })))
    }

    // Create comprehensive mapping of team names
    const teamLogos = new Map()
    console.log(`[${sport.toUpperCase()}] Creating team mappings...`)
    
    teamLogosQuery.data?.forEach(team => {
      // Map by various name formats
      const teamName = team.team_name.toLowerCase()
      const abbr = team.abbreviation?.toLowerCase()
      const words = teamName.split(' ').filter(w => w.length > 0)
      
      // Store by full name (e.g., "tampa bay buccaneers")
      teamLogos.set(teamName, team)
      
      // Store by abbreviation (e.g., "tb", "pit")
      if (abbr) {
        teamLogos.set(abbr, team)
      }
      
      // Store by first two words (e.g., "michigan state" from "michigan state spartans")
      if (words.length >= 2) {
        const firstTwoWords = words.slice(0, 2).join(' ')
        teamLogos.set(firstTwoWords, team)
      }
      
      // Store by all but last word (e.g., "michigan state" from "michigan state spartans")
      if (words.length >= 2) {
        const allButLast = words.slice(0, -1).join(' ')
        teamLogos.set(allButLast, team)
      }
      
      // Store by last word (e.g., "buccaneers", "steelers")
      // But only if it's unique or we need it as a fallback
      const lastWord = words[words.length - 1]
      if (lastWord) {
        teamLogos.set(lastWord, team)
      }
      
      // For names with "St." or numbers, also store alternate versions
      const cleanName = teamName.replace(/st\./gi, 'saint').replace(/\./g, '')
      if (cleanName !== teamName) {
        teamLogos.set(cleanName, team)
        // Also store cleaned partial names
        const cleanWords = cleanName.split(' ').filter(w => w.length > 0)
        if (cleanWords.length >= 2) {
          teamLogos.set(cleanWords.slice(0, 2).join(' '), team)
          teamLogos.set(cleanWords.slice(0, -1).join(' '), team)
        }
      }
      
      // Handle "State" vs "St" variations (e.g., "Michigan State" vs "Michigan St")
      const stateVariation = teamName.replace(/\bstate\b/gi, 'st').replace(/\bst\b/gi, 'state')
      if (stateVariation !== teamName) {
        teamLogos.set(stateVariation, team)
        const stateWords = stateVariation.split(' ').filter(w => w.length > 0)
        if (stateWords.length >= 2) {
          teamLogos.set(stateWords.slice(0, 2).join(' '), team)
        }
      }
    })
    
    console.log(`[${sport.toUpperCase()}] Created ${teamLogos.size} team name variations`)

    // Helper function to find team with flexible matching
    const findTeam = (oddsApiName: string) => {
      const lower = oddsApiName.toLowerCase().trim()
      
      // Try exact match first
      if (teamLogos.has(lower)) {
        return teamLogos.get(lower)
      }
      
      // Clean the name (remove special chars, normalize "St" to "State" or "Saint")
      const cleaned = lower.replace(/\./g, '').replace(/st /gi, 'saint ').replace(/ st$/gi, ' state')
      if (teamLogos.has(cleaned)) {
        return teamLogos.get(cleaned)
      }
      
      // Try matching on multiple words (e.g., "michigan state" should match "michigan state spartans")
      const words = lower.split(' ').filter(w => w.length > 0)
      if (words.length >= 2) {
        // Try matching first two words (e.g., "michigan state")
        const firstTwoWords = words.slice(0, 2).join(' ')
        if (teamLogos.has(firstTwoWords)) {
          return teamLogos.get(firstTwoWords)
        }
        
        // Try matching all words except last (e.g., "michigan state" from "michigan state spartans")
        const allButLast = words.slice(0, -1).join(' ')
        if (teamLogos.has(allButLast)) {
          return teamLogos.get(allButLast)
        }
        
        // Try matching on team name that contains all the words
        let bestMatch: any = null
        let bestMatchScore = 0
        for (const [key, value] of teamLogos.entries()) {
          const keyWords = key.split(' ')
          // Check if all search words are in the key
          const allWordsMatch = words.every(word => 
            keyWords.some(kw => kw.includes(word) || word.includes(kw))
          )
          if (allWordsMatch) {
            // Score by how many words match and length
            const matchingWords = words.filter(word => 
              keyWords.some(kw => kw === word || kw.includes(word) || word.includes(kw))
            ).length
            const score = matchingWords * 10 + key.length
            if (score > bestMatchScore) {
              bestMatchScore = score
              bestMatch = value
            }
          }
        }
        if (bestMatch) {
          return bestMatch
        }
      }
      
      // Try last word match (e.g., "Buccaneers" from "Tampa Bay Buccaneers")
      // But only if it's a unique match or we have no better option
      const lastWord = words[words.length - 1]
      if (lastWord && lastWord.length > 3) {
        // Check if multiple teams have this last word
        const matchesWithLastWord: any[] = []
        for (const [key, value] of teamLogos.entries()) {
          if (key === lastWord || key.endsWith(` ${lastWord}`) || key === `${lastWord}s` || key === `${lastWord}es`) {
            matchesWithLastWord.push(value)
          }
        }
        // Only use last word match if it's unique or if the full name contains more context
        if (matchesWithLastWord.length === 1) {
          return matchesWithLastWord[0]
        } else if (matchesWithLastWord.length > 1 && words.length >= 2) {
          // Multiple matches - try to find the one that matches more words
          let bestLastWordMatch: any = null
          let bestLastWordScore = 0
          for (const match of matchesWithLastWord) {
            const matchName = match.team_name.toLowerCase()
            const matchWords = matchName.split(' ')
            const matchingWords = words.filter(word => 
              matchWords.some(mw => mw === word || mw.includes(word) || word.includes(mw))
            ).length
            if (matchingWords > bestLastWordScore) {
              bestLastWordScore = matchingWords
              bestLastWordMatch = match
            }
          }
          if (bestLastWordMatch) {
            return bestLastWordMatch
          }
        }
      }
      
      // Try abbreviation match (e.g., "TB" from "Tampa Bay")
      if (words.length > 1) {
        const abbr = words.map(w => w[0]).join('')
        if (teamLogos.has(abbr)) {
          return teamLogos.get(abbr)
        }
      }
      
      // Last resort: try partial match, but prioritize matches that contain multiple words
      let bestPartialMatch: any = null
      let bestPartialScore = 0
      for (const [key, value] of teamLogos.entries()) {
        if (lower.includes(key) || key.includes(lower)) {
          // Score by length and how many words match
          const keyWords = key.split(' ')
          const matchingWords = words.filter(word => 
            keyWords.some(kw => kw.includes(word) || word.includes(kw))
          ).length
          const score = matchingWords * 10 + key.length
          if (score > bestPartialScore) {
            bestPartialScore = score
            bestPartialMatch = value
          }
        }
      }
      
      return bestPartialMatch
    }

    // Match games with team data
    const gamesWithLogos = games.map(game => {
      const homeTeam = findTeam(game.home_team)
      const awayTeam = findTeam(game.away_team)

      // Log if we couldn't find team logos
      if (!homeTeam) {
        console.log(`[${sport.toUpperCase()}] ❌ Could not find home team: "${game.home_team}"`)
      } else {
        console.log(`[${sport.toUpperCase()}] ✅ Found home team: "${game.home_team}" → ${homeTeam.team_name} (${homeTeam.logo_url ? 'HAS LOGO' : 'NO LOGO'})`)
      }
      if (!awayTeam) {
        console.log(`[${sport.toUpperCase()}] ❌ Could not find away team: "${game.away_team}"`)
      } else {
        console.log(`[${sport.toUpperCase()}] ✅ Found away team: "${game.away_team}" → ${awayTeam.team_name} (${awayTeam.logo_url ? 'HAS LOGO' : 'NO LOGO'})`)
      }

      // Generate game_id in format: NFL-20251225-DEN-KC
      const gameDate = new Date(game.commence_time)
      const dateStr = gameDate.toISOString().split('T')[0].replace(/-/g, '')
      const homeAbbr = homeTeam?.abbreviation || game.home_team.substring(0, 3).toUpperCase()
      const awayAbbr = awayTeam?.abbreviation || game.away_team.substring(0, 3).toUpperCase()
      const gameId = `${sport.toUpperCase()}-${dateStr}-${awayAbbr}-${homeAbbr}`

      return {
        game_id: gameId,
        odds_api_id: game.id,
        sport: sport.toUpperCase(),
        sport_emoji: SPORT_EMOJI[sport],
        home_team: game.home_team,
        away_team: game.away_team,
        home_team_abbr: homeAbbr,
        away_team_abbr: awayAbbr,
        home_team_logo: homeTeam?.logo_url || null,
        away_team_logo: awayTeam?.logo_url || null,
        game_time: game.commence_time,
        game_time_est: new Date(game.commence_time).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        has_odds: game.bookmakers && game.bookmakers.length > 0
      }
    })

    console.log(`[${sport.toUpperCase()}] Returning ${gamesWithLogos.length} games`)

    // Sort by game time (soonest first)
    gamesWithLogos.sort((a, b) => 
      new Date(a.game_time).getTime() - new Date(b.game_time).getTime()
    )

    return NextResponse.json({
      success: true,
      sport,
      games: gamesWithLogos,
      total: gamesWithLogos.length
    })

  } catch (error: any) {
    console.error('[ANALYST PICKS] Error fetching upcoming games:', error)
    console.error('[ANALYST PICKS] Error stack:', error.stack)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


