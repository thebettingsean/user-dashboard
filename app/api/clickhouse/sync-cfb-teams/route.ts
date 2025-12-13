import { NextResponse } from 'next/server'
import { clickhouseInsert } from '@/lib/clickhouse'

// ESPN API for College Football
// Docs: https://github.com/pseudo-r/Public-ESPN-API
const ESPN_CFB_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football'

// FBS Conferences for filtering
const FBS_CONFERENCES = [
  'SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12', 
  'American Athletic', 'Mountain West', 'Sun Belt', 'Mid-American', 
  'Conference USA', 'FBS Independents'
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const batchParam = searchParams.get('batch') // 1, 2, 3, or 'all'
  
  try {
    console.log('[CFB Sync] Starting College Football team sync...')

    const summary = {
      teams_synced: 0,
      teams_found: 0,
      errors: [] as string[]
    }

    const teamsData: any[] = []
    
    // ESPN teams list endpoint with pagination
    // CFB has many teams, so we paginate
    let page = 1
    let hasMore = true
    const maxPages = 10 // Safety limit
    
    while (hasMore && page <= maxPages) {
      try {
        // ESPN CFB teams endpoint
        const url = `${ESPN_CFB_URL}/teams?limit=100&page=${page}`
        console.log(`[CFB Sync] Fetching page ${page}...`)
        
        const response = await fetch(url)
        if (!response.ok) {
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
          
          // Get logo (prefer default, then any available)
          const defaultLogo = team.logos?.find((l: any) => 
            l.rel?.includes('default') && l.width >= 500
          ) || team.logos?.find((l: any) => l.rel?.includes('default'))
          
          // Get conference/division from groups
          const conference = team.groups?.parent?.name || team.groups?.name || ''
          
          // Skip FCS teams for now (focus on FBS for betting)
          // FBS teams typically have group IDs in certain ranges
          
          teamsData.push({
            team_id: parseInt(team.id),
            espn_team_id: parseInt(team.id),
            sport: 'cfb',
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
        
        console.log(`[CFB Sync] Page ${page}: Found ${teams.length} teams (total: ${teamsData.length})`)
        
        // Check if there are more pages
        hasMore = teams.length === 100
        page++
        
        // Rate limit between pages
        await new Promise(r => setTimeout(r, 200))
        
      } catch (err: any) {
        console.error(`[CFB Sync] Error on page ${page}:`, err.message)
        summary.errors.push(`Page ${page}: ${err.message}`)
        hasMore = false
      }
    }
    
    summary.teams_found = teamsData.length
    
    // Filter to FBS conferences if we got too many teams
    let filteredTeams = teamsData
    if (teamsData.length > 200) {
      // Keep teams with recognized conferences or popular FBS teams
      filteredTeams = teamsData.filter(t => {
        const conf = t.conference?.toLowerCase() || ''
        return FBS_CONFERENCES.some(c => conf.includes(c.toLowerCase())) ||
               conf.includes('fbs') ||
               conf === '' // Keep teams without conference (might be independent)
      })
      console.log(`[CFB Sync] Filtered to ${filteredTeams.length} FBS teams from ${teamsData.length} total`)
    }
    
    // Insert teams into ClickHouse in batches
    if (filteredTeams.length > 0) {
      console.log(`[CFB Sync] Inserting ${filteredTeams.length} teams into ClickHouse...`)
      
      // Batch insert (50 at a time to avoid timeout)
      for (let i = 0; i < filteredTeams.length; i += 50) {
        const batch = filteredTeams.slice(i, i + 50)
        try {
          await clickhouseInsert('teams', batch)
          summary.teams_synced += batch.length
          console.log(`[CFB Sync] Inserted batch ${Math.floor(i/50) + 1}/${Math.ceil(filteredTeams.length/50)}`)
        } catch (err: any) {
          console.error(`[CFB Sync] Error inserting batch at ${i}:`, err.message)
          summary.errors.push(`Batch ${i}: ${err.message}`)
        }
      }
    }

    console.log('[CFB Sync] Complete:', summary)

    return NextResponse.json({
      success: true,
      sport: 'cfb',
      ...summary,
      sample_teams: filteredTeams.slice(0, 20).map(t => ({ 
        name: t.name, 
        abbr: t.abbreviation, 
        conf: t.conference,
        logo: t.logo_url ? '✓' : '✗' 
      }))
    })

  } catch (error: any) {
    console.error('[CFB Sync] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: error.message, sport: 'cfb' },
      { status: 500 }
    )
  }
}

