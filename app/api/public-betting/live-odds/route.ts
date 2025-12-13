import { NextResponse } from 'next/server'
import { clickhouseQuery } from '@/lib/clickhouse'

// NFL team name to logo URL mapping
const NFL_LOGOS: Record<string, string> = {
  'Arizona Cardinals': 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png',
  'Atlanta Falcons': 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
  'Baltimore Ravens': 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
  'Buffalo Bills': 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
  'Carolina Panthers': 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png',
  'Chicago Bears': 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
  'Cincinnati Bengals': 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
  'Cleveland Browns': 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png',
  'Dallas Cowboys': 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
  'Denver Broncos': 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png',
  'Detroit Lions': 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png',
  'Green Bay Packers': 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',
  'Houston Texans': 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png',
  'Indianapolis Colts': 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png',
  'Jacksonville Jaguars': 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png',
  'Kansas City Chiefs': 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
  'Las Vegas Raiders': 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',
  'Los Angeles Chargers': 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png',
  'Los Angeles Rams': 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png',
  'Miami Dolphins': 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
  'Minnesota Vikings': 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png',
  'New England Patriots': 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
  'New Orleans Saints': 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',
  'New York Giants': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png',
  'New York Jets': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
  'Philadelphia Eagles': 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
  'Pittsburgh Steelers': 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
  'San Francisco 49ers': 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
  'Seattle Seahawks': 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
  'Tampa Bay Buccaneers': 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
  'Tennessee Titans': 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png',
  'Washington Commanders': 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png',
}

