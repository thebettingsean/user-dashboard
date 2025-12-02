/**
 * ClickHouse Cloud Client for Prop Analytics Engine
 * Uses REST API with API keys for authentication
 */

const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST || 'https://queries.clickhouse.cloud/service/a54845b1-196e-4d49-9972-3cd55e6766b1/run'
const CLICKHOUSE_KEY_ID = process.env.CLICKHOUSE_KEY_ID || 'NhCacNZ17p6tH1xv5VcZ'
const CLICKHOUSE_KEY_SECRET = process.env.CLICKHOUSE_KEY_SECRET || '4b1dxwoWH7vdq5hczTJUJjepfko718M8PfiQen8xWP'

export interface ClickHouseQueryResult<T = any> {
  data: T[]
  rows: number
  statistics?: {
    elapsed: number
    rows_read: number
    bytes_read: number
  }
}

/**
 * Execute a ClickHouse query
 */
export async function clickhouseQuery<T = any>(
  sql: string,
  format: string = 'JSONEachRow'
): Promise<ClickHouseQueryResult<T>> {
  const startTime = Date.now()
  
  try {
    console.log('[ClickHouse] Executing query:', sql.substring(0, 150) + '...')
    
    const url = `${CLICKHOUSE_HOST}?format=${format}`
    const auth = Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({ sql }),
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ClickHouse] Query failed:', errorText)
      throw new Error(`ClickHouse query failed: ${errorText}`)
    }

    const text = await response.text()
    
    // Parse JSONEachRow format (one JSON object per line)
    const lines = text.trim().split('\n').filter(Boolean)
    const data = lines.map(line => JSON.parse(line))
    
    const elapsed = Date.now() - startTime
    console.log(`[ClickHouse] ✅ Query completed in ${elapsed}ms, returned ${data.length} rows`)

    return {
      data,
      rows: data.length,
      statistics: {
        elapsed,
        rows_read: data.length,
        bytes_read: text.length
      }
    }
  } catch (error) {
    console.error('[ClickHouse] Error:', error)
    throw error
  }
}

/**
 * Execute a command (CREATE, INSERT, DROP, etc.)
 */
export async function clickhouseCommand(sql: string): Promise<void> {
  try {
    console.log('[ClickHouse] Executing command:', sql.substring(0, 100) + '...')
    
    const auth = Buffer.from(`${CLICKHOUSE_KEY_ID}:${CLICKHOUSE_KEY_SECRET}`).toString('base64')
    
    const response = await fetch(CLICKHOUSE_HOST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ClickHouse] Command failed:', errorText)
      throw new Error(`ClickHouse command failed: ${errorText}`)
    }

    console.log('[ClickHouse] ✅ Command executed successfully')
  } catch (error) {
    console.error('[ClickHouse] Error:', error)
    throw error
  }
}

/**
 * Insert data into ClickHouse (bulk insert)
 */
export async function clickhouseInsert<T extends Record<string, any>>(
  table: string,
  data: T[]
): Promise<void> {
  if (data.length === 0) {
    console.log('[ClickHouse] No data to insert')
    return
  }

  const columns = Object.keys(data[0])
  const values = data.map(row => 
    `(${columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`
      if (typeof val === 'boolean') return val ? 1 : 0
      if (val instanceof Date) return `'${val.toISOString()}'`
      return val
    }).join(', ')})`
  ).join(',\n')

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values}`
  
  console.log(`[ClickHouse] Inserting ${data.length} rows into ${table}`)
  await clickhouseCommand(sql)
}

/**
 * Test connection to ClickHouse
 */
export async function testClickHouseConnection(): Promise<boolean> {
  try {
    const result = await clickhouseQuery<{test: number}>('SELECT 1 as test')
    const success = result.data[0]?.test === 1
    console.log('[ClickHouse] Connection test:', success ? '✅ SUCCESS' : '❌ FAILED')
    return success
  } catch (error) {
    console.error('[ClickHouse] Connection test failed:', error)
    return false
  }
}
