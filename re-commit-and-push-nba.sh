#!/bin/bash
cd /Users/ryansavoia/user-dashboard

echo "=== Re-committing and pushing NBA changes ==="
echo ""

echo "1. Staging NBA changes..."
git add app/builder/page.tsx app/api/query-engine/upcoming-props/route.ts

echo "2. Checking what will be committed..."
git diff --cached --stat

echo ""
echo "3. Committing..."
git commit -m "Enable NBA in builder with props support

- Enable NBA button in builder (mobile and desktop)  
- Add NBA prop type mappings (points, rebounds, assists, etc.)
- Update upcoming-props endpoint to support NBA queries
- Use nba_prop_lines and nba_games for NBA data
- Update player search to use selectedSport"

echo ""
echo "4. Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Check Vercel deployment now."

