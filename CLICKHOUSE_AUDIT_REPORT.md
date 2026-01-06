# ClickHouse Database Audit Report
**Date:** January 6, 2026
**Total Tables:** 29
**Tables with Data:** 25
**Empty Tables:** 3

---

## Executive Summary

### ✅ Tables Actively Used by Builder
These tables are core to the builder functionality and are working correctly:

1. **nfl_box_scores_v2** (19,551 rows) - Player game stats
2. **nfl_games** (1,194 rows) - Game information, spreads, scores
3. **nfl_prop_lines** (60,914 rows) - Current prop lines with odds
4. **nfl_team_rankings** (1,984 rows) - Weekly team rankings
5. **nba_box_scores_v2** (97,058 rows) - Player game stats
6. **nba_games** (4,690 rows) - Game information
7. **nba_prop_lines** (283,503 rows) - Current prop lines with odds
8. **nba_team_rankings** (3,491 rows) - Team rankings/stats
9. **nba_position_defensive_rankings** (21,756 rows) - Defense vs specific positions (G/F/C)
10. **teams** (1,214 rows) - Universal teams table
11. **players** (1,291 rows) - Universal players table

---

## ⚠️ Tables NOT Used by Builder (Candidates for Review)

### Empty Tables - Can be Dropped
1. **nfl_player_aggregates** (0 rows, 35 cols)
   - Purpose: Likely pre-aggregated player stats
   - Status: Never populated, not referenced in code
   - **Recommendation:** DELETE

2. **nba_player_aggregates** (0 rows, 28 cols)
   - Purpose: Likely pre-aggregated player stats
   - Status: Never populated, not referenced in code
   - **Recommendation:** DELETE

3. **props_with_stats** (0 rows, 12 cols)
   - Purpose: Unknown
   - Status: Empty, not referenced in builder
   - **Recommendation:** DELETE

### Tables with Data - Unclear Purpose

4. **nfl_prop_line_snapshots** (883,415 rows)
   - Purpose: Historical snapshots of prop lines
   - Used by: `/api/query-engine/upcoming-props` only
   - Builder Usage: NO - used for upcoming props display, not queries
   - **Recommendation:** KEEP (useful for line movement history)

5. **nba_prop_lines_backup** (1,395,358 rows!)
   - Purpose: Backup of nba_prop_lines
   - Used by: NOT FOUND in code
   - **Recommendation:** DELETE or move to cold storage

6. **nfl_line_snapshots** (78,456 rows)
   - Purpose: Game line snapshots (not prop lines)
   - Used by: NOT FOUND in builder
   - **Recommendation:** May be legacy, check if used elsewhere

7. **nfl_opening_lines** (447 rows)
   - Purpose: Opening game lines
   - Used by: NOT FOUND in builder
   - **Recommendation:** May be legacy, check if used elsewhere

8. **nfl_current_lines** (1,275 rows)
   - Purpose: Current game lines
   - Used by: NOT FOUND in builder
   - **Recommendation:** May be legacy, check if used elsewhere

9. **nfl_team_stats** (1,990 rows)
   - Purpose: Team statistics
   - Used by: NOT FOUND in builder (we use nfl_team_rankings)
   - **Recommendation:** CONSOLIDATE with nfl_team_rankings or DELETE

10. **nba_team_stats** (9,282 rows)
    - Purpose: Team statistics
    - Used by: NOT FOUND in builder (we use nba_team_rankings)
    - **Recommendation:** CONSOLIDATE with nba_team_rankings or DELETE

11. **nba_position_defensive_stats** (25,867 rows)
    - Purpose: Raw defensive stats by position
    - Used by: NOT FOUND in builder (we use nba_position_defensive_rankings)
    - **Recommendation:** Keep as source for rankings, or DELETE if rankings are sourced elsewhere

12. **current_props** (1,058 rows)
    - Purpose: Unknown
    - Used by: NOT FOUND in builder
    - **Recommendation:** Investigate or DELETE

13. **live_odds_summary** (4,206 rows)
    - Purpose: Summary of live odds
    - Used by: NOT FOUND in builder
    - **Recommendation:** May be for public betting page, not builder

14. **nfl_upcoming_games** (6 rows)
    - Purpose: Upcoming game tracking
    - Used by: `/api/query-engine/upcoming-props` only
    - Builder Usage: NO - used for upcoming props display
    - **Recommendation:** KEEP (useful for upcoming game features)

---

## 📊 Table Relationship Map

