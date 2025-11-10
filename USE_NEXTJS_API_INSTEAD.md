# Use Next.js API Route Instead of Edge Function

The Supabase Edge Function has a 60-second timeout which isn't enough to fetch all the props and team stats data. 

## Solution: Use the Next.js API Route

The route at `/api/admin/refresh-game-snapshots` already exists and has the same logic but NO timeout.

### Setup a Vercel Cron Job instead:

1. **Add to `vercel.json`**:
```json
{
  "crons": [
    {
      "path": "/api/admin/refresh-game-snapshots",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

2. **Deploy to Vercel**: The cron will automatically run every 15 minutes

3. **Test it manually**: 
```bash
curl -X POST "https://your-app.vercel.app/api/admin/refresh-game-snapshots"
```

### Why this is better:
- ✅ No 60-second timeout
- ✅ Can fetch all props and team stats without rushing
- ✅ Built-in retry logic already implemented
- ✅ Easier to debug (see Vercel function logs)
- ✅ Already has all your environment variables

### For now, trigger it manually:

Since your app is on Vercel already, just hit the API endpoint directly:

```bash
curl -X POST "https://dashboard.thebettinginsider.com/api/admin/refresh-game-snapshots"
```

This will fetch EVERYTHING including props and team stats.

