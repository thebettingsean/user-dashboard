#!/bin/bash
cd /Users/ryansavoia/user-dashboard

echo "=== Checking if NBA button is enabled in HEAD commit ==="
echo ""

echo "1. Checking app/builder/page.tsx in HEAD:"
if git show HEAD:app/builder/page.tsx 2>/dev/null | grep -q 'selectedSport === '\''nba'\'''; then
    echo "   ✅ Found: selectedSport === 'nba'"
else
    echo "   ❌ NOT FOUND"
fi

echo ""
echo "2. Checking if NBA button has onClick:"
if git show HEAD:app/builder/page.tsx 2>/dev/null | grep -A 1 "selectedSport === 'nba'" | grep -q "onClick"; then
    echo "   ✅ Found: onClick handler"
else
    echo "   ❌ NOT FOUND - button is still disabled"
fi

echo ""
echo "3. Checking if sport parameter is passed to API:"
if git show HEAD:app/builder/page.tsx 2>/dev/null | grep -q "sport: selectedSport"; then
    echo "   ✅ Found: sport parameter"
else
    echo "   ❌ NOT FOUND"
fi

echo ""
echo "4. Checking if upcoming-props route has NBA support:"
if git show HEAD:app/api/query-engine/upcoming-props/route.ts 2>/dev/null | grep -q "NBA_PROP_TYPE_MAP"; then
    echo "   ✅ Found: NBA prop mappings"
else
    echo "   ❌ NOT FOUND"
fi

echo ""
echo "=== Local file check (what we have locally) ==="
echo ""
echo "Local file has NBA button enabled:"
grep -n "selectedSport === 'nba'" app/builder/page.tsx | head -2

echo ""
echo "=== Conclusion ==="
echo "If HEAD commit is missing changes but local file has them,"
echo "we need to commit and push again."

