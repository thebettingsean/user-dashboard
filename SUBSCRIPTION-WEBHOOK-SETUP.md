# Subscription Webhook Setup Guide

## ✅ What We Built

A new webhook endpoint **just for subscriptions** at:
```
https://dashboard.thebettinginsider.com/api/webhooks/stripe-subscriptions
```

This webhook:
- ✅ Updates Clerk privateMetadata with subscription info
- ✅ Updates Supabase for tracking
- ✅ Handles all subscription events (created, updated, deleted, renewals)
- ✅ Works alongside your existing credit webhook and engineers' webhook

## 🔧 Setup Steps

### Step 1: Add Webhook Secret to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name**: `STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS`
   - **Value**: (You'll get this in Step 2)
   - **Environment**: Production, Preview, Development

### Step 2: Create Webhook in Stripe

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://dashboard.thebettinginsider.com/api/webhooks/stripe-subscriptions`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`

5. Click **"Add endpoint"**
6. **Copy the "Signing secret"** (starts with `whsec_...`)
7. Go back to Vercel and paste it as `STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS`

### Step 3: Redeploy

After adding the environment variable, trigger a redeploy:
```bash
git commit --allow-empty -m "Trigger redeploy for webhook env var"
git push origin main
```

## 📊 Current Webhook Setup

You'll now have **3 webhooks** working together:

| Webhook | Handles | URL |
|---------|---------|-----|
| **Credits** | One-time credit purchases | `/api/webhooks/stripe-credits` |
| **Subscriptions** | All subscription events | `/api/webhooks/stripe-subscriptions` (NEW!) |
| **Engineers'** | Backup/legacy system | `ws.insideredgeanalytics.com` |

All three can coexist! Stripe will send events to all of them.

## 🧪 Testing

### Test Subscription Purchase:
1. Go to `/pricing`
2. Select a subscription (Weekly, Monthly, or 6-Month)
3. Complete checkout with test card: `4242 4242 4242 4242`
4. Check Vercel logs for:
   ```
   📥 Subscription webhook received: checkout.session.completed
   💳 Subscription checkout completed
   ✅ Clerk metadata updated
   ✅ Supabase updated
   🎉 Subscription activated successfully
   ```

5. Verify in your app:
   - Credit badge shows "Credits: ∞"
   - All premium features unlocked
   - Locked widgets are now accessible

### Test Cancellation:
1. Go to Stripe Dashboard → Customers
2. Find test customer, cancel subscription
3. Check logs for:
   ```
   🔄 Subscription updated: cancel_at_period_end: true
   ```
4. User still has access until period end

### Test Deletion:
1. Delete subscription in Stripe
2. Check logs for:
   ```
   🗑️ Subscription deleted
   ✅ Subscription deleted and access revoked
   ```
3. User loses access immediately

## 🎉 What This Solves

✅ **Email prefill** - Works via Checkout Session  
✅ **Custom redirects** - Full control over success/cancel URLs  
✅ **Metadata passing** - `clerk_user_id` properly attached  
✅ **Clerk integration** - Directly updates privateMetadata  
✅ **Fast & reliable** - No lag, no external dependencies  
✅ **Clean separation** - Credits and subscriptions separate  

## 🔍 Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct in Stripe
- Verify `STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS` is set in Vercel
- Check webhook signature verification isn't failing

### Metadata not updating
- Check Vercel logs for the `clerk_user_id` value
- Verify Clerk user exists
- Check Supabase connection

### User not getting access
- Verify webhook logs show "✅ Subscription activated"
- Check Clerk privateMetadata in `/api/debug/clerk-metadata`
- Confirm `useSubscription` hook reads privateMetadata.plan

## 📝 Environment Variables Needed

Make sure these are set in Vercel:

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET_CREDITS=whsec_... (for credits)
STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS=whsec_... (NEW! for subscriptions)
SUPABASE_USERS_URL=https://...
SUPABASE_USERS_SERVICE_KEY=...
```

