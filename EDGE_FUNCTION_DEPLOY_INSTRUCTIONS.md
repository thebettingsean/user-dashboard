# Deploy Edge Function via Supabase Dashboard

Since the CLI install failed, deploy directly through the Supabase Dashboard:

## Steps:

1. Go to https://supabase.com/dashboard/project/knccqavkxvezhdfoktay/functions

2. Click "Create a new function" (or "Deploy a new version" if it exists)

3. **Function name**: `refresh-game-snapshots`

4. **Copy and paste the ENTIRE contents** of:
   `/Users/claytonwendel/betting-dashboard/supabase/functions/refresh-game-snapshots/index.ts`

5. Click "Deploy function"

6. **Set Environment Variables**:
   - Go to Project Settings → Edge Functions → Secrets
   - Add these secrets:
     ```
     INSIDER_API_KEY=<your_trendline_api_key>
     PRIMARY_SUPABASE_URL=https://cmulndosilihjhlurbth.supabase.co
     PRIMARY_SUPABASE_SERVICE_ROLE_KEY=<your_main_project_service_role_key>
     SNAPSHOTS_SUPABASE_URL=https://knccqavkxvezhdfoktay.supabase.co
     SNAPSHOTS_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2NxYXZreHZlemhkZm9rdGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1ODkwNywiZXhwIjoyMDY3OTM0OTA3fQ.JjGpZGVnZsN7P2lldSrtByx8Y9cqJjzTj3mYm8fj29M
     ```

7. Test it by running: `./test-nba-snapshot.sh`

## Alternative: Install Supabase CLI with sudo

```bash
sudo npm install -g supabase
# Then run: ./deploy-edge-function.sh
```

## After successful deployment:

Run the cron setup SQL in your Supabase SQL Editor (game storage project):
`/Users/claytonwendel/betting-dashboard/supabase/cron-setup.sql`

