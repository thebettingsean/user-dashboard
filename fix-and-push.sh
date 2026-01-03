#!/bin/bash
cd /Users/ryansavoia/user-dashboard

# Set git to not use an editor for merge messages
export GIT_EDITOR=true
export GIT_MERGE_AUTOEDIT=no

echo "Completing merge with auto message..."
git merge --continue -m "Merge remote changes"

echo "Pushing to GitHub..."
git push origin main

echo "✅ Done!"

