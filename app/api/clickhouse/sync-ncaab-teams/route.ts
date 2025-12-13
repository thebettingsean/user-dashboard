import { NextResponse } from 'next/server'
import { clickhouseInsert } from '@/lib/clickhouse'

// ESPN API for Men's College Basketball
// Docs: https://github.com/pseudo-r/Public-ESPN-API
const ESPN_NCAAB_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball'

// Power conferences and major conferences for filtering
const MAJOR_CONFERENCES = [
  'SEC', 'Big Ten', 'Big 12', 'ACC', 'Big East',
  'American Athletic', 'Mountain West', 'West Coast',
  'Atlantic 10', 'Missouri Valley', 'Colonial Athletic',
  'Pac-12', 'Southeastern', 'Atlantic Coast'
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'all' // 'all', 'power', or page number
  
  try {
    console.log('[NCAAB Sync] Starting Men\'s College Basketball team sync...')

    const summary = {
      teams_synced: 0,
      teams_found: 0,
      pages_fetched: 0,
      errors: [] as string[]
    }

    const teamsData: any[] = []
    
    // ESPN teams list endpoint with pagination
    // NCAAB has 350+ teams, so we need careful pagination
    let page = 1
    let hasMore = true
    const maxPages = 8 // ~800 teams max, D1 has ~350
    
    while (hasMore && page <= maxPages) {
      try {
        const url = `${ESPN_NCAAB_URL}/teams?limit=100&page=${page}`
        console.log(`[NCAAB Sync] Fetching page ${page}...`)
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })
        
        if (!response.ok) {
          if (response.status === 404) {
            hasMore = false
            break
          }
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        const teams = data.sports?.[0]?.leagues?.[0]?.teams || []
        
        if (teams.length === 0) {
          hasMore = false
          break
        }
        
        for (const teamWrapper of teams) {
          const team = teamWrapper.team
          
          // Get logo
          const defaultLogo = team.logos?.find((l: any) => 
            l.rel?.includes('default') && l.width >= 500
          ) || team.logos?.find((l: any) => l.rel?.includes('default'))
          
          // Get conference
          const conference = team.groups?.parent?.name || team.groups?.name || ''
          
          teamsData.push({
            team_id: parseInt(team.id),
            espn_team_id: parseInt(team.id),
            sport: 'ncaab',
            name: team.displayName || team.name || team.shortDisplayName,
            abbreviation: team.abbreviation || '',
            city: team.location || '',
            division: conference,
            conference: conference,
            logo_url: defaultLogo?.href || team.logos?.[0]?.href || '',
            primary_color: team.color ? `#${team.color}` : '',
            secondary_color: team.alternateColor ? `#${team.alternateColor}` : '',
            created_at: Math.floor(Date.now() / 1000),
            updated_at: Math.floor(Date.now() / 1000)
          })
        }
        
        summary.pages_fetched = page
        console.log(`[NCAAB Sync] Page ${page}: Found ${teams.length} teams (total: ${teamsData.length})`)
        
        hasMore = teams.length === 100
        page++
        
        // Rate limit between pages
        await new Promise(r => setTimeout(r, 300))
        
      } catch (err: any) {
        console.error(`[NCAAB Sync] Error on page ${page}:`, err.message)
        summary.errors.push(`Page ${page}: ${err.message}`)
        
        // If timeout, try to continue with what we have
        if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
          hasMore = false
        } else {
          page++ // Skip this page and try next
        }
      }
    }
    
    summary.teams_found = teamsData.length
    
    // Optional: Filter to major conferences only
    let filteredTeams = teamsData
    if (mode === 'power') {
      filteredTeams = teamsData.filter(t => {
        const conf = t.conference?.toLowerCase() || ''
        return MAJOR_CONFERENCES.some(c => conf.toLowerCase().includes(c.toLowerCase()))
      })
      console.log(`[NCAAB Sync] Filtered to ${filteredTeams.length} power conference teams`)
    }
    
    // Insert teams into ClickHouse in batches
    if (filteredTeams.length > 0) {
      console.log(`[NCAAB Sync] Inserting ${filteredTeams.length} teams into ClickHouse...`)
      
      // Batch insert (50 at a time)
      for (let i = 0; i < filteredTeams.length; i += 50) {
        const batch = filteredTeams.slice(i, i + 50)
        try {
          await clickhouseInsert('teams', batch)
          summary.teams_synced += batch.length
          console.log(`[NCAAB Sync] Inserted batch ${Math.floor(i/50) + 1}/${Math.ceil(filteredTeams.length/50)}`)
        } catch (err: any) {
          console.error(`[NCAAB Sync] Error inserting batch at ${i}:`, err.message)
          summary.errors.push(`Batch ${i}: ${err.message}`)
        }
        
        // Small delay between batches
        await new Promise(r => setTimeout(r, 100))
      }
    }

    console.log('[NCAAB Sync] Complete:', summary)

    // Group by conference for summary
    const byConference: Record<string, number> = {}
    filteredTeams.forEach(t => {
      const conf = t.conference || 'Unknown'
      byConference[conf] = (byConference[conf] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      sport: 'ncaab',
      ...summary,
      by_conference: Object.entries(byConference)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([conf, count]) => ({ conference: conf, teams: count })),
      sample_teams: filteredTeams.slice(0, 20).map(t => ({ 
        name: t.name, 
        abbr: t.abbreviation, 
        conf: t.conference,
        logo: t.logo_url ? '✓' : '✗' 
      }))
    })

  } catch (error: any) {
    console.error('[NCAAB Sync] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: error.message, sport: 'ncaab' },
      { status: 500 }
    )
  }
}

