#!/bin/bash
cd /Users/ryansavoia/user-dashboard

echo "=== Checking if NBA changes are in git ==="
echo ""

# Check if NBA button changes are in the latest commit
if git show HEAD:app/builder/page.tsx 2>/dev/null | grep -q "selectedSport === 'nba'"; then
    echo "✅ NBA changes found in HEAD commit"
else
    echo "❌ NBA changes NOT in HEAD commit - need to re-commit"
    echo ""
    echo "Staging files..."
    git add app/builder/page.tsx app/api/query-engine/upcoming-props/route.ts
    
    echo "Committing..."
    git commit -m "Enable NBA in builder with props support"
fi

echo ""
echo "=== Checking git status ==="
git status --short

echo ""
echo "=== Current branch status ==="
git log --oneline -3

echo ""
echo "=== Pushing to GitHub ==="
git push origin main

echo ""
echo "✅ Done! Check output above to confirm push succeeded."

