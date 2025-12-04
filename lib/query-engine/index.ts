/**
 * Query Engine Index
 * Unified entry point for all query types
 */

export * from './types'
export * from './filter-builder'
export { executePropQuery } from './prop-query'
export { executeTeamQuery } from './team-query'
export { executeTrendQuery } from './trend-query'
export { executeRefereeQuery, getRefereeList } from './referee-query'

import type { QueryRequest, QueryResult } from './types'
import { executePropQuery } from './prop-query'
import { executeTeamQuery } from './team-query'
import { executeTrendQuery } from './trend-query'
import { executeRefereeQuery } from './referee-query'

/**
 * Execute any query type
 */
export async function executeQuery(request: QueryRequest): Promise<QueryResult> {
  switch (request.type) {
    case 'prop':
      return executePropQuery(request)
    case 'team':
      return executeTeamQuery(request)
    case 'trend':
      return executeTrendQuery(request)
    case 'referee':
      return executeRefereeQuery(request)
    default:
      throw new Error(`Unknown query type: ${(request as any).type}`)
  }
}

