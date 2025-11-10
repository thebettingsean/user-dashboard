#!/bin/bash
# Deploy the refresh-game-snapshots edge function

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not installed"
    echo "Install with: npm install -g supabase"
    exit 1
fi

# Link to the project (you may need to login first)
echo "Linking to Supabase project..."
supabase link --project-ref knccqavkxvezhdfoktay

# Deploy the edge function
echo "Deploying refresh-game-snapshots function..."
supabase functions deploy refresh-game-snapshots

echo "Done! Test with: ./test-nba-snapshot.sh"
