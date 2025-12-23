# CBB Betting Splits Implementation

## Summary
Added support for fetching and storing College Basketball (CBB) betting splits by integrating CBB into the existing sync-live-odds cron job.

## Changes Made

### 1. Updated `app/api/cron/sync-live-odds/route.ts`
- ✅ CBB already exists in `SPORTS_CONFIG` (line 10) with `active: true`
- ✅ Added CBB to the public betting fetch logic (line 300)
- ✅ Added CBB season calculation logic (Nov-Apr = next year's season)
- ✅ CBB uses SportsDataIO `Games/{season}` endpoint like NHL/CFB

### 2. Updated `app/api/public-betting/[sport]/route.ts`
- ✅ Added 'cbb' to the League type
- ✅ Added 'cbb' to sport validation

### 3. Updated `lib/utils/sportSelector.ts`
- ✅ Added 'cbb' to League type
- ✅ Added CBB date range logic (Mon-Sat games, show through next Saturday)
- ✅ Added CBB display name: "College Basketball"

### 4. Public Betting Page
- ✅ Already supports CBB in sport filters (line 832)

## How It Works

1. **Odds API**: Fetches upcoming CBB games with odds
   - Sport key: `basketball_ncaab`
   - Markets: spreads, totals, h2h (moneyline)

2. **SportsDataIO**: Fetches betting splits
   - Endpoint: `https://api.sportsdata.io/v3/cbb/odds/json/BettingSplitsByGameId/{gameId}`
   - Uses `Games/{season}` to get game IDs
   - Season calculation: Nov+ = next year (e.g., Nov 2025 = 2026 season)

3. **Storage**: 
   - Games stored in universal `games` table
   - Betting splits stored in `live_odds_snapshots` table
   - Public betting percentages stored in `games` table

## Next Steps

1. **Run the sync cron job**:
   ```bash
   # The sync-live-odds route will automatically process CBB
   GET /api/cron/sync-live-odds
   ```

2. **Verify CBB games appear**:
   - Check `/public-betting?sport=cbb`
   - Games should show with betting splits if available

3. **Monitor logs**:
   - Check console for `[CBB]` prefixed logs
   - Verify SportsDataIO API calls are successful
   - Check for any team mapping issues

## Required Environment Variables

- `ODDS_API_KEY` - For fetching games and odds
- `SPORTSDATA_IO_SPLITS_KEY` - For fetching betting splits

## Notes

- CBB season runs Nov-Apr, so season year = Nov+ means next calendar year
- CBB uses `BettingSplitsByGameId` (not ScoreID like NFL)
- Team matching uses team abbreviations from the `teams` table
- If teams aren't found in the teams table, games will be skipped

## Testing

To test CBB support:
1. Ensure CBB teams exist in the `teams` table
2. Run the sync-live-odds cron job
3. Check that CBB games appear in the public betting page
4. Verify betting splits are populated (should show percentages instead of 50/50)

