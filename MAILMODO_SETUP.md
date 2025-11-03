# Mailmodo Integration Setup Guide

This guide explains how to set up automatic syncing of free users to your Mailmodo "Free Members" list.

## How It Works

1. **Clerk Webhook** - When a user signs up, Clerk sends a webhook to our API
2. **Check Subscription** - We check if the user has a paid subscription
3. **Add to Mailmodo** - If they're free, we add them to your "Free Members" list in Mailmodo
4. **Daily Sync** - A cron job runs daily to catch any missed users

## Setup Steps

### 1. Add Environment Variables

Add these to your Vercel project (or `.env.local` for local testing):

```bash
# Clerk Webhook Secret (get this from Clerk Dashboard)
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Cron Secret (generate a random string)
CRON_SECRET=your-random-secret-here
```

To generate a CRON_SECRET, run:
```bash
openssl rand -base64 32
```

### 2. Set Up Clerk Webhook

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **Webhooks** in your project
3. Click **Add Endpoint**
4. Enter your webhook URL:
   ```
   https://dashboard.thebettinginsider.com/api/webhooks/clerk
   ```
5. Subscribe to these events:
   - `user.created`
   - `user.updated`
6. Copy the **Signing Secret** and add it as `CLERK_WEBHOOK_SECRET` in Vercel

### 3. Deploy to Vercel

The `vercel.json` file is already configured with a daily cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-free-users",
      "schedule": "0 10 * * *"
    }
  ]
}
```

This runs daily at 10:00 AM UTC.

After deploying, the cron job will automatically be set up in Vercel.

### 4. Test the Webhook (Optional)

You can test locally using the Clerk CLI:

```bash
# Install Clerk CLI
npm install -g @clerk/clerk-cli

# Forward webhooks to localhost
clerk webhook forward http://localhost:3001/api/webhooks/clerk
```

### 5. Manual Sync (One-Time)

To sync all existing free users, run the cron job manually:

```bash
curl -X GET https://dashboard.thebettinginsider.com/api/cron/sync-free-users \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace `YOUR_CRON_SECRET` with the value you set in step 1.

## What Gets Synced to Mailmodo

For each free user, we send:
- Email address
- First name
- Last name
- Full name
- Clerk user ID
- Sync timestamp

## User Flow Examples

### New User Signs Up (No Purchase)
1. User signs up at `dashboard.thebettinginsider.com`
2. Clerk creates account
3. Clerk webhook fires → our API receives it
4. We check: No subscription found
5. User is added to Mailmodo "Free Members" list
6. User receives welcome email with daily picks

### New User Signs Up + Purchases Immediately
1. User signs up at `thebettinginsider.com/pricing`
2. User purchases subscription
3. Stripe webhook updates Clerk metadata with subscription
4. Clerk webhook fires → our API receives it
5. We check: Subscription found ✓
6. User is **NOT** added to free list (they're premium)

### Existing Free User Upgrades
1. Free user (already in Mailmodo) purchases subscription
2. Clerk metadata is updated
3. Clerk `user.updated` webhook fires
4. We log that they upgraded (optional: remove from free list)

## Monitoring

Check your logs in Vercel:
- `✅ User added to Mailmodo Free Members list:` - Success
- `💳 User has subscription, skipping Mailmodo` - Paid user
- `❌ Mailmodo API error:` - Failed (investigate)

## Troubleshooting

### Webhook Not Firing
1. Check Clerk Dashboard → Webhooks → View webhook
2. Look for failed requests
3. Check the signing secret matches `CLERK_WEBHOOK_SECRET`

### Users Not Being Added
1. Check Vercel logs for errors
2. Verify Mailmodo API key is correct
3. Test the `/api/mailmodo/add-free-user` endpoint directly

### Cron Job Not Running
1. Check Vercel → Project → Cron Jobs
2. Verify `vercel.json` is deployed
3. Check the `CRON_SECRET` is set correctly

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/clerk` | POST | Receives Clerk webhooks |
| `/api/mailmodo/add-free-user` | POST | Manually add a user to Mailmodo |
| `/api/cron/sync-free-users` | GET | Daily sync of all free users |

## Security

- Clerk webhooks are verified using the signing secret
- Cron endpoint requires `Authorization: Bearer` header
- Mailmodo API key is stored in environment variables
- All endpoints use HTTPS

## Need Help?

If something isn't working, check:
1. Vercel logs for errors
2. Clerk Dashboard → Webhooks for failed requests
3. Mailmodo Dashboard → Lists → Free Members for synced users

