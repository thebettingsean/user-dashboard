/**
 * Query Engine API Endpoint
 * Unified entry point for all historical data queries
 * 
 * POST /api/query-engine
 * 
 * Supports:
 * - Player prop queries (type: 'prop')
 * - Team betting queries (type: 'team')
 * - Referee queries (type: 'referee')
 * - League-wide trends (type: 'trend')
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/query-engine'
import type { QueryRequest, QueryResult } from '@/lib/query-engine/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as QueryRequest
    
    // Validate request
    if (!body.type) {
      return NextResponse.json(
        { error: 'Missing query type' },
        { status: 400 }
      )
    }
    
    // Execute query
    const result = await executeQuery(body)
    
    return NextResponse.json({
      success: true,
      ...result
    })
    
  } catch (error: any) {
    console.error('[QueryEngine] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Query failed' },
      { status: 500 }
    )
  }
}

// GET endpoint for simple queries via URL params
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const type = searchParams.get('type')
  
  if (!type) {
    return NextResponse.json({
      message: 'Query Engine API',
      usage: {
        prop_query: {
          method: 'POST',
          body: {
            type: 'prop',
            player_id: 3139477,
            stat: 'pass_yards',
            line: 250,
            filters: {
              time_period: 'L10',
              location: 'home'
            }
          }
        },
        team_query: {
          method: 'POST',
          body: {
            type: 'team',
            team_id: 12,
            bet_type: 'spread',
            filters: {
              time_period: 'L15',
              is_favorite: 'favorite',
              spread_range: { min: -7, max: -3 }
            }
          }
        },
        trend_query: {
          method: 'POST',
          body: {
            type: 'trend',
            bet_type: 'spread',
            side: 'underdog',
            filters: {
              time_period: 'L3years',
              is_division: 'division',
              total_range: { min: 45, max: 50 }
            }
          }
        }
      },
      available_filters: {
        time_period: ['L3', 'L5', 'L10', 'L15', 'L20', 'L30', 'season', 'last_season', 'L2years', 'L3years', 'since_2022'],
        location: ['home', 'away', 'any'],
        is_division: ['division', 'non_division', 'any'],
        is_conference: ['conference', 'non_conference', 'any'],
        is_playoff: ['playoff', 'regular', 'any'],
        is_favorite: ['favorite', 'underdog', 'any'],
        team_result: ['won', 'lost', 'any'],
        vs_defense_rank: ['top_5', 'top_10', 'top_15', 'bottom_5', 'bottom_10', 'bottom_15', 'any'],
        line_movement: ['positive', 'negative', 'any'],
        spread_range: 'object { min: number, max: number }',
        total_range: 'object { min: number, max: number }'
      },
      prop_stat_types: [
        'pass_yards', 'pass_tds', 'pass_attempts', 'pass_completions', 'interceptions',
        'rush_yards', 'rush_tds', 'rush_attempts', 'yards_per_carry',
        'receiving_yards', 'receptions', 'receiving_tds', 'targets',
        'fantasy_points', 'completions_plus_rush_yards'
      ],
      team_bet_types: ['spread', 'total', 'moneyline']
    })
  }
  
  // Handle simple GET queries
  try {
    const queryRequest: QueryRequest = {
      type: type as any,
      player_id: parseInt(searchParams.get('player_id') || '0'),
      team_id: parseInt(searchParams.get('team_id') || '0') || undefined,
      stat: searchParams.get('stat') as any,
      bet_type: searchParams.get('bet_type') as any,
      side: searchParams.get('side') as any,
      line: parseFloat(searchParams.get('line') || '0'),
      filters: {
        time_period: searchParams.get('time_period') as any || 'L10',
        location: searchParams.get('location') as any || 'any',
        is_division: searchParams.get('is_division') as any || 'any',
        is_conference: searchParams.get('is_conference') as any || 'any',
        is_playoff: searchParams.get('is_playoff') as any || 'any',
        is_favorite: searchParams.get('is_favorite') as any || 'any'
      }
    } as QueryRequest
    
    const result = await executeQuery(queryRequest)
    
    return NextResponse.json({
      success: true,
      ...result
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

