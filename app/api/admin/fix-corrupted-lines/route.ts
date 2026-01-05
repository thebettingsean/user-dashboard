import { NextResponse } from 'next/server'
import { clickhouseQuery, clickhouseCommand } from '@/lib/clickhouse'
import { calculateGameSignals } from '@/lib/signals/calculations'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * ADMIN ENDPOINT: Fix corrupted line data for completed games
 * 
 * Problem: We were updating spread_close/total_close for games AFTER they started,
 * recording live in-game lines instead of true closing lines.
 * 
 * Solution:
 * 1. Find all games with status 'completed' or 'closing_soon' or 'upcoming' but game_time < now
 * 2. For each game, find the LAST snapshot BEFORE kickoff
 * 3. Use that snapshot's lines as the true "close" lines
 * 4. Recalculate signals based on opening → true close
 * 5. Update games table with corrected data
 * 
 * Usage: GET /api/admin/fix-corrupted-lines?sport=nfl&limit=100&dryRun=true
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'all'
  const limit = parseInt(searchParams.get('limit') || '100')
  const dryRun = searchParams.get('dryRun') !== 'false' // Default to true for safety
  
  const results = {
    dryRun,
    sport,
    limit,
    gamesChecked: 0,
    gamesFixed: 0,
    gamesSkipped: 0,
    errors: [] as string[],
    examples: [] as any[],
  }
  
  try {
    // Find games that need fixing (completed or past kickoff)
    const sportFilter = sport === 'all' ? '' : `AND g.sport = '${sport}'`
    
    const corruptedGamesQuery = await clickhouseQuery<any>(`
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
        g.home_ml_open,
        g.home_ml_close,
        g.away_ml_open,
        g.away_ml_close,
        g.opening_home_spread_juice,
        g.home_spread_juice,
        g.opening_away_spread_juice,
        g.away_spread_juice,
        g.opening_over_juice,
        g.over_juice,
        g.opening_under_juice,
        g.under_juice,
        g.public_spread_home_bet_pct,
        g.public_spread_home_money_pct,
        g.public_ml_home_bet_pct,
        g.public_ml_home_money_pct,
        g.public_total_over_bet_pct,
        g.public_total_over_money_pct,
        g.home_team_id,
        g.away_team_id,
        g.sportsdata_io_score_id,
        g.status
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.game_time < now() - INTERVAL 30 MINUTE
        ${sportFilter}
      ORDER BY g.game_time DESC
      LIMIT ${limit}
    `)
    
    if (!corruptedGamesQuery.data || corruptedGamesQuery.data.length === 0) {
      return NextResponse.json({
        ...results,
        message: 'No games found that need fixing',
      })
    }
    
    console.log(`[Fix Corrupted Lines] Found ${corruptedGamesQuery.data.length} games to check`)
    
    // Process each game
    for (const game of corruptedGamesQuery.data) {
      results.gamesChecked++
      
      try {
        // Extract odds_api_game_id from game_id (format: sport_oddsApiId)
        const oddsApiId = game.game_id.split('_')[1]
        if (!oddsApiId) {
          results.gamesSkipped++
          results.errors.push(`${game.game_id}: Could not extract odds API ID`)
          continue
        }
        
        // Find the LAST snapshot BEFORE kickoff
        const lastPreGameSnapshot = await clickhouseQuery<any>(`
          SELECT 
            spread, spread_juice_home, spread_juice_away,
            total, total_juice_over, total_juice_under,
            ml_home, ml_away,
            public_spread_home_bet_pct, public_spread_home_money_pct,
            public_ml_home_bet_pct, public_ml_home_money_pct,
            public_total_over_bet_pct, public_total_over_money_pct,
            snapshot_time
          FROM live_odds_snapshots
          WHERE odds_api_game_id = '${oddsApiId}'
            AND snapshot_time < toDateTime('${game.game_time}')
          ORDER BY snapshot_time DESC
          LIMIT 1
        `)
        
        if (!lastPreGameSnapshot.data || lastPreGameSnapshot.data.length === 0) {
          results.gamesSkipped++
          results.errors.push(`${game.game_id}: No pre-game snapshots found`)
          continue
        }
        
        const snapshot = lastPreGameSnapshot.data[0]
        
        // Check if the current "close" lines are significantly different from pre-game snapshot
        // (Indicates they were recorded during/after game)
        const spreadDiff = Math.abs(game.spread_close - snapshot.spread)
        const totalDiff = Math.abs(game.total_close - snapshot.total)
        const mlHomeDiff = Math.abs(game.home_ml_close - snapshot.ml_home)
        
        // If differences are minimal, skip (data is probably fine)
        if (spreadDiff < 1 && totalDiff < 1 && mlHomeDiff < 10) {
          results.gamesSkipped++
          continue
        }
        
        // This game has corrupted lines - fix it!
        const trueCloseSpread = snapshot.spread
        const trueCloseTotal = snapshot.total
        const trueCloseMlHome = snapshot.ml_home
        const trueCloseMlAway = snapshot.ml_away
        
        // Use snapshot's public data if available, otherwise keep existing
        const finalSpreadBet = snapshot.public_spread_home_bet_pct !== 50 && snapshot.public_spread_home_bet_pct !== null
          ? snapshot.public_spread_home_bet_pct 
          : game.public_spread_home_bet_pct
        const finalSpreadMoney = snapshot.public_spread_home_money_pct !== 50 && snapshot.public_spread_home_money_pct !== null
          ? snapshot.public_spread_home_money_pct 
          : game.public_spread_home_money_pct
        const finalMlBet = snapshot.public_ml_home_bet_pct !== 50 && snapshot.public_ml_home_bet_pct !== null
          ? snapshot.public_ml_home_bet_pct 
          : game.public_ml_home_bet_pct
        const finalMlMoney = snapshot.public_ml_home_money_pct !== 50 && snapshot.public_ml_home_money_pct !== null
          ? snapshot.public_ml_home_money_pct 
          : game.public_ml_home_money_pct
        const finalTotalBet = snapshot.public_total_over_bet_pct !== 50 && snapshot.public_total_over_bet_pct !== null
          ? snapshot.public_total_over_bet_pct 
          : game.public_total_over_bet_pct
        const finalTotalMoney = snapshot.public_total_over_money_pct !== 50 && snapshot.public_total_over_money_pct !== null
          ? snapshot.public_total_over_money_pct 
          : game.public_total_over_money_pct
        
        // Validate all required data is present before calculating signals
        if (!game.sport || 
            game.spread_open === null || game.spread_open === undefined ||
            trueCloseSpread === null || trueCloseSpread === undefined ||
            game.total_open === null || game.total_open === undefined ||
            trueCloseTotal === null || trueCloseTotal === undefined) {
          results.gamesSkipped++
          results.errors.push(`${game.game_id}: Missing required data for signal calculation`)
          continue
        }
        
        // Recalculate signals with correct lines (with safe defaults)
        const signals = calculateGameSignals(
          game.sport || 'nfl',
          // Spread data
          game.spread_open || 0,
          trueCloseSpread || 0,
          game.opening_home_spread_juice || -110,
          snapshot.spread_juice_home || -110,
          game.opening_away_spread_juice || -110,
          snapshot.spread_juice_away || -110,
          finalSpreadBet || 50,
          finalSpreadMoney || 50,
          // Total data
          game.total_open || 0,
          trueCloseTotal || 0,
          game.opening_over_juice || -110,
          snapshot.total_juice_over || -110,
          game.opening_under_juice || -110,
          snapshot.total_juice_under || -110,
          finalTotalBet || 50,
          finalTotalMoney || 50,
          // ML data
          game.home_ml_open || 0,
          trueCloseMlHome || 0,
          game.away_ml_open || 0,
          trueCloseMlAway || 0,
          finalMlBet || 50,
          finalMlMoney || 50
        )
        
        // Store example for response
        if (results.examples.length < 10) {
          results.examples.push({
            game: `${game.away_team} @ ${game.home_team}`,
            gameId: game.game_id,
            gameTime: game.game_time,
            corrupted: {
              spread: `${game.spread_open} → ${game.spread_close} (${(game.spread_close - game.spread_open).toFixed(1)} move)`,
              total: `${game.total_open} → ${game.total_close} (${(game.total_close - game.total_open).toFixed(1)} move)`,
              mlHome: `${game.home_ml_open} → ${game.home_ml_close}`,
            },
            fixed: {
              spread: `${game.spread_open} → ${trueCloseSpread} (${(trueCloseSpread - game.spread_open).toFixed(1)} move)`,
              total: `${game.total_open} → ${trueCloseTotal} (${(trueCloseTotal - game.total_open).toFixed(1)} move)`,
              mlHome: `${game.home_ml_open} → ${trueCloseMlHome}`,
            },
            snapshotTime: snapshot.snapshot_time,
          })
        }
        
        // Update the game with corrected data
        if (!dryRun) {
          await clickhouseCommand(`
            INSERT INTO games (
              game_id, sport, game_time, home_team_id, away_team_id,
              spread_open, spread_close, total_open, total_close,
              home_ml_open, away_ml_open, home_ml_close, away_ml_close,
              home_spread_juice, away_spread_juice, over_juice, under_juice,
              opening_home_spread_juice, opening_away_spread_juice, opening_over_juice, opening_under_juice,
              public_spread_home_bet_pct, public_spread_home_money_pct,
              public_ml_home_bet_pct, public_ml_home_money_pct,
              public_total_over_bet_pct, public_total_over_money_pct,
              spread_home_public_respect, spread_home_vegas_backed, spread_home_whale_respect,
              spread_away_public_respect, spread_away_vegas_backed, spread_away_whale_respect,
              total_over_public_respect, total_over_vegas_backed, total_over_whale_respect,
              total_under_public_respect, total_under_vegas_backed, total_under_whale_respect,
              ml_home_public_respect, ml_home_vegas_backed, ml_home_whale_respect,
              ml_away_public_respect, ml_away_vegas_backed, ml_away_whale_respect,
              status, sportsdata_io_score_id, updated_at
            ) VALUES (
              '${game.game_id}', '${game.sport}', '${game.game_time}', ${game.home_team_id}, ${game.away_team_id},
              ${game.spread_open}, ${trueCloseSpread}, ${game.total_open}, ${trueCloseTotal},
              ${game.home_ml_open}, ${game.away_ml_open}, ${trueCloseMlHome}, ${trueCloseMlAway},
              ${snapshot.spread_juice_home || -110}, ${snapshot.spread_juice_away || -110}, 
              ${snapshot.total_juice_over || -110}, ${snapshot.total_juice_under || -110},
              ${game.opening_home_spread_juice || -110}, ${game.opening_away_spread_juice || -110}, 
              ${game.opening_over_juice || -110}, ${game.opening_under_juice || -110},
              ${finalSpreadBet}, ${finalSpreadMoney},
              ${finalMlBet}, ${finalMlMoney},
              ${finalTotalBet}, ${finalTotalMoney},
              ${signals.spread_home_public_respect}, ${signals.spread_home_vegas_backed}, ${signals.spread_home_whale_respect},
              ${signals.spread_away_public_respect}, ${signals.spread_away_vegas_backed}, ${signals.spread_away_whale_respect},
              ${signals.total_over_public_respect}, ${signals.total_over_vegas_backed}, ${signals.total_over_whale_respect},
              ${signals.total_under_public_respect}, ${signals.total_under_vegas_backed}, ${signals.total_under_whale_respect},
              ${signals.ml_home_public_respect}, ${signals.ml_home_vegas_backed}, ${signals.ml_home_whale_respect},
              ${signals.ml_away_public_respect}, ${signals.ml_away_vegas_backed}, ${signals.ml_away_whale_respect},
              '${game.status}', ${game.sportsdata_io_score_id}, now()
            )
          `)
        }
        
        results.gamesFixed++
        
      } catch (gameError: any) {
        results.errors.push(`${game.game_id}: ${gameError.message}`)
        console.error(`[Fix Corrupted Lines] Error fixing game ${game.game_id}:`, {
          error: gameError.message,
          stack: gameError.stack,
          gameData: {
            sport: game.sport,
            spread_open: game.spread_open,
            spread_close: game.spread_close,
            total_open: game.total_open,
            total_close: game.total_close,
          }
        })
      }
    }
    
    return NextResponse.json({
      ...results,
      message: dryRun 
        ? `DRY RUN: Found ${results.gamesFixed} games that need fixing. Run with ?dryRun=false to apply fixes.`
        : `Successfully fixed ${results.gamesFixed} games!`,
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('[Fix Corrupted Lines] Fatal Error:', error)
    return NextResponse.json(
      { ...results, error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}

