import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const { searchParams } = new URL(request.url)
  const timeFilter = searchParams.get('timeFilter') || 'all'
  
  if (!gameId) {
    return NextResponse.json({ error: 'gameId required' }, { status: 400 })
  }
  
  try {
    // Build time filter condition
    let timeCondition = ''
    if (timeFilter === '24hr') {
      timeCondition = `AND snapshot_time >= now() - INTERVAL 24 HOUR`
    }
    
    // Get all snapshots for this game
    const query = `
      SELECT 
        toString(snapshot_time) as time,
        spread as homeLine,
        -spread as awayLine,
        total,
        ml_home as mlHome,
        ml_away as mlAway,
        public_spread_home_bet_pct as homeBetPct,
        100 - public_spread_home_bet_pct as awayBetPct,
        public_spread_home_money_pct as homeMoneyPct,
        100 - public_spread_home_money_pct as awayMoneyPct,
        public_ml_home_bet_pct as mlHomeBetPct,
        public_ml_home_money_pct as mlHomeMoneyPct,
        public_total_over_bet_pct as totalOverBetPct,
        public_total_over_money_pct as totalOverMoneyPct
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${gameId}'
      ${timeCondition}
      ORDER BY snapshot_time ASC
    `
    
    const result = await clickhouseQuery<any>(query)
    const snapshots = result.data || []
    
    if (snapshots.length === 0) {
      return NextResponse.json({
        success: true,
        gameId,
        snapshotCount: 0,
        timeline: [],
        message: 'No snapshots found for this game'
      })
    }
    
    // Format time labels for display
    const formattedTimeline = snapshots.map((snap: any, index: number) => {
      const snapTime = new Date(snap.time + ' UTC')
      const now = new Date()
      const hoursAgo = Math.round((now.getTime() - snapTime.getTime()) / (1000 * 60 * 60))
      
      let timeLabel: string
      if (index === 0) {
        timeLabel = 'Open'
      } else if (index === snapshots.length - 1) {
        timeLabel = 'Current'
      } else if (hoursAgo <= 1) {
        timeLabel = '1hr'
      } else if (hoursAgo <= 3) {
        timeLabel = '3hr'
      } else if (hoursAgo <= 6) {
        timeLabel = '6hr'
      } else if (hoursAgo <= 12) {
        timeLabel = '12hr'
      } else if (hoursAgo <= 24) {
        timeLabel = '24hr'
      } else if (hoursAgo <= 36) {
        timeLabel = '36hr'
      } else if (hoursAgo <= 48) {
        timeLabel = '48hr'
      } else {
        timeLabel = `${Math.round(hoursAgo)}hr`
      }
      
      return {
        time: timeLabel,
        rawTime: snap.time,
        homeLine: snap.homeLine || 0,
        awayLine: snap.awayLine || 0,
        total: snap.total || 0,
        mlHome: snap.mlHome || 0,
        mlAway: snap.mlAway || 0,
        homeBetPct: snap.homeBetPct || 50,
        awayBetPct: snap.awayBetPct || 50,
        homeMoneyPct: snap.homeMoneyPct || 50,
        awayMoneyPct: snap.awayMoneyPct || 50,
        mlHomeBetPct: snap.mlHomeBetPct || 50,
        mlHomeMoneyPct: snap.mlHomeMoneyPct || 50,
        totalOverBetPct: snap.totalOverBetPct || 50,
        totalOverMoneyPct: snap.totalOverMoneyPct || 50
      }
    })
    
    // For graphs, we want a reasonable number of points (max ~10)
    // If we have more than 10 snapshots, sample them
    let timelineForGraph = formattedTimeline
    if (formattedTimeline.length > 10) {
      const step = Math.floor(formattedTimeline.length / 8)
      timelineForGraph = [
        formattedTimeline[0], // Always include first (Open)
        ...formattedTimeline.filter((_: any, i: number) => i > 0 && i < formattedTimeline.length - 1 && i % step === 0).slice(0, 7),
        formattedTimeline[formattedTimeline.length - 1] // Always include last (Current)
      ]
    }
    
    return NextResponse.json({
      success: true,
      gameId,
      snapshotCount: snapshots.length,
      timeline: timelineForGraph,
      fullTimeline: formattedTimeline
    })
    
  } catch (error: any) {
    console.error('[Game Timeline] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
