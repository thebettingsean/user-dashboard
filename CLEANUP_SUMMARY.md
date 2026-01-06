# ClickHouse Cleanup Summary
**Date:** January 6, 2026
**Action:** Deleted 4 unused tables

---

## ✅ Tables Successfully Deleted

### 1. nfl_player_aggregates
- **Rows:** 0 (empty)
- **Reason:** Never populated, not referenced anywhere in code

### 2. nba_player_aggregates  
- **Rows:** 0 (empty)
- **Reason:** Never populated, not referenced anywhere in code

### 3. props_with_stats
- **Rows:** 0 (empty)
- **Reason:** Purpose unclear, not referenced anywhere in code

### 4. nba_prop_lines_backup
- **Rows:** 1,395,358 (!!) 
- **Reason:** "Backup" table that was 5x larger than main table, not used anywhere
- **Impact:** **Huge space savings** - freed ~1.4 million rows

---

## 📊 Database Stats

### Before Cleanup
- **Total Tables:** 29
- **Tables with Data:** 25
- **Empty Tables:** 3
- **Wasted Rows:** 1,395,358 (backup table)

### After Cleanup
- **Total Tables:** 25 (-4)
- **Tables with Data:** 24
- **Empty Tables:** 0 (-3)
- **Space Freed:** 1,395,358 rows 🎉

---

## 🔍 Key Discoveries About Table Usage

### Snapshots Are for UPCOMING, Not Builder
- **`nfl_prop_line_snapshots`** (883K rows) - Used for displaying UPCOMING props
- **`nfl_line_snapshots`** (78K rows) - Used for UPCOMING game line tracking
- **Builder uses:** `nfl_prop_lines` and `nfl_games` for historical queries

### Views vs Tables
- **`nfl_opening_lines`** - VIEW (not a real table)
- **`nfl_current_lines`** - VIEW (not a real table)
- Views don't take up space, they're just saved queries

### Team Stats vs Rankings
- **`*_team_stats`** tables kept (may be used elsewhere or as source data)
- **`*_team_rankings`** tables are what the builder uses
- Both serve different purposes, so we keep both

---

## 🎯 Builder Table Map (Verified Working)

### NFL Prop Queries
```
nfl_box_scores_v2 (player stats)
  ↓ JOIN
nfl_games (game context, spreads, scores)
  ↓ JOIN (optional)
nfl_prop_lines (book lines & odds for "line between X-Y")
  ↓ JOIN
nfl_team_rankings (defense/offense rankings)
  ↓ JOIN
teams (logos, colors, names)
  ↓ JOIN
players (positions, info)
```

### NBA Prop Queries
```
nba_box_scores_v2 (player stats)
  ↓ JOIN
nba_games (game context)
  ↓ JOIN (optional)
nba_prop_lines (book lines & odds)
  ↓ JOIN
nba_team_rankings (overall team stats)
  ↓ JOIN (conditional)
nba_position_defensive_rankings (defense vs G/F/C)
  ↓ JOIN
teams (logos, colors, names)
  ↓ JOIN
players (positions, info)
```

---

## ✅ Confirmed Working

All builder queries are working perfectly after the comprehensive fixes:
1. ✅ Sport-specific column selection in subqueries
2. ✅ Sport-specific GROUP BY clauses  
3. ✅ Proper table JOINs for NFL and NBA
4. ✅ Conditional position rankings for NBA
5. ✅ Book line integration (nfl_prop_lines, nba_prop_lines)

---

## 📝 Notes for Future

### Not Needed Yet
- NHL tables (sport not active in builder)
- CFB tables (sport not active in builder)
- CBB tables (sport not active in builder)

### Keep Monitoring
- `nfl_prop_line_snapshots` - 883K rows (may want to archive old data)
- Potential to consolidate some stats/rankings tables in future

---

**Status:** Database is now lean, clean, and fully optimized for the builder! 🚀

