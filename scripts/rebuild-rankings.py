#!/usr/bin/env python3
"""
Rebuild NFL Team Rankings for all seasons and weeks
Includes: traditional stats, win%, position-specific rankings
"""

import os
import json
import base64
import urllib.request
import urllib.error
from collections import defaultdict
import time

# Load env from .env.local
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

load_env()

CLICKHOUSE_HOST = os.environ.get('CLICKHOUSE_HOST')
CLICKHOUSE_KEY_ID = os.environ.get('CLICKHOUSE_KEY_ID')
CLICKHOUSE_KEY_SECRET = os.environ.get('CLICKHOUSE_KEY_SECRET')

if not CLICKHOUSE_HOST:
    raise ValueError("CLICKHOUSE_HOST not set!")

def get_auth():
    return base64.b64encode(f"{CLICKHOUSE_KEY_ID}:{CLICKHOUSE_KEY_SECRET}".encode()).decode()

def query(sql):
    """Execute a query and return results"""
    url = f"{CLICKHOUSE_HOST}?format=JSONEachRow"
    data = json.dumps({'query': sql}).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Basic {get_auth()}'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as response:
            text = response.read().decode('utf-8')
            lines = text.strip().split('\n')
            return [json.loads(line) for line in lines if line]
    except urllib.error.HTTPError as e:
        print(f"Query failed: {e.read().decode()[:500]}")
        return []

