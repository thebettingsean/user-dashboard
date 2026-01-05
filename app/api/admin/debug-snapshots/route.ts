import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * DEBUG: Check what's actually in the snapshots for corrupted games
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId') // Full game_id like nfl_abc123
  
  if (!gameId) {
    return NextResponse.json({ error: 'gameId parameter required' }, { status: 400 })
  }
  
  try {
    // Extract odds_api_game_id
    const oddsApiId = gameId.split('_')[1]
    
    if (!oddsApiId) {
      return NextResponse.json({ error: 'Invalid gameId format' }, { status: 400 })
    }
    
    // Get the game details
    const gameQuery = await clickhouseQuery<any>(`
      SELECT 
        g.game_id,
        g.sport,
        g.game_time,
        ht.name as home_team,
        at.name as away_team,
        g.spread_open,
        g.spread_close,
        g.total_open,
        g.total_close,
        g.status
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.game_id = '${gameId}'
      LIMIT 1
    `)
    
    if (!gameQuery.data || gameQuery.data.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    const game = gameQuery.data[0]
    
    // Get ALL snapshots for this game
    const allSnapshots = await clickhouseQuery<any>(`
      SELECT 
        snapshot_time,
        game_time,
        spread,
        total,
        ml_home,
        ml_away,
        spread_juice_home,
        total_juice_over,
        public_spread_home_bet_pct,
        public_total_over_bet_pct,
        is_opening
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${oddsApiId}'
      ORDER BY snapshot_time DESC
      LIMIT 50
    `)
    
    // Get snapshots BEFORE game time
    const preGameSnapshots = await clickhouseQuery<any>(`
      SELECT 
        snapshot_time,
        game_time,
        spread,
        total,
        ml_home,
        ml_away,
        spread_juice_home,
        total_juice_over,
        public_spread_home_bet_pct,
        public_total_over_bet_pct,
        is_opening
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${oddsApiId}'
        AND snapshot_time < toDateTime('${game.game_time}')
      ORDER BY snapshot_time DESC
      LIMIT 10
    `)
    
    // Get the LAST pre-game snapshot
    const lastPreGame = await clickhouseQuery<any>(`
      SELECT 
        snapshot_time,
        game_time,
        spread,
        total,
        ml_home,
        ml_away,
        spread_juice_home,
        total_juice_over,
        public_spread_home_bet_pct,
        public_total_over_bet_pct,
        is_opening
      FROM live_odds_snapshots
      WHERE odds_api_game_id = '${oddsApiId}'
        AND snapshot_time < toDateTime('${game.game_time}')
      ORDER BY snapshot_time DESC
      LIMIT 1
    `)
    
    return NextResponse.json({
      game: {
        id: game.game_id,
        matchup: `${game.away_team} @ ${game.home_team}`,
        gameTime: game.game_time,
        status: game.status,
        opening: {
          spread: game.spread_open,
          total: game.total_open,
        },
        closing: {
          spread: game.spread_close,
          total: game.total_close,
        },
        movement: {
          spread: game.spread_close - game.spread_open,
          total: game.total_close - game.total_open,
        },
      },
      snapshots: {
        total: allSnapshots.data?.length || 0,
        preGameCount: preGameSnapshots.data?.length || 0,
        all: allSnapshots.data || [],
        preGame: preGameSnapshots.data || [],
        lastPreGame: lastPreGame.data?.[0] || null,
      },
      diagnosis: {
        hasAnySnapshots: (allSnapshots.data?.length || 0) > 0,
        hasPreGameSnapshots: (preGameSnapshots.data?.length || 0) > 0,
        lastPreGameHasValidData: lastPreGame.data?.[0] ? {
          hasSpread: lastPreGame.data[0].spread !== null && lastPreGame.data[0].spread !== undefined,
          hasTotal: lastPreGame.data[0].total !== null && lastPreGame.data[0].total !== undefined,
          hasMl: lastPreGame.data[0].ml_home !== null && lastPreGame.data[0].ml_home !== undefined,
        } : null,
        recommendation: !allSnapshots.data || allSnapshots.data.length === 0 
          ? 'No snapshots exist - game may have been added after it started'
          : !preGameSnapshots.data || preGameSnapshots.data.length === 0
          ? 'No pre-game snapshots - all snapshots were recorded during/after game'
          : !lastPreGame.data?.[0]?.spread
          ? 'Last pre-game snapshot has NULL spread - may be incomplete data'
          : 'Data looks good - cleanup should work',
      },
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('[Debug Snapshots] Error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}

