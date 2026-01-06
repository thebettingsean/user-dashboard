# Email to SportsDataIO Support

---

**Subject:** NBA/NHL Betting Splits Returning Null Values - API Key Access Issue?

---

**Body:**

Hello SportsDataIO Support Team,

I'm experiencing an issue with the Betting Splits endpoints for NBA and NHL, where all percentage values are returning as `null` despite the API responding successfully. CBB betting splits work perfectly with the same API key.

## Issue Details

**API Key Used:** `ad4d37f5374f45ffb40e571e38551af1`

**Problem:**
- NBA and NHL betting splits endpoints return successful responses with market structures
- However, all `BetPercentage` and `MoneyPercentage` fields are `null`
- CBB betting splits work correctly with real percentage values

## Test Results

### NFL - WORKING CORRECTLY ✓
**Endpoint:** `GET /v3/nfl/odds/json/BettingSplitsByScoreId/{scoreId}`

**Response:** Multiple playoff games with real data
```json
{
  "ScoreID": 18146,
  "BettingMarketSplits": [
    {
      "BettingBetType": "Point Spread",
      "BettingSplits": [
        {
          "BettingOutcomeType": "Home",
          "BetPercentage": 53,
          "MoneyPercentage": 56
        }
      ]
    }
  ]
}
```
Real percentage values - working perfectly. Tested with 6 current playoff games, all returning valid splits.

### NBA - NOT WORKING
**Endpoint:** `GET /v3/nba/odds/json/BettingSplitsByGameId/22975`

**Response:** Game CLE @ IND (today's game)
```json
{
  "GameID": 22975,
  "BettingMarketSplits": []
}
```
Empty array - no market data at all.

**Another NBA Game (22433 - future game):**
```json
{
  "BettingMarketSplits": [
    {
      "BettingBetType": "Moneyline",
      "BettingSplits": [
        {
          "BettingOutcomeType": "Home",
          "BetPercentage": null,
          "MoneyPercentage": null
        }
      ]
    }
  ]
}
```
Has market structures but all percentages are `null`.

### NHL - NOT WORKING
**Endpoint:** `GET /v3/nhl/odds/json/BettingSplitsByGameId/24640`

**Response:** Game COL @ TB (today's game)
```json
{
  "GameID": 24640,
  "BettingMarketSplits": [
    {
      "BettingBetType": "Puck Line",
      "BettingSplits": [
        {
          "BettingOutcomeType": "Home",
          "BetPercentage": null,
          "MoneyPercentage": null
        }
      ]
    }
  ]
}
```
Has 3 market structures (Puck Line, Total Goals, Moneyline) but all percentages are `null`.

### CBB - WORKING CORRECTLY ✓
**Endpoint:** `GET /v3/cbb/odds/json/BettingSplitsByGameId/68635`

**Response:** Game UMASS @ OHIO
```json
{
  "GameID": 68635,
  "BettingMarketSplits": [
    {
      "BettingBetType": "Point Spread",
      "BettingSplits": [
        {
          "BettingOutcomeType": "Away",
          "BetPercentage": 16,
          "MoneyPercentage": 27
        },
        {
          "BettingOutcomeType": "Home",
          "BetPercentage": 84,
          "MoneyPercentage": 73
        }
      ]
    }
  ]
}
```
Has real percentage values - working perfectly.

## Questions

1. **Does my API key have access to NBA/NHL betting splits data?**
   - The fact that CBB works but NBA/NHL return null values suggests a subscription/permission issue
   
2. **Is there a different endpoint or parameter required for NBA/NHL?**
   - I'm using the same `BettingSplitsByGameId` endpoint structure across all sports
   
3. **Do NBA/NHL betting splits require a different subscription tier?**
   - I need betting splits for NBA, NHL, NFL, CFB, and CBB
   
4. **If this is an access issue, how can I upgrade to include NBA/NHL betting splits?**

## Additional Context

- **This issue appeared recently** - NBA/NHL/CFB splits were all working perfectly until ~2 days ago (around Jan 4, 2026)
- All other endpoints (Games, Scores, etc.) work fine for all sports
- Only the betting splits percentages are affected for NBA/NHL
- **NFL and CBB work perfectly**, which is confusing:
  - NFL uses `BettingSplitsByScoreId` ✅ 
  - CBB uses `BettingSplitsByGameId` ✅
  - NBA uses `BettingSplitsByGameId` ❌ (null values)
  - NHL uses `BettingSplitsByGameId` ❌ (null values)
- This suggests a sport-specific permissions issue rather than an endpoint issue

## What I Need

Access to betting splits data (BetPercentage and MoneyPercentage) for:
- ✅ **NFL** - Currently working perfectly with `BettingSplitsByScoreId` endpoint
  - All 6 playoff games have real percentage values
  - Tested today (Jan 6, 2026) with games 3+ days out
- ✅ **CBB** - Currently working perfectly with `BettingSplitsByGameId` endpoint
  - Tested with game 68635 (UMASS @ OHIO)
  - Real percentages: 16% / 84% bet split, 27% / 73% money split
- ❌ **NBA** - NOT working with `BettingSplitsByGameId` endpoint
  - Today's games return empty `BettingMarketSplits` arrays
  - Future games return market structures but all percentages are `null`
- ❌ **NHL** - NOT working with `BettingSplitsByGameId` endpoint
  - Returns market structures but all percentages are `null`
  - Tested with today's game (COL @ TB, game 24640)
- ❓ **CFB** - Season over, will need for 2026 season

Please let me know if my current subscription includes NBA/NHL betting splits, or if I need to upgrade my plan to access this data.

Thank you for your help!

---

**Include:**
- Your account email
- Any subscription/plan details you have
- When the issue started (if you know the exact date)

