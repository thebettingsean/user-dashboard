CREATE TABLE IF NOT EXISTS game_snapshots (
  id bigserial PRIMARY KEY,
  game_id text NOT NULL,
  sport text NOT NULL,
  season integer,
  week integer,
  status text,
  start_time_utc timestamptz NOT NULL,
  start_time_label text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  venue text,
  spread jsonb,
  moneyline jsonb,
  totals jsonb,
  public_money jsonb,
  referee jsonb,
  team_stats jsonb,
  props jsonb,
  script_meta jsonb,
  picks_meta jsonb,
  raw_payload jsonb,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (sport, game_id)
);

CREATE INDEX IF NOT EXISTS game_snapshots_sport_idx ON game_snapshots (sport);
CREATE INDEX IF NOT EXISTS game_snapshots_kickoff_idx ON game_snapshots (sport, start_time_utc);
