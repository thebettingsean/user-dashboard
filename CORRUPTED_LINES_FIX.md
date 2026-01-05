# 🚨 CRITICAL DATA CORRUPTION ISSUE - FIXED

## THE PROBLEM

The `sync-live-odds` cron was updating `spread_close`, `total_close`, and `ml_close` for games **AFTER they started**, recording live in-game lines instead of true pre-game closing lines.

### Examples of Corrupted Data:
- **Cowboys**: -5.5 → +16.5 **(22 point "movement")** ❌ - Recorded during game when losing
- **Titans**: +10.5 → +33.5 **(23 point "movement")** ❌ - Recorded during game
- **Browns**: +7 → -1.5 **(8.5 point "movement")** ❌ - Recorded during game
- **Giants**: +5.5 → -16.5 **(22 point "movement")** ❌ - Recorded during game

### Impact:
- ✅ **Opening lines**: Correct (from `game_first_seen`)
- ❌ **Closing lines**: Corrupted (recorded during/after game)
- ❌ **Movement**: Fake/irrelevant (opening → mid-game instead of opening → close)
- ❌ **Signals**: Completely broken (based on fake movement)
- ❌ **All Sports**: NFL, NBA, NHL, CFB, CBB all affected

---

## THE ROOT CAUSE

In `/app/api/cron/sync-live-odds/route.ts`:

```typescript
for (const game of oddsGames) {
  // ❌ NO CHECK if game has started
  // ❌ ALWAYS updates spread_close with current consensus
  // ❌ Even if game is LIVE or COMPLETED
  
  await clickhouseCommand(`
    INSERT INTO games (..., spread_close, total_close, ...)
    VALUES (..., ${consensus.spread}, ${consensus.total}, ...)
    // ☝️ This is the LIVE in-game line!
  `)
}
```

The cron runs every 30 minutes and processes **ALL** games from Odds API, regardless of whether they've started.

---

## THE FIX

### 1. ✅ **PREVENTION (Applied)**

Added a check at the start of the game processing loop:

```typescript
for (const game of oddsGames) {
  // ====================================================================
  // CRITICAL: Skip games that have already started
  // We should ONLY update lines for games that haven't kicked off yet
  // Once a game starts, we want to preserve the final pre-game lines
  // ====================================================================
  const gameTime = new Date(game.commence_time)
  const now = new Date()
  
  if (gameTime < now) {
    // Game has already started - skip it entirely
    // Don't update lines, signals, or anything else
    continue
  }
  
  // ... rest of processing
}
```

**Result**: No more corrupted data going forward ✅

---

### 2. 🔧 **CLEANUP (Action Required)**

Created `/api/admin/fix-corrupted-lines` to clean historical data.

#### How It Works:
1. Finds all completed games (`game_time < now - 30 min`)
2. For each game, queries `live_odds_snapshots` for the **LAST snapshot BEFORE kickoff**
3. Uses that snapshot's lines as the true "closing" lines
4. Recalculates all signals based on: `opening → true close`
5. Updates `games` table with corrected data

#### Safety Features:
- ✅ Defaults to **DRY RUN** mode
- ✅ Shows examples of what will be fixed
- ✅ Limits number of games (default 100)
- ✅ Can filter by sport

---

## WHAT YOU NEED TO DO

### Step 1: Test the Cleanup (Dry Run)

Run the cleanup script in **dry-run mode** for each sport to see what will be fixed:

```bash
# NFL
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=nfl&limit=10&dryRun=true

# NBA
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=nba&limit=10&dryRun=true

# NHL
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=nhl&limit=10&dryRun=true

# CFB
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=cfb&limit=10&dryRun=true

# CBB
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=cbb&limit=10&dryRun=true
```

**Check the `examples` array in the response** to verify the logic is working correctly.

### Step 2: Run the Actual Cleanup

Once you've verified the dry-run results, run the cleanup for real:

```bash
# NFL (100 games at a time)
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=nfl&limit=100&dryRun=false

# Repeat for other sports
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=nba&limit=100&dryRun=false
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=nhl&limit=100&dryRun=false
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=cfb&limit=100&dryRun=false
https://thebettinginsider.com/api/admin/fix-corrupted-lines?sport=cbb&limit=100&dryRun=false
```

You may need to run each sport **multiple times** (in batches of 100) until `gamesFixed: 0`.

### Step 3: Verify Signals

After cleanup, visit `/public-betting` and check:
- ✅ Ravens game should now show **Vegas Backed** (if it was -3 → -3.5 with 43% public)
- ✅ Jets game should now show **Vegas Backed** (if it was +12.5 → +8 with 16% public)
- ✅ No more crazy 20+ point "movements"
- ✅ Signals make sense based on actual pre-game line movement

---

## WHAT TO EXPECT

### Before Cleanup:
```json
{
  "game": "Cowboys @ Giants",
  "spread": "-5.5 → +16.5 (22.0 move)", // ❌ LIVE GAME LINE
  "signal": "None" // ❌ Wrong
}
```

### After Cleanup:
```json
{
  "game": "Cowboys @ Giants",
  "spread": "-5.5 → -6.0 (0.5 move)", // ✅ TRUE CLOSING LINE
  "signal": "Public Respect" // ✅ Correct
}
```

---

## MONITORING

After cleanup, monitor the next cron run (every 30 minutes) to ensure:
1. Only **upcoming** games are processed
2. Games that have started are **skipped**
3. No more corrupted data is being written

Check cron logs for messages like:
```
[nfl] Processing 16 games
[nfl] Skipping Packers @ Vikings - game has already started
```

---

## SUMMARY

| Status | Item | Details |
|--------|------|---------|
| ✅ | **Prevention** | Cron now skips games after kickoff |
| ⏳ | **Cleanup** | Admin endpoint created, needs to be run |
| ⏳ | **Verification** | Check signals after cleanup |
| ❌ | **Historical Data** | Currently corrupted, awaiting cleanup |

**Next Action**: Run the cleanup script as outlined in "WHAT YOU NEED TO DO" above.

