#!/bin/bash

# Comprehensive test script for prop query filters
# Tests all filter combinations to ensure they work together

BASE_URL="http://localhost:3003/api/query-engine"

# Fix: Use 'type' not 'query_type'

echo "=============================================="
echo "PROP QUERY FILTER TESTS"
echo "=============================================="

# Test 1: Basic prop query (position only)
echo ""
echo "Test 1: Basic position filter (RB, rush yards)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"rb","stat":"rush_yards","filters":{"time_period":"since_2023"}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 2: Prop with book line filter
echo ""
echo "Test 2: Prop with book line filter (RB, rush yards, line 30-40)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"rb","stat":"rush_yards","line_mode":"book","line_min":30,"line_max":40,"filters":{"time_period":"since_2023"}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 3: Prop with total range filter
echo ""
echo "Test 3: Prop with total range filter (WR, rec yards, total 45+)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"wr","stat":"receiving_yards","filters":{"time_period":"since_2023","total_range":{"min":45}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 4: Prop with defense rank filter
echo ""
echo "Test 4: Prop with vs Defense filter (WR, rec yards, vs bottom 15 D)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"wr","stat":"receiving_yards","filters":{"time_period":"since_2023","vs_defense_rank":"bottom_15","defense_stat":"wr"}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 5: Prop with team win % filter
echo ""
echo "Test 5: Prop with Team Win% filter (RB, rush yards, team 20-75%)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"rb","stat":"rush_yards","filters":{"time_period":"since_2023","team_win_pct":{"min":20,"max":75}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 6: Prop with opponent win % filter
echo ""
echo "Test 6: Prop with Opp Win% filter (QB, pass yards, opp 40-80%)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"qb","stat":"pass_yards","filters":{"time_period":"since_2023","opp_win_pct":{"min":40,"max":80}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 7: COMBINATION - Multiple filters together (THE REAL TEST)
echo ""
echo "Test 7: COMBO - RB, rush yards, book line 30-40, team win 20-75%, total <=45"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"rb","stat":"rush_yards","line_mode":"book","line_min":30,"line_max":40,"filters":{"time_period":"since_2023","team_win_pct":{"min":20,"max":75},"total_range":{"max":45}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 8: COMBINATION - WR with defense rank + book line + total
echo ""
echo "Test 8: COMBO - WR, rec yards, line 10-30, vs bottom 15 WR D, total 45+"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"wr","stat":"receiving_yards","line_mode":"book","line_min":10,"line_max":30,"filters":{"time_period":"since_2023","vs_defense_rank":"bottom_15","defense_stat":"wr","total_range":{"min":45}}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 9: Location filter
echo ""
echo "Test 9: Prop with Location filter (RB, rush yards, Home)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"rb","stat":"rush_yards","filters":{"time_period":"since_2023","location":"home"}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 10: Division filter
echo ""
echo "Test 10: Prop with Division filter (QB, pass yards, Division game)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"prop","position":"qb","stat":"pass_yards","filters":{"time_period":"since_2023","is_division":"division"}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") or d.get(\"games\") else \"FAILED\"}'); print(f'  Games: {len(d.get(\"games\", []))}')" 2>/dev/null || echo "  FAILED - Error executing query"

echo ""
echo "=============================================="
echo "UPCOMING PROPS TESTS"
echo "=============================================="

UPCOMING_URL="http://localhost:3003/api/query-engine/upcoming-props"

# Test 11: Basic upcoming props
echo ""
echo "Test 11: Upcoming props - WR, rec yards"
curl -s -X POST "$UPCOMING_URL" \
  -H "Content-Type: application/json" \
  -d '{"position":"wr","stat":"receiving_yards"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") else \"FAILED\"}'); print(f'  Props: {d.get(\"total_props\", 0)}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 12: Upcoming props with line range
echo ""
echo "Test 12: Upcoming props - WR, rec yards, line 10-30"
curl -s -X POST "$UPCOMING_URL" \
  -H "Content-Type: application/json" \
  -d '{"position":"wr","stat":"receiving_yards","line_min":10,"line_max":30}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") else \"FAILED\"}'); print(f'  Props: {d.get(\"total_props\", 0)}')" 2>/dev/null || echo "  FAILED - Error executing query"

# Test 13: Upcoming props with game filters
echo ""
echo "Test 13: Upcoming props - WR, rec yards, total 45+, vs bottom 15 WR D"
curl -s -X POST "$UPCOMING_URL" \
  -H "Content-Type: application/json" \
  -d '{"position":"wr","stat":"receiving_yards","line_min":10,"line_max":30,"filters":{"total_range":{"min":45},"vs_defense_rank":"bottom_15","defense_stat":"wr"}}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Status: {\"SUCCESS\" if d.get(\"success\") else \"FAILED\"}'); print(f'  Props: {d.get(\"total_props\", 0)}')" 2>/dev/null || echo "  FAILED - Error executing query"

echo ""
echo "=============================================="
echo "TESTS COMPLETE"
echo "=============================================="

