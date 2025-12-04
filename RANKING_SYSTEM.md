# TEAM RANKING SYSTEM

## Overview
Rankings are calculated **cumulatively** through each week of the season.
Teams are ranked 1-32 (NFL) or 1-30 (NBA) where **lower rank = better performance**.

---

## NFL RANKINGS

### OFFENSIVE RANKS (What Team Does)
Calculated from `nfl_team_stats` aggregated through Week X:

1. **rank_points_per_game** (1-32)
   - Total points scored / games played
   - Rank 1 = Highest scoring offense

2. **rank_total_yards_per_game** (1-32)
   - Total yards / games played
   - Rank 1 = Most total yards

3. **rank_passing_yards_per_game** (1-32)
   - Passing yards / games played
   - Rank 1 = Most passing yards

4. **rank_rushing_yards_per_game** (1-32)
   - Rushing yards / games played
   - Rank 1 = Most rushing yards

5. **rank_third_down_pct** (1-32)
   - Third down conversions / third down attempts
   - Rank 1 = Best conversion rate

6. **rank_redzone_pct** (1-32)
   - Redzone scores / redzone attempts
   - Rank 1 = Best redzone efficiency

### DEFENSIVE RANKS (What Opponent Does Against Team)
**Lower rank = BETTER defense (allows less)**

1. **rank_points_allowed_per_game** (1-32)
   - Total points allowed / games played
   - Rank 1 = Allows fewest points

2. **rank_total_yards_allowed_per_game** (1-32)
   - Yards allowed / games played
   - Rank 1 = Allows fewest yards

3. **rank_passing_yards_allowed_per_game** (1-32)
   - Passing yards allowed / games played
   - Rank 1 = Best pass defense

4. **rank_rushing_yards_allowed_per_game** (1-32)
   - Rushing yards allowed / games played
   - Rank 1 = Best run defense

5. **rank_sacks_per_game** (1-32)
   - Sacks / games played
   - Rank 1 = Most sacks

6. **rank_turnovers_forced_per_game** (1-32)
   - Turnovers forced / games played
   - Rank 1 = Forces most turnovers

---

## NBA RANKINGS

### OFFENSIVE RANKS (What Team Does)

1. **rank_points_per_game** (1-30)
   - Points scored / games played
   - Rank 1 = Highest scoring

2. **rank_field_goal_pct** (1-30)
   - Field goals made / field goals attempted
   - Rank 1 = Best shooting

3. **rank_three_point_pct** (1-30)
   - 3PM / 3PA
   - Rank 1 = Best 3-point shooting

4. **rank_assists_per_game** (1-30)
   - Assists / games played
   - Rank 1 = Most assists

5. **rank_offensive_rebounds_per_game** (1-30)
   - Offensive rebounds / games played
   - Rank 1 = Most offensive boards

### DEFENSIVE RANKS (What Opponent Does Against Team)

1. **rank_points_allowed_per_game** (1-30)
   - Points allowed / games played
   - Rank 1 = Best defense

2. **rank_opp_field_goal_pct** (1-30)
   - Opponent FG% against this team
   - Rank 1 = Best at defending shots

3. **rank_opp_three_point_pct** (1-30)
   - Opponent 3P% against this team
   - Rank 1 = Best at defending 3s

4. **rank_steals_per_game** (1-30)
   - Steals / games played
   - Rank 1 = Most steals

5. **rank_blocks_per_game** (1-30)
   - Blocks / games played
   - Rank 1 = Most blocks

---

## RANKING CALCULATION PROCESS

### Step 1: Aggregate Stats Through Week X
```sql
-- Example: Chiefs through Week 5
SELECT 
  team_id,
  season,
  5 as week,
  COUNT(*) as games_played,
  AVG(points_scored) as points_per_game,
  AVG(total_yards) as yards_per_game,
  AVG(passing_yards) as passing_yards_per_game,
  AVG(def_points_allowed) as points_allowed_per_game,
  AVG(def_total_yards_allowed) as yards_allowed_per_game
FROM nfl_team_stats
WHERE season = 2024 AND week <= 5 AND team_id = 12
```

### Step 2: Rank All 32 Teams
```sql
-- Rank all teams for each metric
SELECT
  team_id,
  season,
  week,
  RANK() OVER (PARTITION BY season, week ORDER BY points_per_game DESC) as rank_points_per_game,
  RANK() OVER (PARTITION BY season, week ORDER BY points_allowed_per_game ASC) as rank_points_allowed_per_game
FROM team_aggregates
```

### Step 3: Insert Into Rankings Table
```sql
INSERT INTO nfl_team_rankings
SELECT * FROM ranked_teams
```

---

## USAGE IN BOX SCORES

When inserting player box scores, we look up opponent's defensive rank:

```sql
-- Player playing vs Chiefs defense in Week 5
SELECT rank_passing_yards_allowed_per_game, rank_rushing_yards_allowed_per_game
FROM nfl_team_rankings
WHERE team_id = 12  -- Chiefs (opponent)
  AND season = 2024
  AND week = 4  -- Rankings through Week 4 (before this game)
```

Store in box_scores as:
- `opp_def_rank_pass_yards` = Chiefs' Week 4 pass defense rank
- `opp_def_rank_rush_yards` = Chiefs' Week 4 run defense rank

---

## KEY RULES

1. **Rankings are cumulative**
   - Week 5 rankings = aggregate of Weeks 1-5
   - Not a rolling window

2. **Rankings lag by 1 week**
   - Week 5 game uses Week 4 rankings
   - Can't know Week 5 rank until after Week 5 completes

3. **Lower = Better**
   - Rank 1 = Best in that category
   - Rank 32 = Worst in that category

4. **Minimum games played**
   - Week 1: Use preseason rankings or all teams = 16
   - Week 2+: Use actual calculated ranks

---

## EXAMPLE QUERIES

### "Show me WR props vs top 10 pass defenses"
```sql
SELECT 
  bs.player_id,
  bs.receiving_yards,
  bs.opp_def_rank_pass_yards
FROM nfl_box_scores_v2 bs
WHERE bs.opp_def_rank_pass_yards <= 10
```

### "RB performance vs bottom 10 run defenses"
```sql
SELECT 
  bs.player_id,
  bs.rush_yards,
  bs.opp_def_rank_rush_yards
FROM nfl_box_scores_v2 bs
WHERE bs.opp_def_rank_rush_yards >= 23  -- Bottom 10
```

