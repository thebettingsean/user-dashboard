import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

interface TimelineSnapshot {
  snapshot_time: string
  spread: number
  spread_juice_home: number
  total: number
  ml_home: number
  ml_away: number
  public_spread_bet_pct: number
  public_spread_money_pct: number
  public_ml_bet_pct: number
  public_ml_money_pct: number
  public_total_bet_pct: number
  public_total_money_pct: number
}

interface SummaryData {
  opening_spread: number
  opening_total: number
  opening_ml_home: number
  opening_ml_away: number
  opening_time: string
  current_spread: number
  current_total: number
  current_ml_home: number
  current_ml_away: number
  current_time: string
  spread_movement: number
  total_movement: number
  public_spread_bet_pct: number
  public_spread_money_pct: number
  snapshot_count: number
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  
  if (!gameId) {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 })
  }
  
  try {
    // Get full timeline from snapshots table
    const timelineQuery = `
      SELECT 
        odds_api_game_id,
        sport,
        home_team,
        away_team,
        toString(game_time) as game_time,
        toString(snapshot_time) as snapshot_time,
        spread,
        spread_juice_home,
        total,
        ml_home,
        ml_away,
        public_spread_home_bet_pct as public_spread_bet_pct,
        public_spread_home_money_pct as public_spread_money_pct,
        public_ml_home_bet_pct as public_ml_bet_pct,
        public_ml_home_money_pct as public_ml_money_pct,
        public_total_over_bet_pct as public_total_bet_pct,
        public_total_over_money_pct as public_total_money_pct
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${gameId}'
      ORDER BY snapshot_time ASC
    `
    
    const result = await clickhouseQuery(timelineQuery)
    const rawTimeline = result.data || []
    
    if (!rawTimeline || rawTimeline.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    // Build summary from timeline data
    const firstSnapshot = rawTimeline[0]
    const lastSnapshot = rawTimeline[rawTimeline.length - 1]
    
    const summary = {
      odds_api_game_id: firstSnapshot.odds_api_game_id,
      sport: firstSnapshot.sport,
      home_team: firstSnapshot.home_team,
      away_team: firstSnapshot.away_team,
      game_time: firstSnapshot.game_time,
      opening_spread: firstSnapshot.spread,
      opening_total: firstSnapshot.total,
      opening_ml_home: firstSnapshot.ml_home,
      opening_ml_away: firstSnapshot.ml_away,
      opening_time: firstSnapshot.snapshot_time,
      current_spread: lastSnapshot.spread,
      current_total: lastSnapshot.total,
      current_ml_home: lastSnapshot.ml_home,
      current_ml_away: lastSnapshot.ml_away,
      current_time: lastSnapshot.snapshot_time,
      spread_movement: (lastSnapshot.spread || 0) - (firstSnapshot.spread || 0),
      total_movement: (lastSnapshot.total || 0) - (firstSnapshot.total || 0),
      public_spread_bet_pct: lastSnapshot.public_spread_bet_pct || 0,
      public_spread_money_pct: lastSnapshot.public_spread_money_pct || 0,
      public_ml_bet_pct: lastSnapshot.public_ml_bet_pct || 0,
      public_ml_money_pct: lastSnapshot.public_ml_money_pct || 0,
      snapshot_count: rawTimeline.length,
      last_updated: lastSnapshot.snapshot_time,
    }
    
    const timeline: TimelineSnapshot[] = rawTimeline
    
    // Calculate analysis
    const analysis = analyzeMovement(summary, timeline)
    
    return NextResponse.json({
      success: true,
      game: {
        id: summary.odds_api_game_id,
        sport: summary.sport,
        home_team: summary.home_team,
        away_team: summary.away_team,
        game_time: summary.game_time,
      },
      summary: {
        opening: {
          spread: summary.opening_spread,
          total: summary.opening_total,
          ml_home: summary.opening_ml_home,
          ml_away: summary.opening_ml_away,
          time: summary.opening_time,
        },
        current: {
          spread: summary.current_spread,
          total: summary.current_total,
          ml_home: summary.current_ml_home,
          ml_away: summary.current_ml_away,
          time: summary.current_time,
        },
        movement: {
          spread: summary.spread_movement,
          total: summary.total_movement,
        },
        public_betting: {
          spread_bet_pct: summary.public_spread_bet_pct,
          spread_money_pct: summary.public_spread_money_pct,
          ml_bet_pct: summary.public_ml_bet_pct,
          ml_money_pct: summary.public_ml_money_pct,
        },
        snapshot_count: summary.snapshot_count,
        last_updated: summary.last_updated,
      },
      timeline: timeline.map((snap, index) => ({
        ...snap,
        label: getSnapshotLabel(snap.snapshot_time, summary.opening_time, summary.game_time, index, timeline.length),
      })),
      analysis,
    })
    
  } catch (error: any) {
    console.error('Error fetching odds timeline:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

function getSnapshotLabel(
  snapshotTime: string, 
  openingTime: string, 
  gameTime: string,
  index: number,
  totalSnapshots: number
): string {
  if (index === 0) return 'Opening'
  if (index === totalSnapshots - 1) return 'Current'
  
  // Calculate days before game
  const snapDate = new Date(snapshotTime)
  const gameDate = new Date(gameTime)
  const daysDiff = Math.floor((gameDate.getTime() - snapDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff === 0) return 'Game Day'
  if (daysDiff === 1) return '1 Day Out'
  return `${daysDiff} Days Out`
}

function analyzeMovement(summary: any, timeline: TimelineSnapshot[]): {
  spread_verdict: string
  total_verdict: string
  sharp_indicator: string
  rlm_detected: boolean
  explanation: string
} {
  const spreadMovement = summary.spread_movement || 0
  const publicSpreadBetPct = summary.public_spread_bet_pct || 50
  const publicSpreadMoneyPct = summary.public_spread_money_pct || 50
  
  // Determine which side public is on
  const publicOnHome = publicSpreadBetPct > 50
  const publicHeavy = Math.abs(publicSpreadBetPct - 50) > 15 // >65% or <35%
  
  // Determine line movement direction
  // Negative movement = line moved toward home (home became bigger favorite)
  // Positive movement = line moved toward away (away got more points)
  const lineMovedTowardHome = spreadMovement < -0.5
  const lineMovedTowardAway = spreadMovement > 0.5
  const lineStayed = Math.abs(spreadMovement) <= 0.5
  
  // Detect RLM
  let rlmDetected = false
  let verdict = ''
  let sharpIndicator = ''
  let explanation = ''
  
  if (publicHeavy) {
    if (publicOnHome && (lineMovedTowardAway || lineStayed)) {
      // Public heavy on home, but line moved away or stayed
      rlmDetected = true
      verdict = 'VEGAS BACKED'
      sharpIndicator = `Sharp money on ${summary.away_team}`
      explanation = `${Math.round(publicSpreadBetPct)}% of bets on ${summary.home_team}, but line moved ${lineStayed ? 'stayed put' : `${Math.abs(spreadMovement).toFixed(1)} points toward ${summary.away_team}`}. Sharps are on ${summary.away_team}.`
    } else if (!publicOnHome && (lineMovedTowardHome || lineStayed)) {
      // Public heavy on away, but line moved home or stayed
      rlmDetected = true
      verdict = 'VEGAS BACKED'
      sharpIndicator = `Sharp money on ${summary.home_team}`
      explanation = `${Math.round(100 - publicSpreadBetPct)}% of bets on ${summary.away_team}, but line moved ${lineStayed ? 'stayed put' : `${Math.abs(spreadMovement).toFixed(1)} points toward ${summary.home_team}`}. Sharps are on ${summary.home_team}.`
    } else {
      // Line moved with public
      verdict = 'PUBLIC MOVE'
      sharpIndicator = 'Line moved with public consensus'
      explanation = `${Math.round(publicOnHome ? publicSpreadBetPct : 100 - publicSpreadBetPct)}% on ${publicOnHome ? summary.home_team : summary.away_team} and line moved accordingly.`
    }
  } else {
    // Not enough public consensus
    verdict = 'BALANCED'
    sharpIndicator = 'No strong public lean'
    explanation = `Public split is relatively even (${Math.round(publicSpreadBetPct)}% / ${Math.round(100 - publicSpreadBetPct)}%).`
  }
  
  // Check for sharp money indicator (bet% vs money% difference)
  const betMoneyDiff = Math.abs(publicSpreadBetPct - publicSpreadMoneyPct)
  if (betMoneyDiff > 15) {
    const bigMoneyOn = publicSpreadMoneyPct > publicSpreadBetPct ? 'home' : 'away'
    const bigMoneyTeam = bigMoneyOn === 'home' ? summary.home_team : summary.away_team
    sharpIndicator = `Big money (${Math.round(bigMoneyOn === 'home' ? publicSpreadMoneyPct : 100 - publicSpreadMoneyPct)}%) on ${bigMoneyTeam} despite ${bigMoneyOn === 'home' ? Math.round(100 - publicSpreadBetPct) : Math.round(publicSpreadBetPct)}% of tickets on other side`
  }
  
  return {
    spread_verdict: verdict,
    total_verdict: 'N/A', // Can add total analysis later
    sharp_indicator: sharpIndicator,
    rlm_detected: rlmDetected,
    explanation,
  }
}

