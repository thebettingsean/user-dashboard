import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

interface TimelineSnapshot {
  snapshot_time: string
  spread: number
  spread_juice_home: number
  spread_juice_away: number
  total: number
  total_juice_over: number
  total_juice_under: number
  ml_home: number
  ml_away: number
  public_spread_home_bet_pct: number
  public_spread_home_money_pct: number
  public_ml_home_bet_pct: number
  public_ml_home_money_pct: number
  public_total_over_bet_pct: number
  public_total_over_money_pct: number
}

export async function GET(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const gameId = params.gameId
  const { searchParams } = new URL(request.url)
  const timeFilter = searchParams.get('time') || 'all' // 'all' or '24hr'
  
  if (!gameId) {
    return NextResponse.json({ success: false, error: 'gameId is required' }, { status: 400 })
  }
  
  try {
    // Get time filter condition
    const timeCondition = timeFilter === '24hr' 
      ? 'AND snapshot_time > now() - INTERVAL 24 HOUR' 
      : ''
    
    // Get all snapshots for this game
    const timelineQuery = `
      SELECT
        toString(snapshot_time) as snapshot_time,
        spread,
        spread_juice_home,
        spread_juice_away,
        total,
        total_juice_over,
        total_juice_under,
        ml_home,
        ml_away,
        public_spread_home_bet_pct,
        public_spread_home_money_pct,
        public_ml_home_bet_pct,
        public_ml_home_money_pct,
        public_total_over_bet_pct,
        public_total_over_money_pct
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${gameId}'
      ${timeCondition}
      ORDER BY snapshot_time ASC
    `
    
    const timelineResult = await clickhouseQuery<TimelineSnapshot>(timelineQuery)
    const timeline = timelineResult.data || []
    
    if (timeline.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No timeline data found for this game',
        gameId 
      }, { status: 404 })
    }
    
    // Get game info
    const gameInfoQuery = `
      SELECT
        odds_api_game_id,
        sport,
        any(home_team) as home_team,
        any(away_team) as away_team,
        any(game_time) as game_time
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${gameId}'
      GROUP BY odds_api_game_id, sport
      LIMIT 1
    `
    const gameInfoResult = await clickhouseQuery<any>(gameInfoQuery)
    const gameInfo = gameInfoResult.data?.[0] || {}
    
    // Calculate summary stats
    const firstSnapshot = timeline[0]
    const lastSnapshot = timeline[timeline.length - 1]
    
    const summary = {
      opening: {
        spread: firstSnapshot.spread,
        spread_juice_home: firstSnapshot.spread_juice_home,
        spread_juice_away: firstSnapshot.spread_juice_away,
        total: firstSnapshot.total,
        ml_home: firstSnapshot.ml_home,
        ml_away: firstSnapshot.ml_away,
        time: firstSnapshot.snapshot_time
      },
      current: {
        spread: lastSnapshot.spread,
        spread_juice_home: lastSnapshot.spread_juice_home,
        spread_juice_away: lastSnapshot.spread_juice_away,
        total: lastSnapshot.total,
        ml_home: lastSnapshot.ml_home,
        ml_away: lastSnapshot.ml_away,
        time: lastSnapshot.snapshot_time
      },
      movement: {
        spread: lastSnapshot.spread - firstSnapshot.spread,
        total: lastSnapshot.total - firstSnapshot.total,
        ml_home: lastSnapshot.ml_home - firstSnapshot.ml_home,
        ml_away: lastSnapshot.ml_away - firstSnapshot.ml_away
      },
      public_betting: {
        spread_bet_pct: lastSnapshot.public_spread_home_bet_pct,
        spread_money_pct: lastSnapshot.public_spread_home_money_pct,
        ml_bet_pct: lastSnapshot.public_ml_home_bet_pct,
        ml_money_pct: lastSnapshot.public_ml_home_money_pct,
        total_bet_pct: lastSnapshot.public_total_over_bet_pct,
        total_money_pct: lastSnapshot.public_total_over_money_pct
      },
      snapshot_count: timeline.length
    }
    
    // Analyze for indicators
    const analysis = analyzeLineMovement(timeline, summary)
    
    // Format timeline for chart (simplified for Recharts)
    const chartData = timeline.map((snap, idx) => {
      // Convert timestamp to relative label
      const snapTime = new Date(snap.snapshot_time)
      const hoursAgo = Math.round((Date.now() - snapTime.getTime()) / (1000 * 60 * 60))
      
      let label = 'Now'
      if (idx === 0) label = timeFilter === '24hr' ? '24hr Ago' : 'Open'
      else if (hoursAgo > 0) label = `${hoursAgo}hr`
      
      return {
        time: label,
        timestamp: snap.snapshot_time,
        homeLine: snap.spread,
        awayLine: -snap.spread,
        total: snap.total,
        mlHome: snap.ml_home,
        mlAway: snap.ml_away,
        homeBetPct: snap.public_spread_home_bet_pct || 50,
        awayBetPct: 100 - (snap.public_spread_home_bet_pct || 50),
        homeMoneyPct: snap.public_spread_home_money_pct || 50,
        awayMoneyPct: 100 - (snap.public_spread_home_money_pct || 50)
      }
    })
    
    return NextResponse.json({
      success: true,
      game: {
        id: gameId,
        sport: gameInfo.sport,
        home_team: gameInfo.home_team,
        away_team: gameInfo.away_team,
        game_time: gameInfo.game_time
      },
      summary,
      analysis,
      chartData,
      timeline // Raw data if needed
    })
    
  } catch (error: any) {
    console.error('[Game Timeline API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      gameId
    }, { status: 500 })
  }
}

