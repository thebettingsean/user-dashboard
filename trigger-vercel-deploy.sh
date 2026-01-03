#!/bin/bash
cd /Users/ryansavoia/user-dashboard

echo "Triggering Vercel deployment..."
git commit --allow-empty -m "Trigger Vercel deployment for NBA builder"
git push origin main

echo ""
echo "✅ Pushed! Check Vercel dashboard now - deployment should trigger."

