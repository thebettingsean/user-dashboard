import { NextResponse } from 'next/server'

/**
 * Explore ESPN Team Stats Endpoints
 * Check if they have historical defensive rankings by week
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2024'
  const week = searchParams.get('week') || '1'
  
  try {
    console.log(`[ESPN Team Stats] Checking ${season} week ${week}...`)

    // Try different ESPN endpoints for team stats
    const endpoints = []

    // 1. Team statistics endpoint
    try {
      const statsUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/12/statistics?season=${season}`
      const statsRes = await fetch(statsUrl)
      if (statsRes.ok) {
        const stats = await statsRes.json()
        endpoints.push({
          name: 'Team Statistics',
          url: statsUrl,
          keys: Object.keys(stats),
          sample: stats
        })
      }
    } catch (err) {}

    // 2. Standings endpoint (might have defensive ranks)
    try {
      const standingsUrl = `https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=${season}`
      const standingsRes = await fetch(standingsUrl)
      if (standingsRes.ok) {
        const standings = await standingsRes.json()
        endpoints.push({
          name: 'Standings',
          url: standingsUrl,
          keys: Object.keys(standings),
          sample_team: standings.children?.[0]?.standings?.entries?.[0]
        })
      }
    } catch (err) {}

    // 3. Scoreboard (check if it has defensive stats)
    try {
      const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${season}`
      const scoreboardRes = await fetch(scoreboardUrl)
      if (scoreboardRes.ok) {
        const scoreboard = await scoreboardRes.json()
        const sampleGame = scoreboard.events?.[0]
        endpoints.push({
          name: 'Scoreboard',
          url: scoreboardUrl,
          has_games: scoreboard.events?.length || 0,
          sample_game_keys: sampleGame ? Object.keys(sampleGame) : [],
          sample_competitor: sampleGame?.competitions?.[0]?.competitors?.[0]
        })
      }
    } catch (err) {}

    // 4. Check if there's a rankings endpoint
    try {
      const rankingsUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/rankings?season=${season}`
      const rankingsRes = await fetch(rankingsUrl)
      if (rankingsRes.ok) {
        const rankings = await rankingsRes.json()
        endpoints.push({
          name: 'Rankings',
          url: rankingsUrl,
          data: rankings
        })
      }
    } catch (err) {}

    return NextResponse.json({
      success: true,
      season,
      week,
      endpoints_checked: endpoints.length,
      endpoints
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

