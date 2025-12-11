# Public Betting Data Backfill Plan

## Overview
Backfill historical NFL games with public betting percentages from SportsDataIO.

## Current Status: PAUSED ⏸️
**Reason:** Production API key doesn't have "Betting Splits" enabled. Using free trial key which has daily rate limits.

**Action Required:** Contact SportsDataIO support to enable "Betting Splits" on production key (`ad4d37f5374f45ffb40e571e38551af1`).

---

## What We Learned (Issues Encountered)

### 1. API Key Setup (RESOLVED ✅)
- **Free Trial Key:** `68b4610b673548e186c0267946db7c27` - Has Betting Splits but daily limits
- **Production Key:** `ad4d37f5374f45ffb40e571e38551af1` - **Betting Splits ENABLED** (SportsDataIO enabled Dec 11, 2025)

### 2. Timezone/Date Mismatch
- **SportsDataIO** returns dates in local time (e.g., `2024-09-12` for Thursday Night Football)
- **Our ClickHouse DB** stores dates in UTC (e.g., `2024-09-13` for same game)
- **Fix Applied:** Changed matching query to use 2-day window instead of exact date match

### 3. ScoreID Range Coverage
- ScoreIDs 17500-19000 only covered partial 2024 data
- 2024 Week 7+ likely needs ScoreIDs 19000+
- Need to scan full range to get complete coverage

### 4. Team Abbreviation Mapping
- Most teams matched correctly
- Some potential mismatches: JAX/JAC, LAR/LA, etc.
- Mapping table exists in backfill script

---

## Current Coverage (COMPLETED - Dec 11, 2025)

| Season | Total Games | With Data | Coverage |
|--------|-------------|-----------|----------|
| 2022   | 283         | 275       | **97.2%** |
| 2023   | 284         | 284       | **100%** ✅ |
| 2024   | 281         | 281       | **100%** ✅ |
| 2025   | 208         | 208       | **100%** ✅ |

**Backfill completed successfully on Dec 11, 2025 using production key `ad4d37f5374f45ffb40e571e38551af1`.**

---

## Backfill Procedure (When Ready)

### Step 1: Verify API Key Access
```bash
# Test production key has Betting Splits enabled
curl "https://api.sportsdata.io/v3/nfl/odds/json/BettingSplitsByScoreId/19200?key=ad4d37f5374f45ffb40e571e38551af1"
```

### Step 2: Update Environment Variable
Add to Vercel:
```
SPORTSDATA_IO_SPLITS_KEY=ad4d37f5374f45ffb40e571e38551af1
```

### Step 3: Run Full Backfill
```bash
# Full backfill - all seasons (might take 30+ minutes)
curl "https://thebettinginsider.com/api/clickhouse/backfill-public-betting?startId=17500&endId=20000&batchSize=100"
```

### Step 4: Verify Coverage
```bash
curl "https://thebettinginsider.com/api/clickhouse/analyze-public-betting"
```

### Step 5: Set Up Ongoing Sync
Add public betting fetch to the existing `sync-upcoming-games` cron.

---

## Database Schema

Columns added to `nfl_games` table:
- `sportsdata_io_score_id` - For mapping to SportsDataIO
- `public_ml_home_bet_pct` - % of bets on home moneyline
- `public_ml_home_money_pct` - % of money on home moneyline
- `public_spread_home_bet_pct` - % of bets on home spread
- `public_spread_home_money_pct` - % of money on home spread
- `public_total_over_bet_pct` - % of bets on the over
- `public_total_over_money_pct` - % of money on the over
- `public_betting_updated_at` - Last update timestamp

---

## API Endpoints Created

1. `/api/clickhouse/add-public-betting-columns` - Add columns to nfl_games
2. `/api/clickhouse/backfill-public-betting` - Run the backfill
3. `/api/clickhouse/analyze-public-betting` - Check coverage stats
4. `/api/clickhouse/debug-team-matching` - Debug team abbreviation issues

---

## Notes

- SportsDataIO has separate ScoreIDs for each game
- ScoreIDs roughly follow: 17500-18300 (2022), 18300-18700 (2023), 18700-19300 (2024), 19300+ (2025)
- Playoffs might use different ScoreID patterns
- Call interval limit: 15 minutes per their docs (but daily quota is the real limit)

