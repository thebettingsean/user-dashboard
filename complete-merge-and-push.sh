#!/bin/bash
# Complete merge and push
cd /Users/ryansavoia/user-dashboard

echo "Aborting current merge..."
git merge --abort

echo "Adding our committed changes back..."
git add app/builder/page.tsx app/api/query-engine/upcoming-props/route.ts

echo "Pulling latest from remote..."
git pull --no-rebase --no-edit

echo "Pushing to GitHub..."
git push origin main

echo "✅ Done! Changes pushed successfully."