// Analyze line movement for indicators
function analyzeLineMovement(timeline: TimelineSnapshot[], summary: any) {
  const opening = summary.opening
  const current = summary.current
  const movement = summary.movement
  const publicBetting = summary.public_betting
  
  const indicators: string[] = []
  let verdict = 'NEUTRAL'
  let confidence = 'low'
  
  // RLM Detection: Line moves opposite of public
  const publicOnHome = publicBetting.spread_bet_pct > 55
  const publicOnAway = publicBetting.spread_bet_pct < 45
  const lineMovedToHome = movement.spread < -0.5
  const lineMovedToAway = movement.spread > 0.5
  
  if (publicOnHome && lineMovedToAway) {
    indicators.push(`🔥 RLM: ${Math.abs(movement.spread).toFixed(1)}pt move AWAY despite ${publicBetting.spread_bet_pct}% public on HOME`)
    verdict = 'VEGAS_BACKED_AWAY'
    confidence = Math.abs(movement.spread) >= 1 ? 'high' : 'medium'
  } else if (publicOnAway && lineMovedToHome) {
    indicators.push(`🔥 RLM: ${Math.abs(movement.spread).toFixed(1)}pt move HOME despite ${100 - publicBetting.spread_bet_pct}% public on AWAY`)
    verdict = 'VEGAS_BACKED_HOME'
    confidence = Math.abs(movement.spread) >= 1 ? 'high' : 'medium'
  }
  
  // "Respected" Money Detection: Big $ vs Bet discrepancy
  const moneyVsBetsDiff = publicBetting.spread_money_pct - publicBetting.spread_bet_pct
  if (Math.abs(moneyVsBetsDiff) >= 10) {
    const side = moneyVsBetsDiff > 0 ? 'HOME' : 'AWAY'
    indicators.push(`💰 Sharp Money: ${Math.abs(moneyVsBetsDiff)}% more $ than bets on ${side}`)
    if (verdict === 'NEUTRAL') {
      verdict = moneyVsBetsDiff > 0 ? 'SHARP_HOME' : 'SHARP_AWAY'
      confidence = 'medium'
    }
  }
  
  // Steam Move Detection: Rapid movement
  if (Math.abs(movement.spread) >= 1.5) {
    indicators.push(`⚡ Steam Move: ${Math.abs(movement.spread).toFixed(1)}pt swing since open`)
    confidence = 'high'
  }
  
  // Juice Shift Detection
  const juiceShift = current.spread_juice_home - opening.spread_juice_home
  if (Math.abs(juiceShift) >= 15) {
    indicators.push(`📊 Juice Shift: ${juiceShift > 0 ? '+' : ''}${juiceShift} on home side`)
  }
  
  // Total Movement
  if (Math.abs(movement.total) >= 2) {
    const direction = movement.total > 0 ? 'UP' : 'DOWN'
    indicators.push(`📈 Total moved ${direction} ${Math.abs(movement.total).toFixed(1)} pts`)
  }
  
  return {
    verdict,
    confidence,
    indicators,
    rlm_detected: indicators.some(i => i.includes('RLM')),
    sharp_money_detected: indicators.some(i => i.includes('Sharp Money')),
    steam_detected: indicators.some(i => i.includes('Steam'))
  }
}

