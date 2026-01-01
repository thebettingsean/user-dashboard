import { clickhouseQuery } from '../lib/clickhouse'

async function checkSchema() {
  // Check games table schema
  const schema = await clickhouseQuery<any>(`
    SHOW CREATE TABLE games
  `)
  
  console.log('=== GAMES TABLE SCHEMA ===')
  console.log(schema.data?.[0]?.statement || JSON.stringify(schema.data))
}

checkSchema().catch(console.error)

