import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'
import { calculateGameSignals, lineMoveScore, oddsMoveScore, marketPressure, isMovementFavorable } from '@/lib/signals/calculations'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Debug endpoint to analyze signal calculations for specific games
 * Usage: /api/debug/signals?sport=nfl&team=Ravens
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport')?.toLowerCase() || 'nfl'
  const team = searchParams.get('team') || ''

  try {
    // Get games for the specified sport/team
    const query = `
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
        g.spread_home_public_respect,
        g.spread_home_vegas_backed,
        g.spread_home_whale_respect,
        g.spread_away_public_respect,
        g.spread_away_vegas_backed,
        g.spread_away_whale_respect,
        g.total_over_public_respect,
        g.total_over_vegas_backed,
        g.total_over_whale_respect,
        g.total_under_public_respect,
        g.total_under_vegas_backed,
        g.total_under_whale_respect,
        g.ml_home_public_respect,
        g.ml_home_vegas_backed,
        g.ml_home_whale_respect,
        g.ml_away_public_respect,
        g.ml_away_vegas_backed,
        g.ml_away_whale_respect
      FROM games g FINAL
      LEFT JOIN teams ht ON g.home_team_id = ht.team_id AND ht.sport = g.sport
      LEFT JOIN teams at ON g.away_team_id = at.team_id AND at.sport = g.sport
      WHERE g.sport = '${sport}'
        ${team ? `AND (ht.name LIKE '%${team}%' OR at.name LIKE '%${team}%')` : ''}
        AND g.status = 'upcoming'
      ORDER BY g.game_time ASC
      LIMIT 10
    `

    const result = await clickhouseQuery<any>(query)

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        error: 'No games found',
        sport,
        team,
      })
    }

    // Analyze each game
    const analysis = result.data.map((game: any) => {
      // Recalculate signals fresh
      const calculatedSignals = calculateGameSignals(
        sport,
        // Spread data
        game.spread_open,
        game.spread_close,
        game.opening_home_spread_juice || -110,
        game.home_spread_juice || -110,
        game.opening_away_spread_juice || -110,
        game.away_spread_juice || -110,
        game.public_spread_home_bet_pct,
        game.public_spread_home_money_pct,
        // Total data
        game.total_open,
        game.total_close,
        game.opening_over_juice || -110,
        game.over_juice || -110,
        game.opening_under_juice || -110,
        game.under_juice || -110,
        game.public_total_over_bet_pct,
        game.public_total_over_money_pct,
        // ML data
        game.home_ml_open,
        game.home_ml_close,
        game.away_ml_open,
        game.away_ml_close,
        game.public_ml_home_bet_pct,
        game.public_ml_home_money_pct
      )

      // Calculate detailed breakdown for SPREAD (most common issue)
      const spreadLineScore = lineMoveScore(game.spread_open, game.spread_close, sport, 'spread')
      const spreadOddsScoreHome = oddsMoveScore(game.opening_home_spread_juice || -110, game.home_spread_juice || -110, sport, 'spread')
      const spreadOddsScoreAway = oddsMoveScore(game.opening_away_spread_juice || -110, game.away_spread_juice || -110, sport, 'spread')
      const spreadPressureHome = marketPressure(spreadLineScore, spreadOddsScoreHome, sport, 'spread')
      const spreadPressureAway = marketPressure(spreadLineScore, spreadOddsScoreAway, sport, 'spread')
      const spreadFavorableHome = isMovementFavorable(game.spread_open, game.spread_close, game.opening_home_spread_juice || -110, game.home_spread_juice || -110, 'home', 'spread')
      const spreadFavorableAway = isMovementFavorable(game.spread_open, game.spread_close, game.opening_away_spread_juice || -110, game.away_spread_juice || -110, 'away', 'spread')

      // Calculate detailed breakdown for TOTAL
      const totalLineScore = lineMoveScore(game.total_open, game.total_close, sport, 'total')
      const totalOddsScoreOver = oddsMoveScore(game.opening_over_juice || -110, game.over_juice || -110, sport, 'total')
      const totalOddsScoreUnder = oddsMoveScore(game.opening_under_juice || -110, game.under_juice || -110, sport, 'total')
      const totalPressureOver = marketPressure(totalLineScore, totalOddsScoreOver, sport, 'total')
      const totalPressureUnder = marketPressure(totalLineScore, totalOddsScoreUnder, sport, 'total')
      const totalFavorableOver = isMovementFavorable(game.total_open, game.total_close, game.opening_over_juice || -110, game.over_juice || -110, 'over', 'total')
      const totalFavorableUnder = isMovementFavorable(game.total_open, game.total_close, game.opening_under_juice || -110, game.under_juice || -110, 'under', 'total')

      return {
        game: `${game.away_team} @ ${game.home_team}`,
        gameId: game.game_id,
        gameTime: game.game_time,
        
        // === SPREAD ANALYSIS ===
        spread: {
          opening: game.spread_open,
          current: game.spread_close,
          movement: game.spread_close - game.spread_open,
          
          home: {
            team: game.home_team,
            betPct: game.public_spread_home_bet_pct,
            moneyPct: game.public_spread_home_money_pct,
            avgPct: (game.public_spread_home_bet_pct + game.public_spread_home_money_pct) / 2,
            openingJuice: game.opening_home_spread_juice,
            currentJuice: game.home_spread_juice,
            lineScore: spreadLineScore,
            oddsScore: spreadOddsScoreHome,
            pressure: spreadPressureHome,
            favorableMovement: spreadFavorableHome,
            storedSignals: {
              publicRespect: game.spread_home_public_respect,
              vegasBacked: game.spread_home_vegas_backed,
              whaleRespect: game.spread_home_whale_respect,
            },
            recalculatedSignals: {
              publicRespect: calculatedSignals.spread_home_public_respect,
              vegasBacked: calculatedSignals.spread_home_vegas_backed,
              whaleRespect: calculatedSignals.spread_home_whale_respect,
            },
          },
          
          away: {
            team: game.away_team,
            betPct: 100 - game.public_spread_home_bet_pct,
            moneyPct: 100 - game.public_spread_home_money_pct,
            avgPct: ((100 - game.public_spread_home_bet_pct) + (100 - game.public_spread_home_money_pct)) / 2,
            openingJuice: game.opening_away_spread_juice,
            currentJuice: game.away_spread_juice,
            lineScore: spreadLineScore,
            oddsScore: spreadOddsScoreAway,
            pressure: spreadPressureAway,
            favorableMovement: spreadFavorableAway,
            storedSignals: {
              publicRespect: game.spread_away_public_respect,
              vegasBacked: game.spread_away_vegas_backed,
              whaleRespect: game.spread_away_whale_respect,
            },
            recalculatedSignals: {
              publicRespect: calculatedSignals.spread_away_public_respect,
              vegasBacked: calculatedSignals.spread_away_vegas_backed,
              whaleRespect: calculatedSignals.spread_away_whale_respect,
            },
          },
        },
        
        // === TOTAL ANALYSIS ===
        total: {
          opening: game.total_open,
          current: game.total_close,
          movement: game.total_close - game.total_open,
          
          over: {
            betPct: game.public_total_over_bet_pct,
            moneyPct: game.public_total_over_money_pct,
            avgPct: (game.public_total_over_bet_pct + game.public_total_over_money_pct) / 2,
            openingJuice: game.opening_over_juice,
            currentJuice: game.over_juice,
            lineScore: totalLineScore,
            oddsScore: totalOddsScoreOver,
            pressure: totalPressureOver,
            favorableMovement: totalFavorableOver,
            storedSignals: {
              publicRespect: game.total_over_public_respect,
              vegasBacked: game.total_over_vegas_backed,
              whaleRespect: game.total_over_whale_respect,
            },
            recalculatedSignals: {
              publicRespect: calculatedSignals.total_over_public_respect,
              vegasBacked: calculatedSignals.total_over_vegas_backed,
              whaleRespect: calculatedSignals.total_over_whale_respect,
            },
          },
          
          under: {
            betPct: 100 - game.public_total_over_bet_pct,
            moneyPct: 100 - game.public_total_over_money_pct,
            avgPct: ((100 - game.public_total_over_bet_pct) + (100 - game.public_total_over_money_pct)) / 2,
            openingJuice: game.opening_under_juice,
            currentJuice: game.under_juice,
            lineScore: totalLineScore,
            oddsScore: totalOddsScoreUnder,
            pressure: totalPressureUnder,
            favorableMovement: totalFavorableUnder,
            storedSignals: {
              publicRespect: game.total_under_public_respect,
              vegasBacked: game.total_under_vegas_backed,
              whaleRespect: game.total_under_whale_respect,
            },
            recalculatedSignals: {
              publicRespect: calculatedSignals.total_under_public_respect,
              vegasBacked: calculatedSignals.total_under_vegas_backed,
              whaleRespect: calculatedSignals.total_under_whale_respect,
            },
          },
        },
        
        // === MONEYLINE ANALYSIS ===
        moneyline: {
          home: {
            team: game.home_team,
            opening: game.home_ml_open,
            current: game.home_ml_close,
            betPct: game.public_ml_home_bet_pct,
            moneyPct: game.public_ml_home_money_pct,
            storedSignals: {
              publicRespect: game.ml_home_public_respect,
              vegasBacked: game.ml_home_vegas_backed,
              whaleRespect: game.ml_home_whale_respect,
            },
            recalculatedSignals: {
              publicRespect: calculatedSignals.ml_home_public_respect,
              vegasBacked: calculatedSignals.ml_home_vegas_backed,
              whaleRespect: calculatedSignals.ml_home_whale_respect,
            },
          },
          away: {
            team: game.away_team,
            opening: game.away_ml_open,
            current: game.away_ml_close,
            betPct: 100 - game.public_ml_home_bet_pct,
            moneyPct: 100 - game.public_ml_home_money_pct,
            storedSignals: {
              publicRespect: game.ml_away_public_respect,
              vegasBacked: game.ml_away_vegas_backed,
              whaleRespect: game.ml_away_whale_respect,
            },
            recalculatedSignals: {
              publicRespect: calculatedSignals.ml_away_public_respect,
              vegasBacked: calculatedSignals.ml_away_vegas_backed,
              whaleRespect: calculatedSignals.ml_away_whale_respect,
            },
          },
        },
      }
    })

    return NextResponse.json({
      sport,
      team,
      gamesFound: result.data.length,
      analysis,
      notes: {
        thresholds: {
          publicRespect: 'Bets >= 55%, Money >= 55%, Favorable movement',
          vegasBacked: 'Avg(Bets, Money) < 50%, Favorable movement',
          whaleRespect: 'S1: Bets <= 50%, Money >= 50%, Gap >= 20% | S2: Bets 50-65%, Money >= 50%, Gap >= 30%',
        },
        movement: {
          spread: 'Home: currentLine < openLine = favorable for home (e.g., -8.5 → -9.5)',
          total: 'Over: currentLine > openLine = favorable for over (e.g., 45.5 → 46.5)',
          minLineMove: '0.5 points',
          minOddsMove: '1% implied probability change',
        },
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Debug Signals] Error:', error)
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    )
  }
}

