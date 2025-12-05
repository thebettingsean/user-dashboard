# 🏈 Sports Engine - Complete Technical Roadmap

> A comprehensive guide to the betting analytics engine powering The Betting Insider's historical trends, props, and team analysis tools.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Sources](#data-sources)
3. [Database Schema (ClickHouse)](#database-schema-clickhouse)
4. [Data Pipeline & Automation](#data-pipeline--automation)
5. [Query Engine](#query-engine)
6. [Frontend Components](#frontend-components)
7. [API Endpoints](#api-endpoints)
8. [Cron Jobs & Scheduling](#cron-jobs--scheduling)
9. [NBA Implementation Guide](#nba-implementation-guide)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ESPN API              │  The Odds API           │  Internal DB      │
│  - Games/Scores        │  - Historical Odds      │  - Players table  │
│  - Box Scores          │  - Prop Lines           │  - Teams table    │
│  - Team Stats          │  - Closing Lines        │  - Referees       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CLICKHOUSE CLOUD                                │
│                   (props-engine service)                             │
├─────────────────────────────────────────────────────────────────────┤
│  nfl_games          │  nfl_box_scores_v2   │  nfl_prop_lines        │
│  nfl_team_stats     │  nfl_team_rankings   │  current_props         │
│  players            │  teams               │  referees              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       QUERY ENGINE                                   │
│                  (lib/query-engine/*.ts)                             │
├─────────────────────────────────────────────────────────────────────┤
│  trend-query.ts     │  team-query.ts       │  prop-query.ts         │
│  referee-query.ts   │  filter-builder.ts   │  types.ts              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                      │
│                   /sports-engine/*                                   │
├─────────────────────────────────────────────────────────────────────┤
│  /sports-engine          (Trends)                                    │
│  /sports-engine/teams    (Team-specific)                             │
│  /sports-engine/referees (Referee trends)                            │
│  /sports-engine/props    (Player props)                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### 1. ESPN API (Free, Unofficial)

**Base URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl`

| Endpoint | Data | Usage |
|----------|------|-------|
| `/scoreboard` | Current week games, scores, status | Upcoming games, completed games detection |
| `/summary?event={id}` | Full game details, box scores, play-by-play | Player stats, team stats, game metadata |
| `/teams` | Team rosters, info | Player/team data sync |

**Key Data Points from ESPN:**
- Game ID, date, time, venue
- Home/away teams and scores
- Player box scores (passing, rushing, receiving)
- Game status (pre, in, post)
- Season, week information

### 2. The Odds API (Paid)

**Base URL:** `https://api.the-odds-api.com/v4`

| Endpoint | Data | Usage |
|----------|------|-------|
| `/sports/americanfootball_nfl/odds` | Live odds | Pre-game odds capture |
| `/historical/sports/americanfootball_nfl/odds` | Historical odds | Backfill, self-healing |
| `/historical/sports/americanfootball_nfl/events/{id}/odds` | Event-specific historical | Prop lines |

**Key Data Points:**
- Spread (open, close, movement)
- Moneyline (home/away)
- Totals (over/under)
- Prop lines (player props with bookmaker)

**Bookmaker Priority (for deduplication):**
1. FanDuel
2. DraftKings
3. BetMGM
4. Williamhill
5. BetRivers
6. Fanatics
7. Bovada
8. Pointsbetus
9. Barstool
10. Betonlineag
11. Unibet_us

### 3. Internal Tables (Supabase → ClickHouse)

- `players` - Player info, headshots, positions
- `teams` - Team info, logos, divisions, conferences
- `referees` - Referee names and IDs

---

## Database Schema (ClickHouse)

### Core Tables

#### `nfl_games`
Primary table for all game-level data.

```sql
CREATE TABLE nfl_games (
  game_id UInt32,                    -- ESPN game ID (primary key)
  espn_game_id String,
  season UInt16,
  week UInt8,
  game_date Date,
  game_time DateTime,
  
  -- Teams
  home_team_id UInt16,
  away_team_id UInt16,
  
  -- Venue
  venue String,
  city String,
  state String,
  is_neutral_site UInt8,
  is_indoor UInt8,
  
  -- Game Classification
  is_playoff UInt8,
  is_division_game UInt8,
  is_conference_game UInt8,
  status String,                     -- 'pre', 'in', 'post'
  
  -- Scores
  home_score UInt16,
  away_score UInt16,
  total_points UInt16,
  
  -- Odds (Opening)
  spread_open Float32,               -- Home team spread
  total_open Float32,
  home_ml_open Int16,
  away_ml_open Int16,
  
  -- Odds (Closing)
  spread_close Float32,
  total_close Float32,
  home_ml_close Int16,
  away_ml_close Int16,
  
  -- Movement
  spread_movement Float32,           -- close - open
  total_movement Float32,
  home_ml_movement Int16,
  
  -- Derived Fields (Calculated)
  home_won UInt8,                    -- 1 if home won
  home_covered UInt8,                -- 1 if home covered spread
  went_over UInt8,                   -- 1 if total went over
  went_under UInt8,
  spread_push UInt8,
  total_push UInt8,
  
  -- Streaks (Pre-computed for filtering)
  home_streak Int8,                  -- Positive = wins, negative = losses
  away_streak Int8,
  home_prev_margin Int16,            -- Previous game margin
  away_prev_margin Int16,
  
  -- Referee
  referee_id UInt32,
  referee_name String,
  
  -- Provider
  odds_provider_name String,
  
  -- Timestamps
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (game_id)
```

#### `nfl_box_scores_v2`
Player-level statistics per game.

```sql
CREATE TABLE nfl_box_scores_v2 (
  player_id UInt32,
  game_id UInt32,
  game_date Date,
  season UInt16,
  week UInt8,
  team_id UInt16,
  opponent_id UInt16,
  is_home UInt8,
  
  -- Passing
  pass_attempts UInt16,
  pass_completions UInt16,
  pass_yards Int16,
  pass_tds UInt8,
  interceptions UInt8,
  sacks UInt8,
  qb_rating Float32,
  
  -- Rushing
  rush_attempts UInt16,
  rush_yards Int16,
  rush_tds UInt8,
  rush_long UInt16,
  yards_per_carry Float32,
  
  -- Receiving
  targets UInt16,
  receptions UInt16,
  receiving_yards Int16,
  receiving_tds UInt8,
  receiving_long UInt16,
  yards_per_reception Float32,
  
  created_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY (game_id, player_id)
```

#### `nfl_prop_lines`
Historical prop lines from sportsbooks.

```sql
CREATE TABLE nfl_prop_lines (
  game_id String,                    -- Odds API game ID
  espn_game_id UInt32,
  player_name String,
  espn_player_id UInt32,
  prop_type String,                  -- 'player_pass_yds', 'player_rush_yds', etc.
  line Float32,                      -- The prop line
  over_odds Int16,
  under_odds Int16,
  bookmaker String,
  snapshot_time DateTime,
  game_time DateTime,
  season UInt16,
  week UInt8,
  home_team String,
  away_team String
)
ENGINE = ReplacingMergeTree(snapshot_time)
ORDER BY (game_id, player_name, prop_type, line)
```

#### `nfl_team_stats`
Game-level team statistics.

```sql
CREATE TABLE nfl_team_stats (
  game_id UInt32,
  team_id UInt16,
  season UInt16,
  week UInt8,
  is_home UInt8,
  opponent_id UInt16,
  
  -- Offensive Stats
  total_yards Int16,
  pass_yards Int16,
  rush_yards Int16,
  points_scored UInt8,
  first_downs UInt8,
  third_down_conv UInt8,
  third_down_att UInt8,
  turnovers UInt8,
  
  -- Defensive Stats (opponent's offensive output)
  points_allowed UInt8,
  yards_allowed Int16,
  pass_yards_allowed Int16,
  rush_yards_allowed Int16,
  
  created_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY (game_id, team_id)
```

#### `nfl_team_rankings`
Weekly cumulative rankings (1-32) for filtering.

```sql
CREATE TABLE nfl_team_rankings (
  team_id UInt16,
  season UInt16,
  week UInt8,
  
  -- Offensive Rankings (1 = best)
  off_total_yds_rank UInt8,
  off_pass_yds_rank UInt8,
  off_rush_yds_rank UInt8,
  off_points_rank UInt8,
  
  -- Defensive Rankings (1 = best, fewest allowed)
  def_total_yds_rank UInt8,
  def_pass_yds_rank UInt8,
  def_rush_yds_rank UInt8,
  def_points_rank UInt8,
  
  -- Raw Stats (for reference)
  off_total_yds_avg Float32,
  def_total_yds_avg Float32,
  
  created_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY (team_id, season, week)
```

#### `current_props`
Live prop tracking for upcoming games.

```sql
CREATE TABLE current_props (
  game_id String,
  player_name String,
  prop_type String,
  bookmaker String,
  line Float32,
  opening_line Float32,
  line_movement Float32,
  over_odds Int16,
  under_odds Int16,
  game_time DateTime,
  first_seen_at DateTime,
  last_updated_at DateTime
)
ENGINE = ReplacingMergeTree(last_updated_at)
ORDER BY (game_id, player_name, prop_type, bookmaker)
```

---

## Data Pipeline & Automation

### Daily Flow (Game Days)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GAME DAY AUTOMATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

8:00 AM  ──► Sync Upcoming Games (ESPN scoreboard)
              │
              ▼
Every 2hr ──► Capture Pre-game Odds (The Odds API)
              │
              ▼
Hourly    ──► Update Prop Lines (current_props table)
              │
              ▼
Game Start ─► Capture Closing Odds
              │
              ▼
Game End   ─► Process Completed Game:
              ├─► Fetch final scores (ESPN)
              ├─► Fetch box scores (ESPN)
              ├─► Self-heal odds if missing (The Odds API historical)
              ├─► Calculate derived fields
              └─► Archive prop lines to nfl_prop_lines
              │
              ▼
Weekly     ──► Recalculate Rankings & Streaks
```

### Self-Healing System

When a game has scores but missing odds:

```typescript
// 1. Check for games with scores but no odds
const gamesMissingOdds = await clickhouseQuery(`
  SELECT game_id, game_time, home_team_id, away_team_id, home_score, away_score
  FROM nfl_games 
  WHERE home_score > 0 
    AND (spread_close = 0 OR total_close = 0)
    AND season >= 2024
  LIMIT 5
`)

// 2. For each game, fetch historical odds from The Odds API
const snapshotTime = new Date(gameTime.getTime() - 60 * 60 * 1000) // 1hr before
const oddsUrl = `https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds?` +
  `apiKey=${ODDS_API_KEY}&date=${dateParam}&regions=us&markets=spreads,totals`

// 3. Match game by home_team + away_team + time proximity
const matchingGame = oddsData.data?.find((event) => {
  return event.home_team === homeTeam && 
         event.away_team === awayTeam && 
         timeDiff < 4 * 60 * 60 * 1000
})

// 4. Update game with odds and recalculate derived fields
```

### Box Score Deduplication

ESPN returns players in multiple stat categories (passing, rushing, receiving). We deduplicate:

```typescript
// Collect all stats by player first
const playerStatsMap = new Map<number, { 
  teamId: number, 
  opponentId: number, 
  isHome: number, 
  stats: Record<string, number> 
}>()

for (const category of teamPlayers.statistics) {
  for (const athlete of category.athletes) {
    const playerId = parseInt(athlete.athlete?.id)
    const newStats = parseAthleteStats(athlete.stats, category.name)
    
    if (playerStatsMap.has(playerId)) {
      // Merge stats
      const existing = playerStatsMap.get(playerId)!
      Object.assign(existing.stats, newStats)
    } else {
      playerStatsMap.set(playerId, { teamId, opponentId, isHome, stats: newStats })
    }
  }
}

// Then insert once per player
for (const [playerId, data] of playerStatsMap) {
  await clickhouseCommand(`INSERT INTO nfl_box_scores_v2 ...`)
}
```

---

## Query Engine

### File Structure

```
lib/query-engine/
├── types.ts           # TypeScript interfaces
├── filter-builder.ts  # SQL WHERE clause builder
├── trend-query.ts     # League-wide trends (favorites, underdogs, overs)
├── team-query.ts      # Team-specific queries
├── referee-query.ts   # Referee trend queries
└── prop-query.ts      # Player prop queries
```

### Filter Types

```typescript
interface QueryFilters {
  // Time Period
  time_period: 'L3' | 'L5' | 'L10' | 'L15' | 'L20' | 'L30' | 
               'season' | 'last_season' | 'L2years' | 'L3years' | 
               'since_2022' | 'since_2023'
  
  // Matchup Filters
  location?: 'any' | 'home' | 'away' | 'neutral'
  division?: 'any' | 'division' | 'non_division'
  conference?: 'any' | 'conference' | 'non_conference'
  playoff?: 'any' | 'regular' | 'playoff'
  
  // Betting Filters
  favorite?: 'any' | 'favorite' | 'underdog'
  home_fav_dog?: 'any' | 'home_fav' | 'home_dog'
  spread_min?: number
  spread_max?: number
  total_min?: number
  total_max?: number
  ml_min?: number
  ml_max?: number
  
  // Line Movement
  spread_move_min?: number
  spread_move_max?: number
  total_move_min?: number
  total_move_max?: number
  ml_move_min?: number
  ml_move_max?: number
  
  // Team Stats (Opponent Rankings)
  defense_rank?: 'any' | 'top_5' | 'top_10' | 'top_15' | 'bottom_5' | 'bottom_10' | 'bottom_15'
  defense_stat?: 'overall' | 'pass' | 'rush' | 'points'
  offense_rank?: 'any' | 'top_5' | 'top_10' | 'top_15' | 'bottom_5' | 'bottom_10' | 'bottom_15'
  offense_stat?: 'overall' | 'pass' | 'rush' | 'points'
  
  // Subject Team's Own Rankings
  own_defense_rank?: 'any' | 'top_5' | 'top_10' | 'top_15' | 'bottom_5' | 'bottom_10' | 'bottom_15'
  own_defense_stat?: 'overall' | 'pass' | 'rush' | 'points'
  own_offense_rank?: 'any' | 'top_5' | 'top_10' | 'top_15' | 'bottom_5' | 'bottom_10' | 'bottom_15'
  own_offense_stat?: 'overall' | 'pass' | 'rush' | 'points'
  
  // Momentum
  streak?: number              // Positive = wins, negative = losses
  prev_game_margin_min?: number
  prev_game_margin_max?: number
  
  // Props Only
  opponent_id?: number         // Specific opponent for player props
}
```

### Query Types

#### 1. Trend Query
League-wide betting trends.

```typescript
// Example: Favorites covering at home
{
  type: 'trend',
  bet_type: 'spread',
  side: 'favorite',
  filters: {
    time_period: 'since_2022',
    location: 'home',
    spread_min: -10,
    spread_max: -3
  }
}
```

#### 2. Team Query
Team-specific performance.

```typescript
// Example: Lions at home vs bottom 15 defenses
{
  type: 'team',
  team_id: 8,  // Detroit Lions
  bet_type: 'spread',
  side: 'team',
  filters: {
    time_period: 'L20',
    location: 'home',
    defense_rank: 'bottom_15'
  }
}
```

#### 3. Referee Query
Referee-influenced trends.

```typescript
// Example: Overs with specific referee
{
  type: 'referee',
  referee_id: 17641,
  bet_type: 'total',
  side: 'over',
  filters: {
    time_period: 'since_2022'
  }
}
```

#### 4. Prop Query
Player prop analysis.

```typescript
// Example: Jahmyr Gibbs rush yards with book lines
{
  type: 'prop',
  player_id: 4429795,
  stat: 'rush_yards',
  use_book_lines: true,
  prop_line_min: 70,
  prop_line_max: 100,
  filters: {
    time_period: 'since_2023',
    total_min: 45
  }
}
```

### Prop Stats Available

```typescript
const PROP_STATS_BY_POSITION = {
  QB: [
    'pass_yards', 'pass_tds', 'pass_attempts', 'pass_completions', 
    'interceptions', 'rush_yards', 'rush_tds', 'rush_long'
  ],
  RB: [
    'rush_yards', 'rush_tds', 'rush_attempts', 'rush_long',
    'receiving_yards', 'receiving_tds', 'receptions', 'receiving_long'
  ],
  WR: [
    'receiving_yards', 'receiving_tds', 'receptions', 'targets', 'receiving_long'
  ],
  TE: [
    'receiving_yards', 'receiving_tds', 'receptions', 'targets', 'receiving_long'
  ]
}
```

---

## Frontend Components

### URL Structure

| Route | Query Type | Description |
|-------|------------|-------------|
| `/sports-engine` | trend | League-wide trends |
| `/sports-engine/teams` | team | Team-specific analysis |
| `/sports-engine/referees` | referee | Referee trends |
| `/sports-engine/props` | prop | Player prop analysis |

### State Management

Key state variables in `page.tsx`:

```typescript
// Query Configuration
const [queryType, setQueryType] = useState<QueryType>('trend')
const [betType, setBetType] = useState<BetType>('spread')
const [side, setSide] = useState<Side>('favorite')
const [timePeriod, setTimePeriod] = useState<TimePeriod>('since_2022')

// Filter States
const [location, setLocation] = useState('any')
const [favorite, setFavorite] = useState('any')
const [defenseRank, setDefenseRank] = useState('any')
// ... 40+ filter states

// Results
const [result, setResult] = useState<QueryResult | null>(null)
const [expandedGameId, setExpandedGameId] = useState<string | null>(null)

// UI State
const [expandedSections, setExpandedSections] = useState({
  matchup: false,
  betting: false,
  teamStats: false
})
```

### Component Hierarchy

```
SportsEnginePage
├── Header (title, beta tag, tagline)
├── QueryTypeSelector (Trends/Teams/Refs/Props buttons)
├── FilterPanel
│   ├── BetTypeSelector
│   ├── TimePeriodDropdown
│   ├── MatchupFilters (collapsible)
│   ├── BettingFilters (collapsible)
│   └── TeamStatsFilters (collapsible)
├── TeamSelector (for team queries)
├── RefereeSelector (for referee queries)
├── PlayerSelector (for prop queries)
├── RunQueryButton
├── ResultsPanel
│   ├── RecordDisplay (11-9, 55%)
│   ├── StatsDisplay (Avg, Streak, etc.)
│   ├── FiltersApplied
│   └── GamesList
│       ├── GameRow (clickable)
│       └── ExpandedGameDetails
└── LoadMoreButton
```

---

## API Endpoints

### Query Engine

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/query-engine` | POST | Execute any query type |

**Request Body:**
```json
{
  "type": "trend|team|referee|prop",
  "team_id": 8,
  "referee_id": 17641,
  "player_id": 4429795,
  "stat": "rush_yards",
  "bet_type": "spread|total|moneyline",
  "side": "favorite|underdog|home|away|over|under",
  "use_book_lines": true,
  "prop_line_min": 70,
  "prop_line_max": 100,
  "filters": { /* QueryFilters */ }
}
```

### Data Sync

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cron/nfl-sync?task=games` | GET | Sync upcoming games |
| `/api/cron/nfl-sync?task=completed` | GET | Process completed games |
| `/api/cron/nfl-sync?task=odds` | GET | Capture pre-game odds |
| `/api/cron/nfl-sync?task=all` | GET | Run all sync tasks |
| `/api/cron/nfl-props-lifecycle?stage=auto` | GET | Update prop lines |

### Utilities

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clickhouse/fix-boxscores?game_id=X` | POST | Fix bad box scores |
| `/api/clickhouse/fix-game?game_id=X&spread=X&total=X` | POST | Fix game odds |
| `/api/clickhouse/check-games` | GET | View recent games |
| `/api/clickhouse/populate-streaks` | POST | Recalculate streaks |
| `/api/clickhouse/calculate-nfl-rankings` | POST | Recalculate rankings |

---

## Cron Jobs & Scheduling

### Vercel Cron Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/nfl-sync?task=games",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/nfl-sync?task=completed",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/nfl-sync?task=odds",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/cron/nfl-props-lifecycle?stage=auto",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/clickhouse/populate-streaks",
      "schedule": "0 6 * * 2"
    },
    {
      "path": "/api/clickhouse/calculate-nfl-rankings",
      "schedule": "0 8 * * 2"
    }
  ]
}
```

### Schedule Summary

| Task | Frequency | Time | Purpose |
|------|-----------|------|---------|
| Sync Games | Daily | 8 AM | Fetch upcoming games from ESPN |
| Process Completed | Hourly | :00 | Scores, box scores, self-healing odds |
| Capture Odds | Every 2hr | :00 | Pre-game odds from The Odds API |
| Props Lifecycle | Hourly | :00 | Track prop line movement |
| Populate Streaks | Weekly | Tue 6 AM | Update streak columns |
| Calculate Rankings | Weekly | Tue 8 AM | Recalculate team rankings |

---

## NBA Implementation Guide

### Step 1: Create Tables

```sql
-- Copy NFL schema, change prefix
CREATE TABLE nba_games ( /* same structure as nfl_games */ )
CREATE TABLE nba_box_scores ( /* adjusted for basketball stats */ )
CREATE TABLE nba_team_stats ( /* adjusted for basketball stats */ )
CREATE TABLE nba_team_rankings ( /* same structure */ )
CREATE TABLE nba_prop_lines ( /* same structure */ )
```

### Step 2: Adjust Box Score Stats

**NBA-specific stats:**
```typescript
// Replace NFL stats with:
points, assists, rebounds, steals, blocks,
turnovers, field_goals_made, field_goals_attempted,
three_pointers_made, three_pointers_attempted,
free_throws_made, free_throws_attempted,
minutes_played, plus_minus
```

### Step 3: Update ESPN Integration

```typescript
// Change base URL
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'

// Update stat parsing for basketball categories
function parseAthleteStats(statsArray: string[], category: string) {
  // Basketball-specific parsing
}
```

### Step 4: Update The Odds API

```typescript
// Change sport
const ODDS_API_SPORT = 'basketball_nba'

// NBA prop markets
const NBA_PROP_MARKETS = [
  'player_points', 'player_rebounds', 'player_assists',
  'player_threes', 'player_steals', 'player_blocks',
  'player_points_rebounds_assists', 'player_points_rebounds',
  'player_points_assists', 'player_rebounds_assists'
]
```

### Step 5: Create Query Engine Files

```
lib/query-engine/
├── nba/
│   ├── trend-query.ts
│   ├── team-query.ts
│   ├── prop-query.ts
│   └── filter-builder.ts
```

### Step 6: Update Frontend

- Add NBA to sport dropdown
- Update team logos mapping
- Update prop stats by position
- Add NBA-specific filters

### Step 7: Create Cron Jobs

```json
{
  "crons": [
    { "path": "/api/cron/nba-sync?task=games", "schedule": "0 8 * * *" },
    { "path": "/api/cron/nba-sync?task=completed", "schedule": "0 * * * *" },
    { "path": "/api/cron/nba-sync?task=odds", "schedule": "0 */2 * * *" }
  ]
}
```

---

## Troubleshooting

### Common Issues

#### 1. "TEA" or Unknown Team Abbreviations
**Cause:** Box scores have `opponent_id = 0`
**Fix:** Run `/api/clickhouse/fix-boxscores?game_id=X`

#### 2. Duplicate Player Entries
**Cause:** Player appears in multiple stat categories
**Fix:** Deduplication logic in sync ensures one entry per player

#### 3. Missing Odds After Game Completion
**Cause:** Odds weren't captured before game started
**Fix:** Self-healing system fetches from The Odds API historical endpoint

#### 4. Invalid Dates
**Cause:** Date format mismatch between ClickHouse and frontend
**Fix:** Use `toString(game_date)` in SQL queries

#### 5. Slow Queries
**Cause:** Missing indexes or too many joins
**Fix:** Ensure `ORDER BY` keys match common query patterns

### Debug Endpoints

```bash
# Check for duplicate box scores
curl http://localhost:3003/api/clickhouse/fix-boxscores

# View recent games
curl http://localhost:3003/api/clickhouse/check-games

# Check game-specific box scores
curl "http://localhost:3003/api/clickhouse/fix-boxscores?game_id=401772947"

# Manually fix game odds
curl -X POST "http://localhost:3003/api/clickhouse/fix-game?game_id=401772947&spread=-3.5&total=55.5"
```

### Environment Variables

```bash
# ClickHouse
CLICKHOUSE_HOST=https://queries.clickhouse.cloud/service/xxx/run
CLICKHOUSE_KEY_ID=xxx
CLICKHOUSE_KEY_SECRET=xxx

# The Odds API
ODDS_API_KEY=xxx

# ESPN (no key needed - public API)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial NFL implementation |
| 1.1 | Dec 2024 | Added self-healing odds via The Odds API |
| 1.2 | Dec 2024 | Fixed box score deduplication |
| 2.0 | TBD | NBA implementation |

---

*Last Updated: December 5, 2024*

