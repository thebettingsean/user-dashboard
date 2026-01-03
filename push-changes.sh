#!/bin/bash
# Script to push NBA builder changes
cd /Users/ryansavoia/user-dashboard

# Remove any lock files
rm -f .git/index.lock

# Check status
echo "Checking git status..."
git status --short

# Add the files
echo "Adding files..."
git add app/builder/page.tsx app/api/query-engine/upcoming-props/route.ts

# Commit if not already committed
if ! git diff --cached --quiet; then
    echo "Committing changes..."
    git commit -m "Enable NBA in builder with props support"
fi

# Push
echo "Pushing to GitHub..."
git push origin main

echo "Done!"

