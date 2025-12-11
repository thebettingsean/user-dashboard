import { NextResponse } from 'next/server'
import { supabaseFunnel } from '@/lib/supabase-funnel'

interface SimulationEvent {
  id: string
  user_id: string | null
  session_id: string
  user_type: string
  event_type: string
  sport: string
  metadata: string
  created_at: string
}

interface ParsedMetadata {
  awayTeam: string
  homeTeam: string
  away_score: number
  home_score: number
}

export async function GET() {
  try {
    // Fetch all simulation events
    const { data: events, error } = await supabaseFunnel
      .from('simulator_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const allEvents = events as SimulationEvent[]
    
    // Separate simulations from link clicks
    const simulations = allEvents.filter(e => e.event_type === 'simulation_ran')
    const linkClicks = allEvents.filter(e => e.event_type === 'versus_link_clicked')
    
    // Parse metadata for all events
    const parsedEvents = simulations.map(event => {
      let metadata: ParsedMetadata | null = null
      try {
        metadata = JSON.parse(event.metadata)
      } catch (e) {
        // metadata might already be an object or invalid
        metadata = event.metadata as unknown as ParsedMetadata
      }
      return { ...event, parsedMetadata: metadata }
    })

    // KPIs
    const totalSimulations = simulations.length
    const uniqueSessions = new Set(simulations.map(s => s.session_id)).size
    const uniqueUsers = new Set(simulations.filter(s => s.user_id).map(s => s.user_id)).size
    const anonymousCount = simulations.filter(s => !s.user_id).length
    const signedInCount = simulations.filter(s => s.user_id).length

    // Sport breakdown
    const sportCounts: Record<string, number> = {}
    simulations.forEach(s => {
      sportCounts[s.sport] = (sportCounts[s.sport] || 0) + 1
    })
    const sportBreakdown = Object.entries(sportCounts)
      .map(([sport, count]) => ({
        sport,
        count,
        percentage: ((count / totalSimulations) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)

    // Most popular matchups
    const matchupCounts: Record<string, { count: number; sport: string; awayTeam: string; homeTeam: string }> = {}
    parsedEvents.forEach(event => {
      if (event.parsedMetadata) {
        const { awayTeam, homeTeam } = event.parsedMetadata
        const key = `${awayTeam} @ ${homeTeam}`
        if (!matchupCounts[key]) {
          matchupCounts[key] = { count: 0, sport: event.sport, awayTeam, homeTeam }
        }
        matchupCounts[key].count++
      }
    })
    const popularMatchups = Object.entries(matchupCounts)
      .map(([matchup, data]) => ({ matchup, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Daily timeline
    const dailyCounts: Record<string, { date: string; count: number; sports: Record<string, number> }> = {}
    simulations.forEach(s => {
      const date = new Date(s.created_at).toISOString().split('T')[0]
      if (!dailyCounts[date]) {
        dailyCounts[date] = { date, count: 0, sports: {} }
      }
      dailyCounts[date].count++
      dailyCounts[date].sports[s.sport] = (dailyCounts[date].sports[s.sport] || 0) + 1
    })
    const timeline = Object.values(dailyCounts).sort((a, b) => a.date.localeCompare(b.date))

    // Hourly distribution (for today or most recent day)
    const hourlyDistribution: number[] = Array(24).fill(0)
    simulations.forEach(s => {
      const hour = new Date(s.created_at).getHours()
      hourlyDistribution[hour]++
    })

    // Top users by simulation count
    const userCounts: Record<string, number> = {}
    simulations.forEach(s => {
      if (s.user_id) {
        userCounts[s.user_id] = (userCounts[s.user_id] || 0) + 1
      }
    })
    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Average scores by sport
    const sportScores: Record<string, { totalHome: number; totalAway: number; count: number }> = {}
    parsedEvents.forEach(event => {
      if (event.parsedMetadata) {
        const { home_score, away_score } = event.parsedMetadata
        if (!sportScores[event.sport]) {
          sportScores[event.sport] = { totalHome: 0, totalAway: 0, count: 0 }
        }
        sportScores[event.sport].totalHome += home_score
        sportScores[event.sport].totalAway += away_score
        sportScores[event.sport].count++
      }
    })
    const avgScoresBySport = Object.entries(sportScores).map(([sport, data]) => ({
      sport,
      avgHomeScore: (data.totalHome / data.count).toFixed(1),
      avgAwayScore: (data.totalAway / data.count).toFixed(1),
      avgTotal: ((data.totalHome + data.totalAway) / data.count).toFixed(1)
    }))

    // ============================================
    // LINK CLICK ANALYTICS
    // ============================================
    
    const totalLinkClicks = linkClicks.length
    const uniqueLinkClickSessions = new Set(linkClicks.map(c => c.session_id)).size
    const signedInLinkClicks = linkClicks.filter(c => c.user_id).length
    const anonymousLinkClicks = linkClicks.filter(c => !c.user_id).length
    
    // Link clicks by sport
    const linkClicksBySport: Record<string, number> = {}
    linkClicks.forEach(c => {
      linkClicksBySport[c.sport] = (linkClicksBySport[c.sport] || 0) + 1
    })
    const linkClickSportBreakdown = Object.entries(linkClicksBySport)
      .map(([sport, count]) => ({
        sport,
        count,
        percentage: totalLinkClicks > 0 ? ((count / totalLinkClicks) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
    
    // Parse link click metadata for matchup info
    const parsedLinkClicks = linkClicks.map(click => {
      let metadata: ParsedMetadata | null = null
      try {
        metadata = JSON.parse(click.metadata)
      } catch (e) {
        metadata = click.metadata as unknown as ParsedMetadata
      }
      return { ...click, parsedMetadata: metadata }
    })
    
    // Most clicked matchups
    const clickedMatchupCounts: Record<string, { count: number; sport: string; awayTeam: string; homeTeam: string }> = {}
    parsedLinkClicks.forEach(click => {
      if (click.parsedMetadata) {
        const { awayTeam, homeTeam } = click.parsedMetadata
        const key = `${awayTeam} @ ${homeTeam}`
        if (!clickedMatchupCounts[key]) {
          clickedMatchupCounts[key] = { count: 0, sport: click.sport, awayTeam, homeTeam }
        }
        clickedMatchupCounts[key].count++
      }
    })
    const mostClickedMatchups = Object.entries(clickedMatchupCounts)
      .map(([matchup, data]) => ({ matchup, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
    
    // Link click daily timeline
    const linkClickDailyCounts: Record<string, { date: string; count: number }> = {}
    linkClicks.forEach(c => {
      const date = new Date(c.created_at).toISOString().split('T')[0]
      if (!linkClickDailyCounts[date]) {
        linkClickDailyCounts[date] = { date, count: 0 }
      }
      linkClickDailyCounts[date].count++
    })
    const linkClickTimeline = Object.values(linkClickDailyCounts).sort((a, b) => a.date.localeCompare(b.date))
    
    // Recent link clicks (raw data)
    const recentLinkClicks = parsedLinkClicks.slice(0, 100).map(c => ({
      id: c.id,
      user_id: c.user_id,
      session_id: c.session_id,
      user_type: c.user_id ? 'signed_in' : 'anonymous',
      sport: c.sport,
      awayTeam: c.parsedMetadata?.awayTeam,
      homeTeam: c.parsedMetadata?.homeTeam,
      created_at: c.created_at
    }))

    return NextResponse.json({
      success: true,
      kpis: {
        totalSimulations,
        uniqueSessions,
        uniqueUsers,
        anonymousCount,
        signedInCount
      },
      // Link click KPIs
      linkClickKpis: {
        totalLinkClicks,
        uniqueLinkClickSessions,
        signedInLinkClicks,
        anonymousLinkClicks,
        clickThroughRate: totalSimulations > 0 
          ? ((totalLinkClicks / totalSimulations) * 100).toFixed(2) 
          : '0'
      },
      sportBreakdown,
      popularMatchups,
      timeline,
      hourlyDistribution,
      topUsers,
      avgScoresBySport,
      // Link click data
      linkClickSportBreakdown,
      mostClickedMatchups,
      linkClickTimeline,
      recentLinkClicks,
      rawData: parsedEvents.slice(0, 500).map(e => ({
        id: e.id,
        user_id: e.user_id,
        session_id: e.session_id,
        user_type: e.user_id ? 'signed_in' : 'anonymous',
        sport: e.sport,
        awayTeam: e.parsedMetadata?.awayTeam,
        homeTeam: e.parsedMetadata?.homeTeam,
        away_score: e.parsedMetadata?.away_score,
        home_score: e.parsedMetadata?.home_score,
        created_at: e.created_at
      }))
    })
  } catch (error: any) {
    console.error('Error fetching simulation analytics:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

