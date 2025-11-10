#!/bin/bash
# Test NBA snapshot refresh

EDGE_FUNCTION_URL="https://knccqavkxvezhdfoktay.supabase.co/functions/v1/refresh-game-snapshots"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTg5MDcsImV4cCI6MjA2NzkzNDkwN30.HCmUjhNxdyT8zXaAQvgHwJiipCk3q7CfJjNnvjqhP7E"

echo "Testing NBA snapshot refresh..."
curl -i -X POST "$EDGE_FUNCTION_URL?sport=nba" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"

echo -e "\n\nDone!"
