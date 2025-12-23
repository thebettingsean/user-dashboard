# Public Betting Page - Required API Keys

The public betting page requires the following environment variables to display games:

## Required Environment Variables

Add these to your `.env.local` file in the root of your project:

### 1. ClickHouse Database (for live odds data)
```bash
CLICKHOUSE_HOST=https://your-clickhouse-host.clickhouse.cloud
CLICKHOUSE_KEY_ID=your_clickhouse_key_id
CLICKHOUSE_KEY_SECRET=your_clickhouse_key_secret
```

**Where to get these:**
- Contact your ClickHouse Cloud administrator or partner
- These are typically found in your ClickHouse Cloud dashboard under "Access Management" → "API Keys"

### 2. Insider API Key (for public betting data)
```bash
INSIDER_API_KEY=your_insider_api_key_here
```

**Note:** There's a default fallback key in the code (`cd4a0edc-8df6-4158-a0ac-ca968df17cd3`), but you should set your own key.

**Where to get this:**
- Contact Trendline Labs / Insider API support
- This is used to fetch games and public money data from `https://api.trendlinelabs.ai`

## How the Public Betting Page Works

1. **Live Odds Route** (`/api/public-betting/live-odds`):
   - Uses ClickHouse database to fetch current game odds
   - Queries the `games` and `teams` tables
   - Returns spread, totals, moneyline, and public betting percentages

2. **Sport-Specific Route** (`/api/public-betting/[sport]`):
   - Uses Insider API to fetch games and public money data
   - Fetches data for NFL, NBA, NHL, CFB
   - Returns most public bets, sharp money, and Vegas-backed bets

## Testing

After adding the environment variables:
1. Restart your dev server (`npm run dev`)
2. Navigate to `/public-betting`
3. Check the browser console and terminal for any error messages
4. The page should display games if the API keys are valid

## Troubleshooting

If games aren't showing:
- Check the browser console for API errors
- Check the terminal/server logs for ClickHouse or API errors
- Verify the API keys are correct and have proper permissions
- Ensure ClickHouse database has the `games` and `teams` tables populated