### NFL Builder Query Flow
```
User Query
  ↓
nfl_box_scores_v2 (player stats)
  ↓ JOIN
nfl_games (game context: spread, total, score)
  ↓ JOIN  
nfl_prop_lines (book lines & odds) - OPTIONAL
  ↓ JOIN
nfl_team_rankings (defense rankings, offense rankings)
  ↓ JOIN
teams (team info: name, logo, division)
  ↓ JOIN
players (player info: position, name)
```

### NBA Builder Query Flow
```
User Query
  ↓
nba_box_scores_v2 (player stats)
  ↓ JOIN
nba_games (game context)
  ↓ JOIN
nba_prop_lines (book lines & odds) - OPTIONAL
  ↓ JOIN
nba_team_rankings (overall team rankings)
  ↓ JOIN (CONDITIONAL)
nba_position_defensive_rankings (defense vs G/F/C)
  ↓ JOIN
teams (team info)
  ↓ JOIN
players (player info)
```

---

## ❓ Questions & Concerns

### 1. Missing NHL/CFB/CBB Tables
**Question:** The builder code has sport options for NHL, CFB, and CBB, but there are NO tables for these sports in ClickHouse. Are these planned features?
- No `nhl_*` tables found
- No `cfb_*` or `college_football_*` tables found
- No `cbb_*` or `college_basketball_*` tables found

**Recommendation:** Either add these tables or remove these sports from the builder UI.

### 2. Duplicate Team Stats Tables
**Question:** Why do we have both `nfl_team_rankings` AND `nfl_team_stats`? Same for NBA.
- `nfl_team_rankings`: 48 columns, used in builder
- `nfl_team_stats`: 36 columns, NOT used in builder
- Same pattern for NBA

**Recommendation:** Consolidate into one table or clarify the purpose of each.

### 3. NBA Backup Table Size
**Question:** `nba_prop_lines_backup` has 1.4M rows (5x more than the main table). Is this intentional?
- Main table: 283,503 rows
- Backup: 1,395,358 rows

**Recommendation:** If it's truly a backup, move to cold storage. If it's historical data, rename it.

### 4. Prop Line Snapshots Usage
**Question:** `nfl_prop_line_snapshots` has 883K rows but isn't used in the main builder queries. Is this for line movement analysis?

**Recommendation:** Clarify purpose or consider archiving old snapshots.

### 5. Game ID Consistency
**Observation:** Tables use different ID systems:
- `game_id`: ESPN integer IDs (used in box_scores, games tables)
- `espn_game_id`: String versions of ESPN IDs (in games tables)
- This was causing JOIN issues in the past

**Recommendation:** Standardize on one ID system or document the relationship clearly.

---

## 🔧 Recommended Actions

### Immediate (Clean up)
1. **DROP** empty tables: `nfl_player_aggregates`, `nba_player_aggregates`, `props_with_stats`
2. **INVESTIGATE** `nba_prop_lines_backup` - move to cold storage if truly a backup
3. **DOCUMENT** the purpose of `*_stats` vs `*_rankings` tables

### Short-term (Optimization)
4. **CONSOLIDATE** team stats tables if redundant
5. **ARCHIVE** old prop line snapshots (keep recent 30-60 days only)
6. **CLARIFY** which tables are for builder vs public pages vs background jobs

### Long-term (Expansion)
7. **ADD** NHL tables if builder should support it
8. **ADD** CFB/CBB tables if builder should support them
9. **STANDARDIZE** game ID systems across all tables

---

## 📝 Table Usage in Code

### Builder Core (`/lib/query-engine/`)
- **prop-query.ts**: nfl_box_scores_v2, nba_box_scores_v2, nfl_games, nba_games, nfl_prop_lines, nba_prop_lines, nfl_team_rankings, nba_team_rankings, nba_position_defensive_rankings
- **team-query.ts**: nfl_games, nfl_team_rankings
- **referee-query.ts**: nfl_games, nfl_team_rankings
- **trend-query.ts**: nfl_games, nfl_team_rankings

### Public Pages
- **live_odds_snapshots**: Public betting page
- **games**: Universal games table for public betting
- **game_first_seen**: Opening line tracking

### Background Jobs
- **nfl_upcoming_games**: Cron job for upcoming game tracking
- **nfl_prop_line_snapshots**: Historical prop line tracking

---

## ✅ Verified Working Tables

All core builder tables have been verified working with the recent fixes:
1. ✅ Sport-specific column selection in subqueries
2. ✅ Sport-specific GROUP BY clauses
3. ✅ Proper JOINs with teams/players tables
4. ✅ Conditional rankings JOINs based on filters

**Status:** NFL and NBA prop queries are fully functional.

