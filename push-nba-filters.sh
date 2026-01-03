#!/bin/bash
cd /Users/ryansavoia/user-dashboard

echo "=== Verifying Git Configuration ==="
CURRENT_EMAIL=$(git config user.email)
CURRENT_NAME=$(git config user.name)

echo "Current email: $CURRENT_EMAIL"
echo "Current name: $CURRENT_NAME"
echo ""

if [ "$CURRENT_EMAIL" != "ryanmagic11@gmail.com" ] || [ "$CURRENT_NAME" != "RyanSavoia" ]; then
  echo "⚠️  Git config is incorrect. Setting it now..."
  git config --global user.email "ryanmagic11@gmail.com"
  git config --global user.name "RyanSavoia"
  echo "✅ Git config updated"
  echo ""
else
  echo "✅ Git config is correct"
  echo ""
fi

echo "=== Staging changes ==="
git add app/builder/page.tsx

echo "=== Checking what will be committed ==="
git diff --cached --stat app/builder/page.tsx

echo ""
echo "=== Committing ==="
git commit -m "Add NBA-specific filters for positions and stats in builder"

echo ""
echo "=== Pushing to GitHub ==="
git push origin main

echo ""
echo "✅ Done! Check Vercel dashboard for deployment."