// NFL team abbreviations
const NFL_ABBREVS: Record<string, string> = {
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'all'
  
  try {
    // Query that gets both opening (first) and current (latest) snapshots per game
    // ONLY upcoming games (game_time > now())
    // Use absolute latest snapshot for current lines (to match timeline graph)
    // But get public betting from most recent snapshot that has it
    const query = `
      WITH 
      -- Get absolute latest snapshot for current lines
      latest AS (
        SELECT 
          odds_api_game_id,
          sport,
          home_team,
          away_team,
          game_time,
          spread as current_spread,
          total as current_total,
          ml_home as current_ml_home,
          ml_away as current_ml_away,
          snapshot_time as last_updated
        FROM live_odds_snapshots
        WHERE (odds_api_game_id, snapshot_time) IN (
          SELECT odds_api_game_id, max(snapshot_time)
          FROM live_odds_snapshots
          WHERE game_time > now()
          GROUP BY odds_api_game_id
        )
        AND game_time > now()
        ${sport !== 'all' ? `AND sport = '${sport}'` : ''}
      ),
      -- Get latest snapshot WITH betting data for public betting percentages
      betting AS (
        SELECT 
          odds_api_game_id,
          public_spread_home_bet_pct,
          public_spread_home_money_pct,
          public_ml_home_bet_pct,
          public_ml_home_money_pct,
          public_total_over_bet_pct,
          public_total_over_money_pct
        FROM live_odds_snapshots
        WHERE (odds_api_game_id, snapshot_time) IN (
          SELECT odds_api_game_id, max(snapshot_time)
          FROM live_odds_snapshots
          WHERE game_time > now()
          AND public_spread_home_bet_pct > 0 AND public_spread_home_bet_pct != 50
          GROUP BY odds_api_game_id
        )
        AND game_time > now()
        ${sport !== 'all' ? `AND sport = '${sport}'` : ''}
      ),
      -- Combined: latest lines + betting percentages
      combined AS (
        SELECT 
          l.*,
          COALESCE(b.public_spread_home_bet_pct, 50) as public_spread_home_bet_pct,
          COALESCE(b.public_spread_home_money_pct, 50) as public_spread_home_money_pct,
          COALESCE(b.public_ml_home_bet_pct, 50) as public_ml_home_bet_pct,
          COALESCE(b.public_ml_home_money_pct, 50) as public_ml_home_money_pct,
          COALESCE(b.public_total_over_bet_pct, 50) as public_total_over_bet_pct,
          COALESCE(b.public_total_over_money_pct, 50) as public_total_over_money_pct
        FROM latest l
        LEFT JOIN betting b ON l.odds_api_game_id = b.odds_api_game_id
      ),
      opening AS (
        SELECT 
          odds_api_game_id,
          spread as opening_spread,
          total as opening_total,
          ml_home as opening_ml_home,
          ml_away as opening_ml_away
        FROM live_odds_snapshots
        WHERE (odds_api_game_id, snapshot_time) IN (
          SELECT odds_api_game_id, min(snapshot_time)
          FROM live_odds_snapshots
          WHERE game_time > now()
          GROUP BY odds_api_game_id
        )
        AND game_time > now()
        ${sport !== 'all' ? `AND sport = '${sport}'` : ''}
      )
      SELECT 
        l.*,
        o.opening_spread,
        o.opening_total,
        o.opening_ml_home,
        o.opening_ml_away
      FROM combined l
      LEFT JOIN opening o ON l.odds_api_game_id = o.odds_api_game_id
      ORDER BY l.game_time ASC
      LIMIT 100
    `
    
    const result = await clickhouseQuery<any>(query)
    
    if (!result.data || result.data.length === 0) {
      return NextResponse.json({
        success: true,
        games: [],
        total: 0,
        source: 'clickhouse',
        message: 'No upcoming games found',
        updated_at: new Date().toISOString()
      })
    }
    
    // Process games
    const games = result.data.map((game: any) => {
      // Calculate line movements
      const spread_movement = (game.current_spread || 0) - (game.opening_spread || game.current_spread || 0)
      const total_movement = (game.current_total || 0) - (game.opening_total || game.current_total || 0)
      
      // ML movement (absolute change, not percentage - e.g., +275 to +315 = +40)
      const ml_home_movement = (game.current_ml_home || 0) - (game.opening_ml_home || game.current_ml_home || 0)
      const ml_away_movement = (game.current_ml_away || 0) - (game.opening_ml_away || game.current_ml_away || 0)
      
      // Get percentages - use actual values, default to 50 only if truly zero/null
      const spreadBetPct = game.public_spread_home_bet_pct > 0 ? game.public_spread_home_bet_pct : 50
      const spreadMoneyPct = game.public_spread_home_money_pct > 0 ? game.public_spread_home_money_pct : 50
      const mlBetPct = game.public_ml_home_bet_pct > 0 ? game.public_ml_home_bet_pct : 50
      const mlMoneyPct = game.public_ml_home_money_pct > 0 ? game.public_ml_home_money_pct : 50
      const totalBetPct = game.public_total_over_bet_pct > 0 ? game.public_total_over_bet_pct : 50
      const totalMoneyPct = game.public_total_over_money_pct > 0 ? game.public_total_over_money_pct : 50
      
      // Calculate RLM and Sharp indicators based on spread
      const publicOnHome = spreadBetPct > 55
      const publicOnAway = spreadBetPct < 45
      const spreadDiff = Math.abs(spreadMoneyPct - spreadBetPct)
      
      let rlm = '-'
      let respected = ''
      
      // RLM: Public on one side, money on the other
      if (publicOnHome && spreadMoneyPct < 45) {
        rlm = 'RLM'
        respected = 'Sharp'
      } else if (publicOnAway && spreadMoneyPct > 55) {
        rlm = 'RLM'
        respected = 'Sharp'
      } else if (spreadDiff >= 10) {
        rlm = 'Steam'
        respected = 'Sharp'
      } else if (spreadDiff >= 5) {
        respected = 'Lean'
      }
      
      // Get logos and abbreviations
      const homeLogo = NFL_LOGOS[game.home_team] || ''
      const awayLogo = NFL_LOGOS[game.away_team] || ''
      const homeAbbrev = NFL_ABBREVS[game.home_team] || game.home_team.split(' ').pop()?.substring(0, 3).toUpperCase() || 'UNK'
      const awayAbbrev = NFL_ABBREVS[game.away_team] || game.away_team.split(' ').pop()?.substring(0, 3).toUpperCase() || 'UNK'
      
      return {
        id: game.odds_api_game_id,
        sport: game.sport,
        home_team: game.home_team,
        away_team: game.away_team,
        home_abbrev: homeAbbrev,
        away_abbrev: awayAbbrev,
        home_logo: homeLogo,
        away_logo: awayLogo,
        game_time: game.game_time,
        
        // Spread
        opening_spread: game.opening_spread || game.current_spread || 0,
        current_spread: game.current_spread || 0,
        spread_movement: spread_movement,
        
        // Totals
        opening_total: game.opening_total || game.current_total || 0,
        current_total: game.current_total || 0,
        total_movement: total_movement,
        
        // Moneylines
        opening_ml_home: game.opening_ml_home || game.current_ml_home || 0,
        opening_ml_away: game.opening_ml_away || game.current_ml_away || 0,
        current_ml_home: game.current_ml_home || 0,
        current_ml_away: game.current_ml_away || 0,
        ml_home_movement: ml_home_movement,
        ml_away_movement: ml_away_movement,
        
        // Public betting - SPREAD
        public_spread_bet_pct: spreadBetPct,
        public_spread_money_pct: spreadMoneyPct,
        
        // Public betting - MONEYLINE
        public_ml_bet_pct: mlBetPct,
        public_ml_money_pct: mlMoneyPct,
        
        // Public betting - TOTALS
        public_total_bet_pct: totalBetPct,
        public_total_money_pct: totalMoneyPct,
        
        // Indicators
        rlm,
        respected,
        money_vs_bets_diff: spreadDiff,
        
        last_updated: game.last_updated
      }
    })
    
    return NextResponse.json({
      success: true,
      games,
      total: games.length,
      source: 'clickhouse',
      sports_breakdown: {
        nfl: games.filter((g: any) => g.sport === 'nfl').length,
        nba: games.filter((g: any) => g.sport === 'nba').length,
        nhl: games.filter((g: any) => g.sport === 'nhl').length,
        cfb: games.filter((g: any) => g.sport === 'cfb').length,
      },
      updated_at: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('[Live Odds API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      games: [],
      total: 0,
      source: 'error'
    }, { status: 500 })
  }
}
