# NBA Props Backfill - Issue Summary

## Goal
Backfill historical NBA player prop lines for Season 2026 (and previous seasons) from The Odds API, matching them to ESPN game IDs in our ClickHouse database.

## Initial Problem
- Started with only 45/459 games having props (9.8% coverage)
- Progress was stalled - props weren't being matched correctly to ESPN games
- The API endpoint was reporting incorrect metrics (counting Odds API event IDs instead of actual ESPN games with props)

## Root Causes Found

1. **Unmatched Props**: Many prop lines were being inserted but had `espn_game_id = 0`, meaning they existed in the database but weren't linked to ESPN games
   - Found 659 unmatched Odds API events across all seasons
   - These props existed but couldn't be counted as "games with props" because they weren't matched

2. **Matching Logic Issues**: 
   - Team name normalization wasn't consistent between Odds API and ESPN
   - Time window for matching was too narrow (some games cross timezones/midnight)
   - Matching was done in wrong direction (checking Odds events first instead of ESPN games first)

3. **Incorrect Progress Reporting**: The API was counting `game_id` (Odds API event IDs) instead of `espn_game_id` (ESPN games), giving misleading progress numbers

## Solutions Implemented

1. **Fixed Matching Logic**:
   - Created canonical team mapping (30 NBA teams with aliases)
   - Normalized team names from both sources
   - Expanded time matching window to ±36 hours
   - Changed to iterate ESPN games first, then find matching Odds events
   - Added date range fetching (±1 day) to handle timezone edge cases

2. **Retroactive Matching**:
   - Created script to match all existing unmatched props (659 events)
   - Successfully matched 579 out of 659 (87.8% match rate)
   - Updated `espn_game_id` for all matched props

3. **Fixed Progress Metrics**:
   - Updated API endpoint to count `countDistinct(espn_game_id)` instead of `countDistinct(game_id)`
   - Now accurately reports actual NBA games with props, not raw Odds API events

4. **Standalone Worker Script**:
   - Created persistent worker script (`scripts/backfill-nba-props-worker.ts`) with checkpointing
   - Processes dates systematically and can resume from where it left off
   - Uses `isDateProcessed` logic similar to NFL implementation

## Current Status (Season 2026)

- **Total completed games**: 532
- **Games with props**: 353
- **Games missing props**: 179
- **Coverage**: 66.4%
- **Total prop lines**: 132,025
- **Unmatched events**: 0 (all matched events are now linked)

## Remaining Gap Analysis

The 179 missing games (33.6%) are likely **expected gaps**:
- Early season games (October) have very limited prop data availability from Odds API
- Some games genuinely don't have player prop markets available
- Sample investigation of 10 missing games showed: 6 had Odds API events but no player prop markets, 4 had no Odds API events at all

## Key Files Modified

- `app/api/clickhouse/backfill-nba-prop-lines/route.ts` - Fixed GET endpoint metrics
- `scripts/backfill-nba-props-worker.ts` - Standalone worker with improved matching
- `scripts/match-unmatched-props.ts` - Retroactive matching script (matched 579 events)
- `scripts/investigate-missing-props.ts` - Diagnostic script for coverage gaps

## Next Steps (Optional)

- The current 66.4% coverage appears to be the practical maximum given Odds API data availability
- Could investigate remaining 179 games individually, but they're likely true data gaps
- Future props ingestion (forward-looking) now correctly populates `espn_game_id` during insertion

