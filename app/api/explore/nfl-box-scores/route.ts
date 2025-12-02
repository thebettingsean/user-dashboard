import { NextResponse } from 'next/server'

const ESPN_CORE_URL = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'
const ESPN_SITE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId')

  if (!gameId) {
    return NextResponse.json(
      { error: 'gameId parameter is required. Example: ?gameId=401671745' },
      { status: 400 }
    )
  }

  try {
    console.log(`[NFL Box Score Explorer] Fetching game ${gameId}`)

    // 1. Get game summary from Site API
    const summaryResponse = await fetch(`${ESPN_SITE_URL}/summary?event=${gameId}`)
    if (!summaryResponse.ok) {
      throw new Error(`Game summary failed: ${summaryResponse.status}`)
    }
    const gameSummary = await summaryResponse.json()

    // 2. Get both teams' statistics from Core API
    const competitors = gameSummary.boxscore?.teams || []
    const teamStats = []

    for (const competitor of competitors) {
      const teamId = competitor.team.id
      const teamName = competitor.team.displayName

      console.log(`[NFL Explorer] Fetching stats for ${teamName} (${teamId})`)

      try {
        const statsResponse = await fetch(
          `${ESPN_CORE_URL}/events/${gameId}/competitions/${gameId}/competitors/${teamId}/statistics`
        )
        
        if (statsResponse.ok) {
          const stats = await statsResponse.json()
          teamStats.push({
            team_id: teamId,
            team_name: teamName,
            statistics: stats
          })
        }
      } catch (err) {
        console.error(`Failed to fetch team ${teamId} stats:`, err)
      }
    }

    // 3. Get individual player stats for first team as example
    let samplePlayerStats = null
    if (teamStats.length > 0) {
      const firstTeam = teamStats[0]
      const passingCategory = firstTeam.statistics?.splits?.categories?.find(
        (cat: any) => cat.name === 'passing'
      )

      if (passingCategory?.athletes?.[0]?.athlete?.$ref) {
        const athleteId = passingCategory.athletes[0].athlete.$ref.split('/athletes/')[1]?.split('?')[0]
        
        if (athleteId) {
          console.log(`[NFL Explorer] Fetching sample player stats for athlete ${athleteId}`)
          
          try {
            const playerStatsResponse = await fetch(
              `${ESPN_CORE_URL}/events/${gameId}/competitions/${gameId}/competitors/${firstTeam.team_id}/roster/${athleteId}/statistics/0`
            )
            
            if (playerStatsResponse.ok) {
              samplePlayerStats = await playerStatsResponse.json()
            }
          } catch (err) {
            console.error('Failed to fetch sample player stats:', err)
          }
        }
      }
    }

    // Return comprehensive data
    return NextResponse.json({
      success: true,
      sport: 'NFL',
      game_id: gameId,
      exploration: {
        game_summary: {
          status: gameSummary.header?.competitions?.[0]?.status,
          game_info: {
            date: gameSummary.header?.competitions?.[0]?.date,
            attendance: gameSummary.header?.competitions?.[0]?.attendance,
            venue: gameSummary.header?.competitions?.[0]?.venue
          },
          teams: gameSummary.header?.competitions?.[0]?.competitors?.map((comp: any) => ({
            team: comp.team?.displayName,
            score: comp.score,
            record: comp.record
          }))
        },
        team_statistics: teamStats,
        sample_player_stats: samplePlayerStats,
        available_stat_categories: teamStats[0]?.statistics?.splits?.categories?.map((cat: any) => ({
          name: cat.name,
          displayName: cat.displayName,
          athlete_count: cat.athletes?.length || 0,
          available_stats: cat.stats?.map((s: any) => s.name) || []
        })) || []
      },
      raw_data: {
        game_summary: gameSummary,
        team_stats_full: teamStats,
        sample_player_full: samplePlayerStats
      }
    })

  } catch (error: any) {
    console.error('[NFL Box Score Explorer] Error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        game_id: gameId,
        tip: 'Try a recent completed game ID from ESPN'
      },
      { status: 500 }
    )
  }
}