def command(sql):
    """Execute a command"""
    data = json.dumps({'query': sql}).encode('utf-8')
    req = urllib.request.Request(
        CLICKHOUSE_HOST,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Basic {get_auth()}'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except urllib.error.HTTPError as e:
        print(f"Command failed: {e.read().decode()[:300]}")
        return False

# Traditional offensive metrics (higher = better)
OFFENSIVE_METRICS = [
    ('points_per_game', 'rank_points_per_game'),
    ('passing_yards_per_game', 'rank_passing_yards_per_game'),
    ('rushing_yards_per_game', 'rank_rushing_yards_per_game'),
    ('total_yards_per_game', 'rank_total_yards_per_game'),
    ('yards_per_pass', 'rank_yards_per_pass'),
    ('yards_per_rush', 'rank_yards_per_rush'),
]

# Traditional defensive metrics (lower = better)
DEFENSIVE_METRICS = [
    ('points_allowed_per_game', 'rank_points_allowed_per_game'),
    ('passing_yards_allowed_per_game', 'rank_passing_yards_allowed_per_game'),
    ('rushing_yards_allowed_per_game', 'rank_rushing_yards_allowed_per_game'),
    ('total_yards_allowed_per_game', 'rank_total_yards_allowed_per_game'),
    ('yards_per_pass_allowed', 'rank_yards_per_pass_allowed'),
    ('yards_per_rush_allowed', 'rank_yards_per_rush_allowed'),
]

# Position-specific offensive metrics (higher = better)
POSITION_OFFENSE_METRICS = [
    ('wr_yards_produced', 'rank_wr_yards_produced'),
    ('te_yards_produced', 'rank_te_yards_produced'),
    ('rb_yards_produced', 'rank_rb_yards_produced'),
]

# Position-specific defensive metrics (lower = better - fewer yards allowed is better defense)
POSITION_DEFENSE_METRICS = [
    ('yards_allowed_to_wr', 'rank_yards_allowed_to_wr'),
    ('yards_allowed_to_te', 'rank_yards_allowed_to_te'),
    ('yards_allowed_to_rb', 'rank_yards_allowed_to_rb'),
]


def get_win_loss_through_week(season, week):
    """Get cumulative wins/losses for each team through a given week"""
    sql = f"""
        SELECT 
            team_id,
            SUM(won) as wins,
            SUM(1 - won) as losses
        FROM (
            -- Home games
            SELECT home_team_id as team_id, home_won as won
            FROM nfl_games 
            WHERE season = {season} AND week <= {week} 
              AND (home_score > 0 OR away_score > 0)
            
            UNION ALL
            
            -- Away games
            SELECT away_team_id as team_id, 1 - home_won as won
            FROM nfl_games 
            WHERE season = {season} AND week <= {week}
              AND (home_score > 0 OR away_score > 0)
        )
        GROUP BY team_id
    """
    return query(sql)


def get_position_stats_through_week(season, week):
    """
    Get position-specific yards for offense and defense through a given week
    
    For OFFENSE (yards produced BY position):
    - WR: sum of receiving yards by WRs on the team
    - TE: sum of receiving yards by TEs on the team  
    - RB: sum of rushing + receiving yards by RBs on the team
    
    For DEFENSE (yards allowed TO position):
    - vs WR: receiving yards allowed to opponent WRs
    - vs TE: receiving yards allowed to opponent TEs
    - vs RB: rushing + receiving yards allowed to opponent RBs
    """
    
    # Offensive production by position (our players' yards)
    # Join box scores with players to get position, then with games to filter by season/week
    offense_sql = f"""
        SELECT 
            nfl_box_scores_v2.team_id as team_id,
            SUM(IF(players.position = 'WR', nfl_box_scores_v2.receiving_yards, 0)) as total_wr_yards,
            SUM(IF(players.position = 'TE', nfl_box_scores_v2.receiving_yards, 0)) as total_te_yards,
            SUM(IF(players.position = 'RB', nfl_box_scores_v2.rush_yards + nfl_box_scores_v2.receiving_yards, 0)) as total_rb_yards,
            COUNT(DISTINCT nfl_box_scores_v2.game_id) as games
        FROM nfl_box_scores_v2
        INNER JOIN nfl_games ON nfl_box_scores_v2.game_id = nfl_games.game_id
        INNER JOIN players ON nfl_box_scores_v2.player_id = players.player_id AND players.sport = 'nfl'
        WHERE nfl_games.season = {season} AND nfl_games.week <= {week}
          AND (nfl_games.home_score > 0 OR nfl_games.away_score > 0)
        GROUP BY nfl_box_scores_v2.team_id
    """
    offense_data = query(offense_sql)
    
    # Defensive: yards allowed TO opponent positions
    # The defending team is the OPPOSITE of the player's team
    # If player is_home=1, defending team is away_team_id
    # If player is_home=0, defending team is home_team_id
    defense_sql = f"""
        SELECT 
            IF(nfl_box_scores_v2.is_home = 1, nfl_games.away_team_id, nfl_games.home_team_id) as team_id,
            SUM(IF(players.position = 'WR', nfl_box_scores_v2.receiving_yards, 0)) as total_wr_yards_allowed,
            SUM(IF(players.position = 'TE', nfl_box_scores_v2.receiving_yards, 0)) as total_te_yards_allowed,
            SUM(IF(players.position = 'RB', nfl_box_scores_v2.rush_yards + nfl_box_scores_v2.receiving_yards, 0)) as total_rb_yards_allowed,
            COUNT(DISTINCT nfl_box_scores_v2.game_id) as games
        FROM nfl_box_scores_v2
        INNER JOIN nfl_games ON nfl_box_scores_v2.game_id = nfl_games.game_id
        INNER JOIN players ON nfl_box_scores_v2.player_id = players.player_id AND players.sport = 'nfl'
        WHERE nfl_games.season = {season} AND nfl_games.week <= {week}
          AND (nfl_games.home_score > 0 OR nfl_games.away_score > 0)
        GROUP BY team_id
    """
    defense_data = query(defense_sql)
    
    return offense_data, defense_data


def calculate_ranks(teams, metric_col, rank_col, ascending=True):
    """Calculate ranks for a list of teams on a specific metric"""
    # Sort: ascending=True means lower value = better rank (for defense)
    sorted_teams = sorted(teams, key=lambda x: x.get(metric_col) or (0 if not ascending else 9999), reverse=not ascending)
    for rank, team in enumerate(sorted_teams, 1):
        team[rank_col] = rank
    return teams


def main():
    print("=== REBUILDING ALL NFL RANKINGS (with win% and position stats) ===")
    start_time = time.time()
    
    # Get all season/week combinations
    season_weeks = query("""
        SELECT DISTINCT season, week 
        FROM nfl_team_rankings 
        ORDER BY season, week
    """)
    
    print(f"Processing {len(season_weeks)} season/week combinations...")
    
    total_updates = 0
    
    for i, sw in enumerate(season_weeks):
        season = sw['season']
        week = sw['week']
        
        # Get existing teams for this season/week
        teams = query(f"""
            SELECT team_id, 
                   points_per_game, passing_yards_per_game, rushing_yards_per_game,
                   total_yards_per_game, yards_per_pass, yards_per_rush,
                   points_allowed_per_game, passing_yards_allowed_per_game, 
                   rushing_yards_allowed_per_game, total_yards_allowed_per_game,
                   yards_per_pass_allowed, yards_per_rush_allowed,
                   games_played
            FROM nfl_team_rankings 
            WHERE season = {season} AND week = {week}
        """)
        
        if not teams:
            continue
        
        # Convert to dict for easy lookup
        team_data = {t['team_id']: t for t in teams}
        
        # 1. Get win/loss records
        win_loss = get_win_loss_through_week(season, week)
        for wl in win_loss:
            tid = wl['team_id']
            if tid in team_data:
                wins = int(wl['wins'])
                losses = int(wl['losses'])
                total_games = wins + losses
                team_data[tid]['wins'] = wins
                team_data[tid]['losses'] = losses
                team_data[tid]['win_pct'] = round(wins / total_games, 3) if total_games > 0 else 0
        
        # 2. Get position-specific stats
        offense_pos, defense_pos = get_position_stats_through_week(season, week)
        
        for op in offense_pos:
            tid = op['team_id']
            if tid in team_data:
                games = max(1, int(op['games']))
                team_data[tid]['wr_yards_produced'] = round(float(op['total_wr_yards']) / games, 1)
                team_data[tid]['te_yards_produced'] = round(float(op['total_te_yards']) / games, 1)
                team_data[tid]['rb_yards_produced'] = round(float(op['total_rb_yards']) / games, 1)
        
        for dp in defense_pos:
            tid = dp['team_id']
            if tid in team_data:
                games = max(1, int(dp['games']))
                team_data[tid]['yards_allowed_to_wr'] = round(float(dp['total_wr_yards_allowed']) / games, 1)
                team_data[tid]['yards_allowed_to_te'] = round(float(dp['total_te_yards_allowed']) / games, 1)
                team_data[tid]['yards_allowed_to_rb'] = round(float(dp['total_rb_yards_allowed']) / games, 1)
        
        # Convert back to list for ranking
        teams_list = list(team_data.values())
        
        # 3. Calculate all ranks
        # Traditional offensive (higher = better)
        for value_col, rank_col in OFFENSIVE_METRICS:
            calculate_ranks(teams_list, value_col, rank_col, ascending=False)
        
        # Traditional defensive (lower = better)
        for value_col, rank_col in DEFENSIVE_METRICS:
            calculate_ranks(teams_list, value_col, rank_col, ascending=True)
        
        # Position offense (higher = better)
        for value_col, rank_col in POSITION_OFFENSE_METRICS:
            calculate_ranks(teams_list, value_col, rank_col, ascending=False)
        
        # Position defense (lower = better - fewer yards allowed)
        for value_col, rank_col in POSITION_DEFENSE_METRICS:
            calculate_ranks(teams_list, value_col, rank_col, ascending=True)
        
        # 4. Update database
        for team in teams_list:
            tid = team['team_id']
            
            # Build SET clause with all the new columns
            set_parts = []
            
            # Win/loss
            if 'wins' in team:
                set_parts.append(f"wins = {team.get('wins', 0)}")
                set_parts.append(f"losses = {team.get('losses', 0)}")
                set_parts.append(f"win_pct = {team.get('win_pct', 0)}")
            
            # Position offense
            if 'wr_yards_produced' in team:
                set_parts.append(f"wr_yards_produced = {team.get('wr_yards_produced', 0)}")
                set_parts.append(f"rank_wr_yards_produced = {team.get('rank_wr_yards_produced', 0)}")
                set_parts.append(f"te_yards_produced = {team.get('te_yards_produced', 0)}")
                set_parts.append(f"rank_te_yards_produced = {team.get('rank_te_yards_produced', 0)}")
                set_parts.append(f"rb_yards_produced = {team.get('rb_yards_produced', 0)}")
                set_parts.append(f"rank_rb_yards_produced = {team.get('rank_rb_yards_produced', 0)}")
            
            # Position defense
            if 'yards_allowed_to_wr' in team:
                set_parts.append(f"yards_allowed_to_wr = {team.get('yards_allowed_to_wr', 0)}")
                set_parts.append(f"rank_yards_allowed_to_wr = {team.get('rank_yards_allowed_to_wr', 0)}")
                set_parts.append(f"yards_allowed_to_te = {team.get('yards_allowed_to_te', 0)}")
                set_parts.append(f"rank_yards_allowed_to_te = {team.get('rank_yards_allowed_to_te', 0)}")
                set_parts.append(f"yards_allowed_to_rb = {team.get('yards_allowed_to_rb', 0)}")
                set_parts.append(f"rank_yards_allowed_to_rb = {team.get('rank_yards_allowed_to_rb', 0)}")
            
            # Traditional ranks
            for _, rank_col in OFFENSIVE_METRICS + DEFENSIVE_METRICS:
                if rank_col in team:
                    set_parts.append(f"{rank_col} = {team[rank_col]}")
            
            if set_parts:
                sql = f"""
                    ALTER TABLE nfl_team_rankings 
                    UPDATE {', '.join(set_parts)} 
                    WHERE season = {season} AND week = {week} AND team_id = {tid}
                """
                command(sql)
                total_updates += 1
        
        # Progress
        if (i + 1) % 10 == 0 or i == len(season_weeks) - 1:
            elapsed = time.time() - start_time
            print(f"  Progress: {i + 1}/{len(season_weeks)} ({elapsed:.1f}s elapsed)")
    
    elapsed = time.time() - start_time
    print(f"\n=== DONE: {total_updates} total updates in {elapsed:.1f}s ===")
    
    # Verify sample
    print("\n=== Sample: 2025 Week 13 Rankings ===")
    
    # Top offenses
    print("\n  Top 5 Offenses (Points):")
    sample = query("""
        SELECT t.abbreviation, r.rank_points_per_game as ppg_rank, 
               round(r.points_per_game, 1) as ppg,
               r.wins, r.losses, round(r.win_pct * 100, 1) as win_pct
        FROM nfl_team_rankings r 
        JOIN teams t ON r.team_id = t.team_id AND t.sport = 'nfl'
        WHERE r.season = 2025 AND r.week = 13 
        ORDER BY r.rank_points_per_game 
        LIMIT 5
    """)
    for row in sample:
        print(f"    {row['abbreviation']}: #{row['ppg_rank']} PPG ({row['ppg']}), Record: {row['wins']}-{row['losses']} ({row['win_pct']}%)")
    
    # WR production
    print("\n  Top 5 WR Offense:")
    sample = query("""
        SELECT t.abbreviation, r.rank_wr_yards_produced as rank,
               round(r.wr_yards_produced, 1) as wr_ypg
        FROM nfl_team_rankings r 
        JOIN teams t ON r.team_id = t.team_id AND t.sport = 'nfl'
        WHERE r.season = 2025 AND r.week = 13 
        ORDER BY r.rank_wr_yards_produced 
        LIMIT 5
    """)
    for row in sample:
        print(f"    {row['abbreviation']}: #{row['rank']} WR Yards ({row['wr_ypg']} ypg)")
    
    # Defense vs WR
    print("\n  Top 5 Defense vs WR:")
    sample = query("""
        SELECT t.abbreviation, r.rank_yards_allowed_to_wr as rank,
               round(r.yards_allowed_to_wr, 1) as wr_allowed
        FROM nfl_team_rankings r 
        JOIN teams t ON r.team_id = t.team_id AND t.sport = 'nfl'
        WHERE r.season = 2025 AND r.week = 13 
        ORDER BY r.rank_yards_allowed_to_wr 
        LIMIT 5
    """)
    for row in sample:
        print(f"    {row['abbreviation']}: #{row['rank']} vs WR ({row['wr_allowed']} ypg allowed)")

if __name__ == '__main__':
    main()
