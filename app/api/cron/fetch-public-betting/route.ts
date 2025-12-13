import { NextResponse } from 'next/server'
import { clickhouseCommand } from '@/lib/clickhouse'

const SPORTSDATA_API_KEY = process.env.SPORTSDATA_IO_SPLITS_KEY

// NFL team abbreviation to full name mapping
const ABBREV_TO_FULL: Record<string, string> = {
  'ARI': 'Arizona Cardinals', 'ATL': 'Atlanta Falcons', 'BAL': 'Baltimore Ravens',
  'BUF': 'Buffalo Bills', 'CAR': 'Carolina Panthers', 'CHI': 'Chicago Bears',
  'CIN': 'Cincinnati Bengals', 'CLE': 'Cleveland Browns', 'DAL': 'Dallas Cowboys',
  'DEN': 'Denver Broncos', 'DET': 'Detroit Lions', 'GB': 'Green Bay Packers',
  'HOU': 'Houston Texans', 'IND': 'Indianapolis Colts', 'JAX': 'Jacksonville Jaguars',
  'KC': 'Kansas City Chiefs', 'LV': 'Las Vegas Raiders', 'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams', 'MIA': 'Miami Dolphins', 'MIN': 'Minnesota Vikings',
  'NE': 'New England Patriots', 'NO': 'New Orleans Saints', 'NYG': 'New York Giants',
  'NYJ': 'New York Jets', 'PHI': 'Philadelphia Eagles', 'PIT': 'Pittsburgh Steelers',
  'SF': 'San Francisco 49ers', 'SEA': 'Seattle Seahawks', 'TB': 'Tampa Bay Buccaneers',
  'TEN': 'Tennessee Titans', 'WAS': 'Washington Commanders', 'LA': 'Los Angeles Rams',
}

export async function GET() {
  if (!SPORTSDATA_API_KEY) {
    return NextResponse.json({ error: 'SPORTSDATA_IO_SPLITS_KEY not set' }, { status: 500 })
  }

  const snapshotTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const results: any[] = []
  let successCount = 0

  // Week 15 2024 ScoreIDs are in range 19229-19250
  // Week 14 was 19213-19228
  // Let's scan both to be safe
  for (let scoreId = 19213; scoreId <= 19260; scoreId++) {
    try {
      const url = `https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/${scoreId}?key=${SPORTSDATA_API_KEY}`
      const response = await fetch(url)
      
      if (!response.ok) continue
      
      const data = await response.json()
      if (!data?.BettingMarketSplits || data.BettingMarketSplits.length === 0) continue
      
      // Extract public betting percentages
      let spreadBet = 0, spreadMoney = 0, mlBet = 0, mlMoney = 0, totalBet = 0, totalMoney = 0
      
      for (const market of data.BettingMarketSplits) {
        const homeSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Home')
        const overSplit = market.BettingSplits?.find((s: any) => s.BettingOutcomeType === 'Over')
        
        if (market.BettingBetType === 'Spread' && homeSplit) {
          spreadBet = homeSplit.BetPercentage || 0
          spreadMoney = homeSplit.MoneyPercentage || 0
        } else if (market.BettingBetType === 'Moneyline' && homeSplit) {
          mlBet = homeSplit.BetPercentage || 0
          mlMoney = homeSplit.MoneyPercentage || 0
        } else if (market.BettingBetType === 'Total Points' && overSplit) {
          totalBet = overSplit.BetPercentage || 0
          totalMoney = overSplit.MoneyPercentage || 0
        }
      }
      
      // Get team names
      const homeTeam = ABBREV_TO_FULL[data.HomeTeam] || data.HomeTeam
      const awayTeam = ABBREV_TO_FULL[data.AwayTeam] || data.AwayTeam
      const gameTime = data.Date?.replace('T', ' ').substring(0, 19) || snapshotTime
      
      // Create a unique game ID
      const gameId = `sportsdata_${scoreId}`
      
      // Insert into live_odds_snapshots
      const insertSql = `
        INSERT INTO live_odds_snapshots (
          odds_api_game_id,
          sportsdata_score_id,
          sport,
          home_team,
          away_team,
          game_time,
          snapshot_time,
          public_spread_home_bet_pct,
          public_spread_home_money_pct,
          public_ml_home_bet_pct,
          public_ml_home_money_pct,
          public_total_over_bet_pct,
          public_total_over_money_pct
        ) VALUES (
          '${gameId}',
          ${scoreId},
          'nfl',
          '${homeTeam.replace(/'/g, "''")}',
          '${awayTeam.replace(/'/g, "''")}',
          '${gameTime}',
          '${snapshotTime}',
          ${spreadBet},
          ${spreadMoney},
          ${mlBet},
          ${mlMoney},
          ${totalBet},
          ${totalMoney}
        )
      `
      
      await clickhouseCommand(insertSql)
      successCount++
      
      results.push({
        scoreId,
        home: data.HomeTeam,
        away: data.AwayTeam,
        spreadBet,
        spreadMoney,
        mlBet,
        totalBet
      })
      
    } catch (e) {
      // Continue on error
    }
  }

  return NextResponse.json({
    success: true,
    snapshotTime,
    gamesUpdated: successCount,
    results
  })
}

