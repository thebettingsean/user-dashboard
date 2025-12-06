#!/usr/bin/env python3
"""
Rebuild NFL Team Rankings for all seasons and weeks
"""

import os
import json
import base64
import urllib.request
import urllib.error
from collections import defaultdict

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
        print(f"Query failed: {e.read().decode()[:200]}")
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
        print(f"Command failed: {e.read().decode()[:200]}")
        return False

# Offensive metrics (higher = better)
OFFENSIVE_METRICS = [
    ('points_per_game', 'rank_points_per_game'),
    ('passing_yards_per_game', 'rank_passing_yards_per_game'),
    ('rushing_yards_per_game', 'rank_rushing_yards_per_game'),
    ('total_yards_per_game', 'rank_total_yards_per_game'),
    ('yards_per_pass', 'rank_yards_per_pass'),
    ('yards_per_rush', 'rank_yards_per_rush'),
]

# Defensive metrics (lower = better)
DEFENSIVE_METRICS = [
    ('points_allowed_per_game', 'rank_points_allowed_per_game'),
    ('passing_yards_allowed_per_game', 'rank_passing_yards_allowed_per_game'),
    ('rushing_yards_allowed_per_game', 'rank_rushing_yards_allowed_per_game'),
    ('total_yards_allowed_per_game', 'rank_total_yards_allowed_per_game'),
    ('yards_per_pass_allowed', 'rank_yards_per_pass_allowed'),
    ('yards_per_rush_allowed', 'rank_yards_per_rush_allowed'),
]

def main():
    print("=== REBUILDING ALL NFL RANKINGS ===")
    
    # Get all season/week combinations
    season_weeks = query("""
        SELECT DISTINCT season, week 
        FROM nfl_team_rankings 
        ORDER BY season, week
    """)
    
    print(f"Processing {len(season_weeks)} season/week combinations...")
    
    total_updates = 0
    
    for sw in season_weeks:
        season = sw['season']
        week = sw['week']
        
        # Get all teams for this season/week with their stats
        teams = query(f"""
            SELECT team_id, 
                   points_per_game, passing_yards_per_game, rushing_yards_per_game,
                   total_yards_per_game, yards_per_pass, yards_per_rush,
                   points_allowed_per_game, passing_yards_allowed_per_game, 
                   rushing_yards_allowed_per_game, total_yards_allowed_per_game,
                   yards_per_pass_allowed, yards_per_rush_allowed
            FROM nfl_team_rankings 
            WHERE season = {season} AND week = {week}
        """)
        
        if not teams:
            continue
        
        # Calculate ranks for each metric
        updates = defaultdict(dict)  # team_id -> {rank_col: rank}
        
        # Offensive ranks (sort DESC - higher is better)
        for value_col, rank_col in OFFENSIVE_METRICS:
            sorted_teams = sorted(teams, key=lambda x: x.get(value_col) or 0, reverse=True)
            for rank, team in enumerate(sorted_teams, 1):
                updates[team['team_id']][rank_col] = rank
        
        # Defensive ranks (sort ASC - lower is better)
        for value_col, rank_col in DEFENSIVE_METRICS:
            sorted_teams = sorted(teams, key=lambda x: x.get(value_col) or 999)
            for rank, team in enumerate(sorted_teams, 1):
                updates[team['team_id']][rank_col] = rank
        
        # Batch update all teams for this season/week
        for team_id, ranks in updates.items():
            set_clauses = ', '.join([f"{col} = {val}" for col, val in ranks.items()])
            sql = f"""
                ALTER TABLE nfl_team_rankings 
                UPDATE {set_clauses} 
                WHERE season = {season} AND week = {week} AND team_id = {team_id}
            """
            command(sql)
            total_updates += 1
        
        print(f"  Season {season} Week {week}: {len(updates)} teams updated")
    
    print(f"\n=== DONE: {total_updates} total updates ===")
    
    # Verify sample
    print("\n=== Sample: 2025 Week 13 Top 5 Offenses ===")
    sample = query("""
        SELECT t.abbreviation, r.rank_points_per_game as ppg_rank, 
               round(r.points_per_game, 1) as ppg,
               r.rank_passing_yards_per_game as pass_rank,
               round(r.passing_yards_per_game, 1) as pass_ypg,
               r.rank_yards_per_pass as ypp_rank,
               round(r.yards_per_pass, 2) as ypp
        FROM nfl_team_rankings r 
        JOIN teams t ON r.team_id = t.team_id AND t.sport = 'nfl'
        WHERE r.season = 2025 AND r.week = 13 
        ORDER BY r.rank_points_per_game 
        LIMIT 5
    """)
    for row in sample:
        print(f"  {row['abbreviation']}: PPG #{row['ppg_rank']} ({row['ppg']}), Pass #{row['pass_rank']} ({row['pass_ypg']} ypg), YPP #{row['ypp_rank']} ({row['ypp']})")

if __name__ == '__main__':
    main()

