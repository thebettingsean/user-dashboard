# Signal Analysis - Missing Indicators

## Examples from User:

### 1. Ravens Spread -3 → -3.5 (43% bets, 39% money)
**Should be: Vegas Backed**

- Line moved: -3 to -3.5 (0.5 points toward Baltimore)
- Public: 43% bets, 39% money on Baltimore (HOME)
- Average: (43 + 39) / 2 = 41% ✅ PASSES (< 50%)
- Movement: Favorable toward Baltimore ✅
- **SHOULD TRIGGER Vegas Backed on Baltimore!**

### 2. Jets +12.5 → +8 (16% bets, 35% of dollars)
**Should be: Vegas Backed + possibly Whale Respect**

- Line moved: +12.5 to +8 (4.5 points toward Jets)
- Public: 16% bets, 35% money on Jets (AWAY)
- Average: (16 + 35) / 2 = 25.5% ✅✅ WAY BELOW 50%
- Gap: 35% - 16% = 19% (close to 20% threshold for Whale)
- Movement: MASSIVE 4.5 points toward minority side
- **SHOULD TRIGGER Vegas Backed on Jets!**
- **MIGHT trigger Whale Respect (19% gap, close to 20% threshold)**

### 3. Multiple Unders with no signals
- Need specific data to analyze

## Current Thresholds (from constants.ts):

### Public Respect:
- minBetPct: 55%
- minMoneyPct: 55%
- Need favorable movement

### Vegas Backed:
- maxAvgPct: 50% (average of bets + money must be < 50%)
- Need favorable movement

### Whale Respect:
- Scenario 1: Bets ≤ 50%, Money ≥ 50%, Gap ≥ 20%
- Scenario 2: Bets 50-65%, Money ≥ 50%, Gap ≥ 30%
- Need favorable movement

## Potential Issues:

1. **Opening line data** - Are we getting accurate opening lines from `game_first_seen`?
2. **Movement detection** - Is `isMovementFavorable()` correctly identifying RLM?
3. **Odds/Juice tracking** - Are we tracking juice changes properly?
4. **Threshold for minimum movement** - Line 154: `const lineMoved = Math.abs(currentLine - openLine) >= 0.5`

## Next Steps:
1. Check actual database values for these games
2. Verify opening lines are being captured correctly
3. Add debug logging for signal calculations
4. Test with real game data

